export type TabType = "editor" | "terminal" | "preview" | "todo";

export type Tab = {
  id: string;
  title: string;
  type?: TabType;
  path?: string;
  content?: string;
  dirty?: boolean;
  language?: string;
  preview?: boolean;
  lineEnding?: string;
  cwd?: string;
  shell?: string;
  url?: string;
};

export type TabGroup = {
  kind: "tab-group";
  id: string;
  tabs: Tab[];
  activeTabId: string | null;
};

export type Split = {
  kind: "split";
  id: string;
  direction: "horizontal" | "vertical";
  ratio: number;
  first: LayoutNode;
  second: LayoutNode;
};

export type LayoutNode = Split | TabGroup;

export function createTabGroup(tabs: Tab[] = [], activeTabId: string | null = null): TabGroup {
  return {
    kind: "tab-group",
    id: crypto.randomUUID(),
    tabs,
    activeTabId: activeTabId ?? (tabs[0]?.id ?? null),
  };
}

export function createSplit(
  direction: "horizontal" | "vertical",
  first: LayoutNode,
  second: LayoutNode,
  ratio = 0.5
): Split {
  return {
    kind: "split",
    id: crypto.randomUUID(),
    direction,
    ratio,
    first,
    second,
  };
}

export function createDefaultLayout(): LayoutNode {
  return createTabGroup();
}
