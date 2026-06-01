export const markdownViewState = $state<
  Record<string, { showRendered: boolean; scrollTop: number }>
>({});

export function getMarkdownView(tabId: string) {
  return markdownViewState[tabId] ?? { showRendered: true, scrollTop: 0 };
}

export function setMarkdownView(
  tabId: string,
  patch: Partial<{ showRendered: boolean; scrollTop: number }>
) {
  const current = markdownViewState[tabId] ?? { showRendered: true, scrollTop: 0 };
  markdownViewState[tabId] = { ...current, ...patch };
}
