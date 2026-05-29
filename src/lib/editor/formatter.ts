import { invoke } from "@tauri-apps/api/core";
import { appSettings } from "$lib/workspace/settingsStore.svelte";

function getEditorSettings() {
  return appSettings.editor ?? {
    tabSize: 2,
    insertSpaces: true,
  };
}

function countIndentLevel(line: string, tabSize: number): { level: number; rest: string } {
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
  // Cada tab = 1 nivel. Los espacios se dividen por tabSize y se redondean.
  const spaceLevels = Math.round(spaces / tabSize);
  return { level: tabs + spaceLevels, rest: line.slice(i) };
}

export function formatContent(content: string, lineEnding: string): string {
  const settings = getEditorSettings();
  const eol = lineEnding === "CRLF" ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);

  const indentUnit = settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t";

  const formatted = lines.map((line) => {
    const { level, rest } = countIndentLevel(line, settings.tabSize);
    const trimmed = rest.trimEnd();
    if (level === 0) return trimmed;
    return indentUnit.repeat(level) + trimmed;
  });

  // Remove trailing empty lines but ensure single trailing newline
  while (formatted.length > 0 && formatted[formatted.length - 1] === "") {
    formatted.pop();
  }

  let result = formatted.join(eol);
  if (result.length > 0) {
    result += eol;
  }

  return result;
}

export async function formatFile(path: string): Promise<void> {
  const meta = await invoke<{ content: string; lineEnding: string }>("read_file_meta", { path });
  const formatted = formatContent(meta.content, meta.lineEnding);
  if (formatted === meta.content) return;
  await invoke("write_file", { path, contents: formatted });
}
