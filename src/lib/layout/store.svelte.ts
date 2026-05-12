import { invoke } from "@tauri-apps/api/core";
import type { LayoutNode, TabGroup, Split, Tab } from "./types";
import { createDefaultLayout, createTabGroup, createSplit } from "./types";

export type LayoutState = {
  root: LayoutNode;
  activeNodeId: string | null;
};

function createLayoutState(): LayoutState {
  return { root: createDefaultLayout(), activeNodeId: null };
}

export const layoutState = $state<LayoutState>(createLayoutState());

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

export function addTerminal(nodeId: string, title = "Terminal"): void {
  const tab: Tab = {
    id: crypto.randomUUID(),
    title,
    type: "terminal",
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
  };
  return map[ext] ?? "plaintext";
}
