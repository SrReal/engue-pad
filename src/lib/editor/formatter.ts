import { invoke } from "@tauri-apps/api/core";
import { appSettings } from "$lib/workspace/settingsStore.svelte";

function getEditorSettings() {
  return appSettings.editor ?? {
    tabSize: 2,
    insertSpaces: true,
  };
}

export function formatContent(content: string, lineEnding: string): string {
  const settings = getEditorSettings();
  const eol = lineEnding === "CRLF" ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);

  const indentUnit = settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t";

  const formatted = lines.map((line) => {
    let trimmed = line.trimEnd();
    if (settings.insertSpaces) {
      // Convert leading tabs to spaces
      let leadingTabs = 0;
      while (leadingTabs < trimmed.length && trimmed.charAt(leadingTabs) === "\t") {
        leadingTabs++;
      }
      if (leadingTabs > 0) {
        trimmed = indentUnit.repeat(leadingTabs) + trimmed.slice(leadingTabs);
      }
    }
    return trimmed;
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
