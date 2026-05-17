<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { get } from "svelte/store";
  import { addTab, layoutState, pinTab } from "$lib/layout/store.svelte";
  import { gitStore } from "$lib/git/store.svelte";
  import type { Tab } from "$lib/layout/types";
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

  let { node, onRefresh, rootPath, showGitIndicators = true }: { node: TreeNode; onRefresh: () => void; rootPath: string; showGitIndicators?: boolean } = $props();

  function getRelativePath(fullPath: string): string {
    const sep = fullPath.includes("/") ? "/" : "\\";
    const root = rootPath.endsWith(sep) ? rootPath : rootPath + sep;
    return fullPath.startsWith(root) ? fullPath.slice(root.length) : fullPath;
  }

  const gitStatus = $derived.by(() => {
    if (!showGitIndicators || !gitStore.isRepo || node.entry.is_dir) return null;
    const rel = getRelativePath(node.entry.path);
    const status = gitStore.files[rel];
    if (!status) return null;
    if (status.includes("M")) return "modified";
    if (status.includes("A")) return "added";
    if (status.includes("D")) return "deleted";
    if (status.includes("?")) return "untracked";
    if (status.includes("R")) return "renamed";
    return null;
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

  async function expandNode() {
    if (!node.entry.is_dir) return;
    if (node.expanded) {
      node.expanded = false;
      node.children = null;
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
        id: node.entry.path,
        title: node.entry.name,
        path: node.entry.path,
      });
    }
  }

  function findTabGroup(root: any, nodeId: string): any {
    if (root.kind === "tab-group" && root.id === nodeId) return root;
    if (root.kind === "split") {
      return findTabGroup(root.first, nodeId) ?? findTabGroup(root.second, nodeId);
    }
    return null;
  }

  let clickTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  let dragStart = $state<{ x: number; y: number } | null>(null);
  let didDrag = $state(false);

  function handleClick() {
    if (isRenaming) return;
    if (didDrag) { didDrag = false; return; }
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      handleDoubleClick();
      return;
    }
    clickTimeout = setTimeout(() => {
      clickTimeout = null;
      if (node.entry.is_dir) expandNode();
      else handleFileClick();
    }, 200);
  }

  function handleDoubleClick() {
    startRename();
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    if (isRenaming) return;
    dragStart = { x: e.clientX, y: e.clientY };
    didDrag = false;
  }

  function handleMouseEnter() {
    const state = get(fileDrag);
    if (state.path && state.path !== node.entry.path && node.entry.is_dir) {
      fileDrag.set({ ...state, target: node.entry.path });
    }
  }

  function handleMouseLeave() {
    const state = get(fileDrag);
    if (state.target === node.entry.path) {
      fileDrag.set({ ...state, target: null });
    }
  }

  function handleWindowMouseMove(e: MouseEvent) {
    const state = get(fileDrag);
    if (dragStart && !state.path) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        didDrag = true;
        fileDrag.set({ path: node.entry.path, target: null, x: e.clientX, y: e.clientY });
        return;
      }
    }
    if (!state.path) return;
    fileDrag.set({ ...state, x: e.clientX, y: e.clientY });
  }

  async function handleWindowMouseUp() {
    const state = get(fileDrag);
    if (!state.path || !state.target || state.path === state.target) {
      fileDrag.set({ path: null, target: null, x: 0, y: 0 });
      dragStart = null;
      return;
    }
    const src = state.path;
    const destDir = state.target;
    fileDrag.set({ path: null, target: null, x: 0, y: 0 });
    dragStart = null;
    if (destDir.startsWith(src + "/") || destDir.startsWith(src + "\\")) {
      return;
    }
    const srcName = src.split(/[\\/]/).pop() ?? "";
    const sep = destDir.includes("/") ? "/" : "\\";
    const dest = destDir.endsWith(sep) ? destDir + srcName : destDir + sep + srcName;
    if (src === dest) {
      return;
    }
    try {
      await invoke("rename_file", { from: src, to: dest });
      onRefresh();
    } catch (err) {
      alert(`Failed to move: ${err}`);
    }
  }

  let contextMenu = $state<{ x: number; y: number } | null>(null);
  let isRenaming = $state(false);
  let renameValue = $state("");
  let renameInputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (isRenaming && renameInputRef) {
      renameInputRef.focus();
      renameInputRef.select();
    }
  });

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

  function startRename() {
    closeContextMenu();
    isRenaming = true;
    renameValue = node.entry.name;
  }

  async function submitRename() {
    if (!isRenaming) return;
    const newName = renameValue.trim();
    if (!newName || newName === node.entry.name) {
      isRenaming = false;
      return;
    }
    const lastSep = Math.max(node.entry.path.lastIndexOf("/"), node.entry.path.lastIndexOf("\\"));
    const sep = lastSep >= 0 ? node.entry.path.charAt(lastSep) : "/";
    const parentPath = lastSep >= 0 ? node.entry.path.slice(0, lastSep) : "";
    const newPath = parentPath ? parentPath + sep + newName : newName;
    try {
      await invoke("rename_file", { from: node.entry.path, to: newPath });
      isRenaming = false;
      onRefresh();
    } catch (e) {
      alert(`Failed to rename: ${e}`);
    }
  }

  function cancelRename() {
    isRenaming = false;
    renameValue = "";
  }
