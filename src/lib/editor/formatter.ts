import * as prettier from "prettier/standalone";
import * as pluginBabel from "prettier/plugins/babel";
import * as pluginEstree from "prettier/plugins/estree";
import * as pluginTypescript from "prettier/plugins/typescript";
import * as pluginPostcss from "prettier/plugins/postcss";
import * as pluginHtml from "prettier/plugins/html";
import * as pluginMarkdown from "prettier/plugins/markdown";
import { appSettings } from "$lib/workspace/settingsStore.svelte";

function getEditorSettings() {
  return appSettings.editor ?? {
    tabSize: 2,
    insertSpaces: true,
  };
}

type FormatterConfig = {
  parser: string;
  plugins: any[];
};

const prettierMap: Record<string, FormatterConfig | undefined> = {
  javascript: { parser: "babel", plugins: [pluginBabel, pluginEstree] },
  typescript: { parser: "typescript", plugins: [pluginTypescript, pluginEstree] },
  json: { parser: "json", plugins: [pluginBabel, pluginEstree] },
  html: { parser: "html", plugins: [pluginHtml] },
  css: { parser: "css", plugins: [pluginPostcss] },
  markdown: { parser: "markdown", plugins: [pluginMarkdown] },
};

async function prettierFormat(content: string, language: string): Promise<string | null> {
  const config = prettierMap[language];
  if (!config) return null;

  try {
    const settings = getEditorSettings();
    const result = await prettier.format(content, {
      parser: config.parser,
      plugins: config.plugins,
      tabWidth: settings.tabSize,
      useTabs: !settings.insertSpaces,
      semi: true,
      singleQuote: false,
      endOfLine: "lf",
    });
    return result;
  } catch {
    return null;
  }
}

function basicFormat(content: string, lineEnding: string): string {
  const settings = getEditorSettings();
  const eol = lineEnding === "CRLF" ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const indentUnit = settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t";

  const formatted = lines.map((line) => {
    let spaces = 0;
    let tabs = 0;
    let i = 0;
    while (i < line.length) {
      const ch = line.charAt(i);
      if (ch === " ") {
        spaces++;
        i++;
      } else if (ch === "\t") {
        tabs++;
        i++;
      } else {
        break;
      }
    }
    const spaceLevels = Math.round(spaces / settings.tabSize);
    const level = tabs + spaceLevels;
    const rest = line.slice(i).trimEnd();
    if (level === 0) return rest;
    return indentUnit.repeat(level) + rest;
  });

  while (formatted.length > 0 && formatted[formatted.length - 1] === "") {
    formatted.pop();
  }

  let result = formatted.join(eol);
  if (result.length > 0) {
    result += eol;
  }
  return result;
}

export async function formatContent(content: string, lineEnding: string, language?: string): Promise<string> {
  if (language) {
    const prettierResult = await prettierFormat(content, language);
    if (prettierResult !== null) {
      return prettierResult;
    }
  }
  return basicFormat(content, lineEnding);
}

export async function formatFile(path: string, language?: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  const meta = await invoke<{ content: string; lineEnding: string }>("read_file_meta", { path });
  const formatted = await formatContent(meta.content, meta.lineEnding, language);
  if (formatted === meta.content) return;
  await invoke("write_file", { path, contents: formatted });
}
