<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { get } from "svelte/store";
  import TreeItem from "./TreeItem.svelte";
  import { fileDrag } from "$lib/tree/fileDragStore";
  import { refreshGitStatus } from "$lib/git/store.svelte";
  import { loadSettings } from "$lib/workspace/settings";

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
  let showGitIndicators = $state(true);

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
    let result: { entries: FileEntry[]; path: string; truncated: boolean } | null = null;
    try {
      result = await invoke<{ entries: FileEntry[]; path: string; truncated: boolean }>("list_directory", { path });
    } catch {
      return [];
    }
    if (!result) return [];
    const oldMap = new Map(oldNodes.map((n) => [n.entry.path, n]));
    const nodes: TreeNode[] = result.entries.map((entry) => {
      const old = oldMap.get(entry.path);
      return {
        entry,
        expanded: old?.expanded ?? false,
        children: old?.expanded ? old.children : null,
        loading: false,
      };
    });

    // Parallelize recursive reload for expanded directories
    const expanded = nodes.filter((n) => n.expanded && n.entry.is_dir);
    await Promise.all(
      expanded.map(async (n) => {
        const old = oldMap.get(n.entry.path);
        try {
          n.children = await reloadNodes(n.entry.path, old?.children ?? []);
        } catch {
          n.expanded = false;
          n.children = null;
        }
      })
    );

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
    if (!rootPath) return;
    loadDirectory(rootPath).then((nodes) => {
      tree = nodes;
    });
    refreshGitStatus(rootPath);

    let intervalMs = 5000;
    loadSettings().then((s) => {
      intervalMs = (s.git?.refreshInterval ?? 5) * 1000;
      showGitIndicators = s.git?.showIndicators ?? true;
    });

    const interval = setInterval(() => {
      refreshGitStatus(rootPath);
    }, intervalMs);
    return () => clearInterval(interval);
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
        timeout = setTimeout(() => shallowReload(), 500);
      }, { recursive: true, delayMs: 500 });
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
    <TreeItem node={rootNode} onRefresh={reloadTree} {rootPath} {showGitIndicators} />
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
