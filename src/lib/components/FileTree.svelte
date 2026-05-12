<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { addTab, layoutState } from "$lib/layout/store.svelte";

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
  let contextMenu = $state<{ x: number; y: number; entry: FileEntry } | null>(null);

  async function loadDirectory(path: string): Promise<TreeNode[]> {
    const result = await invoke<{ entries: FileEntry[]; path: string }>("list_directory", { path });
    return result.entries.map((entry) => ({
      entry,
      expanded: false,
      children: null,
      loading: false,
    }));
  }

  async function expandNode(node: TreeNode) {
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

  function handleFileClick(entry: FileEntry) {
    if (entry.is_file) {
      const activeNodeId = layoutState.activeNodeId ?? layoutState.root.id;
      addTab(activeNodeId, {
        id: crypto.randomUUID(),
        title: entry.name,
        path: entry.path,
      });
    }
  }

  function handleContextMenu(e: MouseEvent, entry: FileEntry) {
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, entry };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  async function copyPath() {
    if (contextMenu?.entry) {
      await navigator.clipboard.writeText(contextMenu.entry.path);
    }
    closeContextMenu();
  }

  function openFile() {
    if (contextMenu?.entry) {
      handleFileClick(contextMenu.entry);
    }
    closeContextMenu();
  }

  $effect(() => {
    if (rootPath) {
      loadDirectory(rootPath).then((nodes) => {
        tree = nodes;
      });
    }
  });
</script>

<svelte:window onclick={closeContextMenu} />

<div class="file-tree">
  {#each tree as node (node.entry.path)}
    <div class="tree-item">
      <div
        class="item-row"
        class:directory={node.entry.is_dir}
        class:file={node.entry.is_file}
        onclick={() => {
          if (node.entry.is_dir) expandNode(node);
          else handleFileClick(node.entry);
        }}
        oncontextmenu={(e) => handleContextMenu(e, node.entry)}
        role="treeitem"
        tabindex="0"
        aria-expanded={node.entry.is_dir ? node.expanded : undefined}
        aria-selected="false"
        onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (node.entry.is_dir) expandNode(node); else handleFileClick(node.entry); } }}
      >
        <span class="icon">
          {#if node.entry.is_dir}
            {node.expanded ? "▼" : "▶"}
          {:else}
            "📄"
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
            <div class="tree-item">
              <div
                class="item-row"
                class:directory={child.entry.is_dir}
                class:file={child.entry.is_file}
                onclick={() => {
                  if (child.entry.is_dir) expandNode(child);
                  else handleFileClick(child.entry);
                }}
                oncontextmenu={(e) => handleContextMenu(e, child.entry)}
                role="treeitem"
                tabindex="0"
                aria-selected="false"
                onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (child.entry.is_dir) expandNode(child); else handleFileClick(child.entry); } }}
              >
                <span class="icon">
                  {#if child.entry.is_dir}
                    {child.expanded ? "▼" : "▶"}
                  {:else}
                    "📄"
                  {/if}
                </span>
                <span class="name">{child.entry.name}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

{#if contextMenu}
  <div class="context-menu" style:left="{contextMenu.x}px" style:top="{contextMenu.y}px">
    <button onclick={openFile}>Abrir</button>
    <button onclick={copyPath}>Copiar ruta</button>
  </div>
{/if}

<style>
  .file-tree {
    font-size: 13px;
    user-select: none;
  }

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
