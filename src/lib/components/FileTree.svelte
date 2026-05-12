<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import TreeItem from "./TreeItem.svelte";

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

  let { rootPath }: { rootPath: string } = $props();
  let tree = $state<TreeNode[]>([]);
  let stopWatch = $state<(() => void) | null>(null);

  async function loadDirectory(path: string): Promise<TreeNode[]> {
    const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
    return result.entries.map((entry) => ({
      entry,
      expanded: false,
      children: null,
      loading: false,
    }));
  }

  async function reloadTree() {
    if (!rootPath) return;
    const nodes = await loadDirectory(rootPath);
    tree = mergeExpandedState(nodes, tree);
  }

  function mergeExpandedState(newNodes: TreeNode[], oldNodes: TreeNode[]): TreeNode[] {
    const oldMap = new Map(oldNodes.map((n) => [n.entry.path, n]));
    return newNodes.map((node) => {
      const old = oldMap.get(node.entry.path);
      if (old && old.expanded && node.entry.is_dir) {
        return { ...node, expanded: true, children: old.children };
      }
      return node;
    });
  }

  $effect(() => {
    if (rootPath) {
      loadDirectory(rootPath).then((nodes) => {
        tree = nodes;
      });
    }
  });

  $effect(() => {
    if (!rootPath) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function startWatch() {
      const { watch } = await import("@tauri-apps/plugin-fs");
      stopWatch = await watch(rootPath, () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => reloadTree(), 300);
      }, { recursive: true, delayMs: 300 });
    }

    startWatch();

    return () => {
      if (timeout) clearTimeout(timeout);
      stopWatch?.();
      stopWatch = null;
    };
  });
</script>

<div class="file-tree">
  {#each tree as node (node.entry.path)}
    <TreeItem {node} />
  {/each}
</div>

<style>
  .file-tree {
    font-size: 13px;
    user-select: none;
  }
</style>
