import type { LayoutNode, Split, TabGroup, Tab } from "$lib/layout/types";
import { detectLanguage } from "$lib/layout/store.svelte";

export type PersistedTab = {
  id: string;
  title: string;
  type?: string;
  path?: string;
  preview?: boolean;
  cwd?: string;
  shell?: string;
};

export type PersistedTabGroup = {
  kind: "tab-group";
  id: string;
  tabs: PersistedTab[];
  activeTabId: string | null;
};

export type PersistedSplit = {
  kind: "split";
  id: string;
  direction: "horizontal" | "vertical";
  ratio: number;
  first: PersistedNode;
  second: PersistedNode;
};

export type PersistedNode = PersistedSplit | PersistedTabGroup;

export type LinterConfig = {
  enabled: boolean;
  runOnSave: boolean;
  runOnType: boolean;
  languages?: Record<string, string>;
};

export type WorkspaceData = {
  workspaceId: string;
  version: number;
  layout: {
    root: PersistedNode;
    activeNodeId: string | null;
  };
  linter?: LinterConfig;
};

function toRelative(path: string, rootPath: string): string {
  if (!path) return path;
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedRoot = rootPath.replace(/\\/g, "/");
  if (normalizedPath.startsWith(normalizedRoot)) {
    const rel = normalizedPath.slice(normalizedRoot.length);
    return rel.startsWith("/") ? rel.slice(1) : rel;
  }
  return path;
}

function toAbsolute(relPath: string, rootPath: string): string {
  if (!relPath) return relPath;
  if (relPath.startsWith("/") || /^[a-zA-Z]:/.test(relPath)) {
    return relPath;
  }
  const normalizedRoot = rootPath.replace(/\\/g, "/");
  const sep = normalizedRoot.endsWith("/") ? "" : "/";
  return `${normalizedRoot}${sep}${relPath}`;
}

export function serializeNode(node: LayoutNode, rootPath: string): PersistedNode {
  if (node.kind === "tab-group") {
    return {
      kind: "tab-group",
      id: node.id,
      activeTabId: node.activeTabId,
      tabs: node.tabs
        .filter((t) => t.type !== "preview")
        .map((t) => ({
          id: t.id,
          title: t.title,
          type: t.type,
          path: t.path ? toRelative(t.path, rootPath) : undefined,
          preview: t.preview,
          cwd: t.cwd,
          shell: t.shell,
        })),
    };
  }
  return {
    kind: "split",
    id: node.id,
    direction: node.direction,
    ratio: node.ratio,
    first: serializeNode(node.first, rootPath),
    second: serializeNode(node.second, rootPath),
  };
}

export function deserializeNode(node: PersistedNode, rootPath: string): LayoutNode {
  if (node.kind === "tab-group") {
    return {
      kind: "tab-group",
      id: node.id,
      activeTabId: node.activeTabId,
      tabs: node.tabs.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type as "editor" | "terminal" | "todo" | undefined,
        path: t.path ? toAbsolute(t.path, rootPath) : undefined,
        language: t.type !== "terminal" && t.path ? detectLanguage(t.path) : undefined,
        dirty: false,
        preview: t.preview,
        cwd: t.cwd,
        shell: t.shell,
      })),
    };
  }
  return {
    kind: "split",
    id: node.id,
    direction: node.direction,
    ratio: node.ratio,
    first: deserializeNode(node.first, rootPath),
    second: deserializeNode(node.second, rootPath),
  };
}
