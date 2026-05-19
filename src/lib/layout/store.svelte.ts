import { invoke } from "@tauri-apps/api/core";
import type { LayoutNode, TabGroup, Split, Tab } from "./types";
import { createDefaultLayout, createTabGroup, createSplit } from "./types";

const MAX_TABS_PER_GROUP = 20;

export type LayoutState = {
  root: LayoutNode;
  activeNodeId: string | null;
};

function createLayoutState(): LayoutState {
  return { root: createDefaultLayout(), activeNodeId: null };
}

export const layoutState = $state<LayoutState>(createLayoutState());

export function resetLayout(): void {
  killTerminalsInNode(layoutState.root);
  layoutState.root = createDefaultLayout();
  layoutState.activeNodeId = null;
}

export function setActiveNode(nodeId: string): void {
  layoutState.activeNodeId = nodeId;
}

export function splitNode(nodeId: string, direction: "horizontal" | "vertical"): void {
  function replaceInTree(node: LayoutNode): LayoutNode {
    if (node.id === nodeId) {
      return createSplit(direction, createTabGroup(), node, 0.5);
    }
    if (node.kind === "split") {
      return {
        ...node,
        first: replaceInTree(node.first),
        second: replaceInTree(node.second),
      };
    }
    return node;
  }
  layoutState.root = replaceInTree(layoutState.root);
}

function killTerminalsInNode(node: LayoutNode): void {
  if (node.kind === "tab-group") {
    for (const tab of node.tabs) {
      if (tab.type === "terminal") {
        invoke("kill_terminal", { terminalId: tab.id }).catch(() => {});
      }
    }
  } else if (node.kind === "split") {
    killTerminalsInNode(node.first);
    killTerminalsInNode(node.second);
  }
}

export function removeNode(nodeId: string): void {
  function pruneTree(node: LayoutNode): LayoutNode | null {
    if (node.id === nodeId) {
      killTerminalsInNode(node);
      return null;
    }
    if (node.kind === "split") {
      const first = pruneTree(node.first);
      const second = pruneTree(node.second);
      if (first && second) return { ...node, first, second };
      if (first) return first;
      if (second) return second;
      return null;
    }
    return node;
  }
  const pruned = pruneTree(layoutState.root);
  if (pruned) layoutState.root = pruned;
}

