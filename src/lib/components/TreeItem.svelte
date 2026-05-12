<script lang="ts">
  import { addTab, layoutState } from "$lib/layout/store.svelte";
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

  let { node }: { node: TreeNode } = $props();

  async function loadDirectory(path: string): Promise<TreeNode[]> {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
    return result.entries.map((entry) => ({
      entry,
      expanded: false,
      children: null,
      loading: false,
    }));
  }

  async function expandNode() {
    if (!node.entry.is_dir) return;
    if (node.expanded) {
      node.expanded = false;
      return;
    }
    if (node.children === null) {
      node.loading = true;
      try {
        node.children = await loadDirectory(node.entry.path);
      } finally {
        node.loading = false;
      }
    }
    node.expanded = true;
  }

  function handleFileClick() {
    if (node.entry.is_file) {
      const activeNodeId = layoutState.activeNodeId ?? layoutState.root.id;
      addTab(activeNodeId, {
        id: crypto.randomUUID(),
        title: node.entry.name,
        path: node.entry.path,
      });
    }
  }

  function handleClick() {
    if (node.entry.is_dir) expandNode();
    else handleFileClick();
  }

  let contextMenu = $state<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = { x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  async function copyPath() {
    await navigator.clipboard.writeText(node.entry.path);
    closeContextMenu();
  }
</script>

<svelte:window onclick={closeContextMenu} />

<div class="tree-item">
  <div
    class="item-row"
    class:directory={node.entry.is_dir}
    class:file={node.entry.is_file}
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    role="treeitem"
    tabindex="0"
    aria-expanded={node.entry.is_dir ? node.expanded : undefined}
    aria-selected="false"
    onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
  >
    <span class="icon">
      {#if node.entry.is_dir}
        {node.expanded ? "▼" : "▶"}
      {:else}
        📄
      {/if}
    </span>
    <span class="name">{node.entry.name}</span>
    {#if node.loading}
      <span class="loading">...</span>
    {/if}
  </div>
  {#if node.expanded && node.children}
    <div class="children">
      {#each node.children as child (child.entry.path)}
        <TreeItem node={child} />
      {/each}
    </div>
  {/if}
  {#if contextMenu}
    <div class="context-menu" style:left="{contextMenu.x}px" style:top="{contextMenu.y}px">
      {#if node.entry.is_file}
        <button onclick={handleFileClick}>Abrir</button>
      {:else}
        <button onclick={expandNode}>{node.expanded ? "Contraer" : "Expandir"}</button>
      {/if}
      <button onclick={copyPath}>Copiar ruta</button>
    </div>
  {/if}
</div>

<style>
  .tree-item {
    color: var(--text-color, #ccc);
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    cursor: pointer;
    border-radius: 3px;
  }

  .item-row:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .item-row.directory {
    font-weight: 500;
  }

  .item-row.file {
    padding-left: 24px;
  }

  .icon {
    font-size: 10px;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .children {
    padding-left: 12px;
  }

  .loading {
    color: var(--text-muted, #888);
    font-size: 11px;
  }

  .context-menu {
    position: fixed;
    background: var(--bg-sidebar, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    padding: 4px 0;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .context-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 16px;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 13px;
  }

  .context-menu button:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }
</style>
