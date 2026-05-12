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

  async function loadDirectory(path: string): Promise<TreeNode[]> {
    const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
    return result.entries.map((entry) => ({
      entry,
      expanded: false,
      children: null,
      loading: false,
    }));
  }

  $effect(() => {
    if (rootPath) {
      loadDirectory(rootPath).then((nodes) => {
        tree = nodes;
      });
    }
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