export function setSplitRatio(nodeId: string, ratio: number): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "split" && node.id === nodeId) {
      return { ...node, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

function findTabByPath(root: LayoutNode, path: string): { nodeId: string; tabId: string } | null {
  if (root.kind === "tab-group") {
    const tab = root.tabs.find((t) => t.path === path);
    if (tab) return { nodeId: root.id, tabId: tab.id };
    return null;
  }
  return findTabByPath(root.first, path) ?? findTabByPath(root.second, path);
}

export function addTerminal(nodeId: string, title = "Terminal", cwd?: string, shell?: string): void {
  const tab: Tab = {
    id: crypto.randomUUID(),
    title,
    type: "terminal",
    cwd,
    shell,
  };
  addTab(nodeId, tab);
}

function findPreviewTab(root: LayoutNode, url: string): { nodeId: string; tabId: string } | null {
  if (root.kind === "tab-group") {
    const tab = root.tabs.find((t) => t.type === "preview" && t.url === url);
    if (tab) return { nodeId: root.id, tabId: tab.id };
    return null;
  }
  return findPreviewTab(root.first, url) ?? findPreviewTab(root.second, url);
}

export function addPreview(nodeId: string, url: string): void {
  const existing = findPreviewTab(layoutState.root, url);
  if (existing) {
    setActiveTab(existing.nodeId, existing.tabId);
    setActiveNode(existing.nodeId);
    return;
  }
  const tab: Tab = {
    id: crypto.randomUUID(),
    title: url,
    type: "preview",
    url,
  };
  addTab(nodeId, tab);
}

export function addTab(nodeId: string, tab: Tab): void {
  if (tab.path) {
    const existing = findTabByPath(layoutState.root, tab.path);
    if (existing) {
      setActiveTab(existing.nodeId, existing.tabId);
      setActiveNode(existing.nodeId);
      return;
    }
  }

  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const exists = node.tabs.find((t) => t.id === tab.id);
      if (exists) {
        return { ...node, activeTabId: tab.id };
      }

      const previewIndex = node.tabs.findIndex((t) => t.preview);
      const enrichedTab = tab.path
        ? { ...tab, language: detectLanguage(tab.path), dirty: false, preview: true }
        : tab;

      let newTabs: Tab[];
      if (previewIndex >= 0) {
        newTabs = node.tabs.map((t, i) => (i === previewIndex ? enrichedTab : t));
      } else {
        newTabs = [...node.tabs, enrichedTab];
      }

      // Enforce tab limit: drop oldest non-dirty, non-active tabs
      while (newTabs.length > MAX_TABS_PER_GROUP) {
        const dropIndex = newTabs.findIndex(
          (t) => !t.dirty && t.id !== node.activeTabId && t.id !== enrichedTab.id
        );
        if (dropIndex === -1) break;
        const dropped = newTabs[dropIndex];
        if (dropped.type === "terminal") {
          invoke("kill_terminal", { terminalId: dropped.id }).catch(() => {});
        }
        newTabs = newTabs.filter((_, i) => i !== dropIndex);
      }

      return {
        ...node,
        tabs: newTabs,
        activeTabId: enrichedTab.id,
      };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function closeTab(nodeId: string, tabId: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const closed = node.tabs.find((t) => t.id === tabId);
      if (closed?.type === "terminal") {
        invoke("kill_terminal", { terminalId: tabId }).catch(() => {});
      }
      const tabs = node.tabs.filter((t) => t.id !== tabId);
      let activeTabId = node.activeTabId;
      if (activeTabId === tabId) {
        activeTabId = tabs[tabs.length - 1]?.id ?? null;
      }
      return { ...node, tabs, activeTabId };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function moveTab(nodeId: string, fromIndex: number, toIndex: number): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      if (fromIndex === toIndex) return node;
      const tabs = [...node.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      const adjusted = toIndex > fromIndex ? toIndex - 1 : toIndex;
      tabs.splice(adjusted, 0, moved);
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function moveTabToPanel(fromNodeId: string, tabId: string, toNodeId: string): void {
  let movedTab: Tab | null = null;
  function extractTab(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === fromNodeId) {
      const idx = node.tabs.findIndex((t) => t.id === tabId);
      if (idx === -1) return node;
      const tabs = [...node.tabs];
      [movedTab] = tabs.splice(idx, 1);
      const activeTabId = node.activeTabId === tabId ? (tabs[tabs.length - 1]?.id ?? null) : node.activeTabId;
      return { ...node, tabs, activeTabId };
    }
    if (node.kind === "split") {
      return { ...node, first: extractTab(node.first), second: extractTab(node.second) };
    }
    return node;
  }
  function insertTab(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === toNodeId && movedTab) {
      return { ...node, tabs: [...node.tabs, movedTab], activeTabId: movedTab.id };
    }
    if (node.kind === "split") {
      return { ...node, first: insertTab(node.first), second: insertTab(node.second) };
    }
    return node;
  }
  layoutState.root = extractTab(layoutState.root);
  if (movedTab) {
    layoutState.root = insertTab(layoutState.root);
  }
}

export function setActiveTab(nodeId: string, tabId: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      return { ...node, activeTabId: tabId };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function updateTabContent(nodeId: string, tabId: string, content: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const tabs = node.tabs.map((t) =>
        t.id === tabId ? { ...t, content, dirty: true, preview: false } : t
      );
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function pinTab(nodeId: string, tabId: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const tabs = node.tabs.map((t) =>
        t.id === tabId ? { ...t, preview: false } : t
      );
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function markTabSaved(nodeId: string, tabId: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const tabs = node.tabs.map((t) =>
        t.id === tabId ? { ...t, dirty: false } : t
      );
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function renameTab(nodeId: string, tabId: string, newTitle: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const tabs = node.tabs.map((t) =>
        t.id === tabId ? { ...t, title: newTitle } : t
      );
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function setTabLineEnding(nodeId: string, tabId: string, lineEnding: string): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const tabs = node.tabs.map((t) =>
        t.id === tabId ? { ...t, lineEnding } : t
      );
      return { ...node, tabs };
    }
    if (node.kind === "split") {
      return { ...node, first: updateTree(node.first), second: updateTree(node.second) };
    }
    return node;
  }
  layoutState.root = updateTree(layoutState.root);
}

export function findAllDirtyTabs(root: LayoutNode): Tab[] {
  if (root.kind === "tab-group") {
    return root.tabs.filter((t) => t.dirty);
  }
  return [...findAllDirtyTabs(root.first), ...findAllDirtyTabs(root.second)];
}

export async function syncTerminalCwds(root: LayoutNode): Promise<LayoutNode> {
  if (root.kind === "tab-group") {
    const tabs = await Promise.all(
      root.tabs.map(async (t) => {
        if (t.type === "terminal") {
          try {
            const cwd = await invoke<string>("get_terminal_cwd", { terminalId: t.id });
            return { ...t, cwd };
          } catch {
            return t;
          }
        }
        return t;
      })
    );
    return { ...root, tabs };
  }
  const [first, second] = await Promise.all([
    syncTerminalCwds(root.first),
    syncTerminalCwds(root.second),
  ]);
  return { ...root, first, second };
}

export function findActiveTabGroup(root: LayoutNode): TabGroup | null {
  if (root.kind === "tab-group") return root;
  const first = findActiveTabGroup(root.first);
  if (first) return first;
  return findActiveTabGroup(root.second);
}

export function activateNextTab(): void {
  const group = findActiveTabGroup(layoutState.root);
  if (!group || group.tabs.length < 2) return;
  const idx = group.tabs.findIndex((t) => t.id === group.activeTabId);
  const next = group.tabs[(idx + 1) % group.tabs.length];
  setActiveTab(group.id, next.id);
}

export function activatePrevTab(): void {
  const group = findActiveTabGroup(layoutState.root);
  if (!group || group.tabs.length < 2) return;
  const idx = group.tabs.findIndex((t) => t.id === group.activeTabId);
  const prev = group.tabs[(idx - 1 + group.tabs.length) % group.tabs.length];
  setActiveTab(group.id, prev.id);
}

export function closeActiveTab(): void {
  const group = findActiveTabGroup(layoutState.root);
  if (!group || !group.activeTabId) return;
  closeTab(group.id, group.activeTabId);
}

export function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "javascript",
    tsx: "typescript",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "css",
    sass: "css",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    dockerfile: "dockerfile",
    png: "image",
    jpg: "image",
    jpeg: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    bmp: "image",
    ico: "image",
    tiff: "image",
    tif: "image",
    mp3: "audio",
    wav: "audio",
    ogg: "audio",
    flac: "audio",
    m4a: "audio",
    aac: "audio",
    wma: "audio",
    opus: "audio",
  };
  return map[ext] ?? "plaintext";
}
