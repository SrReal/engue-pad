<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { get } from "svelte/store";
  import TreeItem from "./TreeItem.svelte";
  import { fileDrag } from "$lib/tree/fileDragStore";

  type FileEntry = {
    name: string;
    path: string;
    is_dir: boolean;
    is_file: boolean;
  };

  type TreeNode = {
    entry: FileEntry;
    expanded: boolean;
    children: TreeNode[] | null;
    loading: boolean;
  };

  let { rootPath, refreshSignal = 0 }: { rootPath: string; refreshSignal?: number } = $props();
  let tree = $state<TreeNode[]>([]);
  let stopWatch = $state<(() => void) | null>(null);
  let isReloading = $state(false);

  let rootNode = $state<TreeNode>({
    entry: { name: "Root", path: "", is_dir: true, is_file: false },
    expanded: true,
    children: [],
    loading: false,
  });

  let rootName = $derived(rootPath.split(/[\\/]/).pop() || "Root");

  $effect(() => {
    rootNode.entry = { name: rootName, path: rootPath, is_dir: true, is_file: false };
    rootNode.children = tree;
  });

  async function loadDirectory(path: string): Promise<TreeNode[]> {
    const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
    return result.entries.map((entry) => ({
      entry,
      expanded: false,
      children: null,
      loading: false,
    }));
  }

  async function shallowReload() {
    if (!rootPath || isReloading) return;
    isReloading = true;
    try {
      const nodes = await loadDirectory(rootPath);
      const oldMap = new Map(tree.map((n) => [n.entry.path, n]));
      tree = nodes.map((node) => {
        const old = oldMap.get(node.entry.path);
        if (old && old.expanded && node.entry.is_dir) {
          return { ...node, expanded: true, children: old.children };
        }
        return node;
      });
    } finally {
      isReloading = false;
    }
  }

  async function reloadNodes(path: string, oldNodes: TreeNode[]): Promise<TreeNode[]> {
    let entries: FileEntry[] = [];
    try {
      const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
      entries = result.entries;
    } catch {
      return [];
    }
    const oldMap = new Map(oldNodes.map((n) => [n.entry.path, n]));
    const nodes: TreeNode[] = [];
    for (const entry of entries) {
      const old = oldMap.get(entry.path);
      const node: TreeNode = {
        entry,
        expanded: old?.expanded ?? false,
        children: null,
        loading: false,
      };
      if (old?.expanded && entry.is_dir) {
        try {
          node.children = await reloadNodes(entry.path, old.children ?? []);
        } catch {
          node.expanded = false;
        }
      }
      nodes.push(node);
    }
    return nodes;
  }

  async function reloadTree() {
    if (!rootPath || isReloading) return;
    isReloading = true;
    try {
      tree = await reloadNodes(rootPath, tree);
    } finally {
      isReloading = false;
    }
  }

  $effect(() => {
    if (rootPath) {
      loadDirectory(rootPath).then((nodes) => {
        tree = nodes;
      });
    }
  });

  $effect(() => {
    if (refreshSignal > 0) {
      reloadTree();
    }
  });

  $effect(() => {
    if (!rootPath) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function startWatch() {
      const { watch } = await import("@tauri-apps/plugin-fs");
      stopWatch = await watch(rootPath, () => {
        if (isReloading) return;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => shallowReload(), 300);
      }, { recursive: true, delayMs: 300 });
    }

    startWatch();

    return () => {
      if (timeout) clearTimeout(timeout);
      stopWatch?.();
      stopWatch = null;
    };
  });

  function handleTreeMouseMove(e: MouseEvent) {
    const state = get(fileDrag);
    if (!state.path || state.target) return;
    const target = e.target as HTMLElement;
    const itemRow = target.closest(".item-row");
    if (!itemRow) {
      fileDrag.set({ ...state, target: rootPath });
    }
  }

  function handleTreeMouseLeave() {
    const state = get(fileDrag);
    if (state.path && state.target === rootPath) {
      fileDrag.set({ ...state, target: null });
    }
  }
</script>

<div
  class="file-tree"
  class:root-drop-target={$fileDrag.target === rootPath && !!$fileDrag.path && !rootNode.expanded}
  onmousemove={handleTreeMouseMove}
  onmouseleave={handleTreeMouseLeave}
  role="tree"
  tabindex="-1"
>
  {#if rootPath}
    <TreeItem node={rootNode} onRefresh={reloadTree} />
  {/if}
</div>

<style>
  .file-tree {
    font-size: 13px;
    user-select: none;
  }

  .file-tree.root-drop-target {
    background: rgba(74, 158, 255, 0.1);
    outline: 1px dashed var(--accent-color, #4a9eff);
    outline-offset: -1px;
    border-radius: 4px;
  }

  .file-tree.root-drop-target::after {
    content: "▸ move here";
    display: block;
    padding: 2px 8px;
    font-size: 10px;
    color: var(--accent-color, #4a9eff);
    opacity: 0.8;
  }
</style>
