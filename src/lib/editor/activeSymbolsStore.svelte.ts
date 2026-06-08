export const activeEditorSymbols = $state<{
  content: string;
  path?: string;
  language?: string;
}>({ content: "" });

export function setActiveEditorSymbols(
  content: string,
  path?: string,
  language?: string
) {
  activeEditorSymbols.content = content;
  activeEditorSymbols.path = path;
  activeEditorSymbols.language = language;
}
