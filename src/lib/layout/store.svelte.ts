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

export function removeNode(nodeId: string): void {
  function pruneTree(node: LayoutNode): LayoutNode | null {
    if (node.id === nodeId) return null;
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

export function addTab(nodeId: string, tab: Tab): void {
  function updateTree(node: LayoutNode): LayoutNode {
    if (node.kind === "tab-group" && node.id === nodeId) {
      const exists = node.tabs.find((t) => t.id === tab.id);
      if (exists) {
        return { ...node, activeTabId: tab.id };
      }
      return {
        ...node,
        tabs: [...node.tabs, tab],
        activeTabId: tab.id,
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