</script>

<svelte:window onclick={closeContextMenu} onmousemove={handleWindowMouseMove} onmouseup={handleWindowMouseUp} />

<div class="tree-item">
  <div
    class="item-row"
    class:directory={node.entry.is_dir}
    class:file={node.entry.is_file}
    class:drop-target={$fileDrag.target === node.entry.path && node.entry.is_dir}
    class:is-dragging={$fileDrag.path === node.entry.path}
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    onmousedown={handleMouseDown}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
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
    {#if isRenaming}
      <input
        class="rename-input"
        type="text"
        bind:value={renameValue}
        bind:this={renameInputRef}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === "Enter") { e.preventDefault(); submitRename(); }
          if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
        }}
        onblur={submitRename}
      />
    {:else}
      <span class="name" class:git-modified={gitStatus === "modified"} class:git-added={gitStatus === "added"} class:git-deleted={gitStatus === "deleted"} class:git-untracked={gitStatus === "untracked"} class:git-renamed={gitStatus === "renamed"}>{node.entry.name}</span>
    {/if}
    {#if gitStatus}
      <span class="git-dot" class:git-modified={gitStatus === "modified"} class:git-added={gitStatus === "added"} class:git-deleted={gitStatus === "deleted"} class:git-untracked={gitStatus === "untracked"} class:git-renamed={gitStatus === "renamed"}></span>
    {/if}
    {#if node.loading}
      <span class="loading">...</span>
    {/if}
  </div>
  {#if $fileDrag.path === node.entry.path}
    <div class="drag-ghost" style:left="{$fileDrag.x + 10}px" style:top="{$fileDrag.y + 10}px">
      {node.entry.name}
    </div>
  {/if}
  {#if node.expanded && node.children}
    <div class="children">
      {#each node.children as child (child.entry.path)}
        <TreeItem node={child} {onRefresh} {rootPath} {showGitIndicators} />
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
      <button onclick={startRename}>Renombrar</button>
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
    user-select: none;
    -webkit-user-select: none;
  }

  .item-row.drop-target {
    background: rgba(74, 158, 255, 0.2);
    outline: 1px dashed var(--accent-color, #4a9eff);
    outline-offset: -1px;
  }

  .item-row.drop-target.directory::after {
    content: "▸ move here";
    margin-left: auto;
    font-size: 10px;
    color: var(--accent-color, #4a9eff);
    opacity: 0.8;
    padding-left: 8px;
  }

  .item-row.is-dragging {
    opacity: 0.4;
  }

  .drag-ghost {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: var(--bg-sidebar, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
    color: var(--text-color, #ccc);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
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
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  .rename-input {
    pointer-events: auto;
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    padding: 1px 4px;
    font-size: 13px;
    border-radius: 3px;
    outline: none;
    max-width: 140px;
  }

  .loading {
    pointer-events: none;
    color: var(--text-muted, #888);
    font-size: 11px;
  }

  .git-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-left: auto;
    flex-shrink: 0;
  }

  .git-dot.git-modified {
    background: #f0a732;
  }

  .git-dot.git-added {
    background: #4caf50;
  }

  .git-dot.git-deleted {
    background: #f14c4c;
  }

  .git-dot.git-untracked {
    background: #888;
  }

  .git-dot.git-renamed {
    background: #4a9eff;
  }

  .name.git-modified {
    color: #f0a732;
  }

  .name.git-added {
    color: #4caf50;
  }

  .name.git-deleted {
    color: #f14c4c;
    text-decoration: line-through;
  }

  .name.git-untracked {
    color: #888;
  }

  .name.git-renamed {
    color: #4a9eff;
  }

  .children {
    padding-left: 12px;
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
