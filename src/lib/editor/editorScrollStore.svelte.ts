export const editorScrollState = $state<Record<string, number>>({});

export function getEditorScroll(tabId: string): number {
  return editorScrollState[tabId] ?? 0;
}

export function setEditorScroll(tabId: string, scrollTop: number) {
  editorScrollState[tabId] = scrollTop;
}
