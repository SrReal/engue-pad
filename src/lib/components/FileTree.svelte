<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { get } from "svelte/store";
  import TreeItem from "./TreeItem.svelte";
  import { fileDrag } from "$lib/tree/fileDragStore";
  import { selectedTreePath } from "$lib/tree/selectedStore";
  import { refreshGitStatus } from "$lib/git/store.svelte";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { t } from "$lib/i18n";
  import { MagnifyingGlass, Plus, FolderPlus, ArrowClockwise, X } from "phosphor-svelte";
  import { get } from "svelte/store";

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
  let searchQuery = $state("");
  let newFileName = $state("");
  let newFolderName = $state("");
  let showNewFileInput = $state(false);
  let showNewFolderInput = $state(false);

  let rootNode = $state<TreeNode>({
    entry: { name: "Root", path: "", is_dir: true, is_file: false },
    expanded: true,
    children: [],
    loading: false,
  });

  let rootName = $derived(rootPath.split(/[\\/]/).pop() || "Root");

  function filterNodes(nodes: TreeNode[], query: string): TreeNode[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes.reduce<TreeNode[]>((acc, node) => {
      const nameMatch = node.entry.name.toLowerCase().includes(q);
      if (node.entry.is_dir) {
        const filteredChildren = node.children ? filterNodes(node.children, query) : [];
        if (filteredChildren.length > 0 || nameMatch) {
          acc.push({ ...node, children: filteredChildren.length > 0 ? filteredChildren : node.children, expanded: filteredChildren.length > 0 });
        }
      } else if (nameMatch) {
        acc.push(node);
      }
      return acc;
    }, []);
  }

  let filteredTree = $derived(searchQuery ? filterNodes(tree, searchQuery) : tree);

  $effect(() => {
    rootNode.entry = { name: rootName, path: rootPath, is_dir: true, is_file: false };
    rootNode.children = filteredTree;
  });

  function getSep(): string {
    return rootPath.includes("/") ? "/" : "\\";
  }

  function startNewFile() {
    showNewFileInput = true;
    showNewFolderInput = false;
    newFileName = "";
  }

  function startNewFolder() {
    showNewFolderInput = true;
    showNewFileInput = false;
    newFolderName = "";
  }

  function resolveTargetDir(): string {
    const sel = get(selectedTreePath);
    if (!sel || sel === rootPath) return rootPath;
    const sep = getSep();
    const lastSep = Math.max(sel.lastIndexOf("/"), sel.lastIndexOf("\\"));
    const parent = lastSep >= 0 ? sel.slice(0, lastSep) : rootPath;
    // If selected is a directory, create inside it; otherwise create in its parent
    if (sel.endsWith(sep)) return sel.slice(0, -1);
    const isDir = tree.some((n) => n.entry.path === sel && n.entry.is_dir);
    if (isDir) return sel;
    return parent || rootPath;
  }

  async function createNewFile() {
    const name = newFileName.trim();
    if (!name) return;
    const sep = getSep();
    const targetDir = resolveTargetDir();
    const path = targetDir.endsWith(sep) ? targetDir + name : targetDir + sep + name;
    try {
      await invoke("write_file", { path, contents: "" });
      newFileName = "";
      showNewFileInput = false;
      selectedTreePath.set(path);
      reloadTree();
    } catch (e) {
      alert(`Error creating file: ${e}`);
    }
  }

  async function createNewFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const sep = getSep();
    const targetDir = resolveTargetDir();
    const path = targetDir.endsWith(sep) ? targetDir + name : targetDir + sep + name;
    try {
      await invoke("ensure_dir", { path });
      newFolderName = "";
      showNewFolderInput = false;
      selectedTreePath.set(path);
      reloadTree();
    } catch (e) {
      alert(`Error creating folder: ${e}`);
    }
  }

  function handleNewFileKey(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); createNewFile(); }
    if (e.key === "Escape") { e.preventDefault(); showNewFileInput = false; }
  }

  function handleNewFolderKey(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); createNewFolder(); }
    if (e.key === "Escape") { e.preventDefault(); showNewFolderInput = false; }
  }

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
    const _git = appSettings.git;
    loadDirectory(rootPath).then((nodes) => {
      tree = nodes;
    });
    refreshGitStatus(rootPath);

    const intervalMs = (_git?.refreshInterval ?? 5) * 1000;
    showGitIndicators = _git?.showIndicators ?? true;

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
    <div class="tree-toolbar">
      <div class="toolbar-row">
        <div class="search-box">
          <MagnifyingGlass size={14} />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={t("treeSearch")}
          />
          {#if searchQuery}
            <button class="clear-search" onclick={() => searchQuery = ""}><X size={12} /></button>
          {/if}
        </div>
        <button class="toolbar-btn" title={t("treeNewFile")} onclick={startNewFile}><Plus size={16} /></button>
        <button class="toolbar-btn" title={t("treeNewFolder")} onclick={startNewFolder}><FolderPlus size={16} /></button>
        <button class="toolbar-btn" title={t("treeRefresh")} onclick={reloadTree}><ArrowClockwise size={16} /></button>
      </div>
      {#if showNewFileInput}
        <div class="toolbar-input-row">
          <input type="text" bind:value={newFileName} onkeydown={handleNewFileKey} placeholder="filename.ext" />
          <button class="toolbar-ok" onclick={createNewFile}>OK</button>
          <button class="toolbar-cancel" onclick={() => showNewFileInput = false}>X</button>
        </div>
      {/if}
      {#if showNewFolderInput}
        <div class="toolbar-input-row">
          <input type="text" bind:value={newFolderName} onkeydown={handleNewFolderKey} placeholder="foldername" />
          <button class="toolbar-ok" onclick={createNewFolder}>OK</button>
          <button class="toolbar-cancel" onclick={() => showNewFolderInput = false}>X</button>
        </div>
      {/if}
    </div>
    <TreeItem node={rootNode} onRefresh={reloadTree} {rootPath} {showGitIndicators} />
  {/if}
</div>

<style>
  .file-tree {
    font-size: 13px;
    user-select: none;
    color: var(--text-color, #ccc);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tree-toolbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 6px;
  }

  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    padding: 4px 8px;
    min-width: 0;
  }

  .search-box input {
    background: transparent;
    border: none;
    color: var(--text-color, #ccc);
    font-size: 12px;
    line-height: 1;
    outline: none;
    flex: 1;
    min-width: 0;
    min-height: 22px;
    padding: 0;
  }

  .search-box input::placeholder {
    color: var(--text-muted, #888);
  }

  .clear-search {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search:hover {
    color: var(--text-color, #ccc);
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    cursor: pointer;
    border-radius: 6px;
    padding: 0;
    font-size: 14px;
    flex-shrink: 0;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }

  .toolbar-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    border-color: var(--accent-color, #4a9eff);
    color: var(--accent-color, #4a9eff);
  }

  .toolbar-input-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .toolbar-input-row input {
    flex: 1;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 12px;
    outline: none;
    min-width: 0;
  }

  .toolbar-ok,
  .toolbar-cancel {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    border: none;
    flex-shrink: 0;
  }

  .toolbar-ok {
    background: var(--accent-color, #4a9eff);
    color: white;
  }

  .toolbar-ok:hover {
    background: var(--accent-hover, #0d8cff);
  }

  .toolbar-cancel {
    background: var(--bg-surface, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
  }

  .toolbar-cancel:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    color: var(--text-color, #ccc);
  }

  .file-tree.root-drop-target {
    background: var(--accent-soft, rgba(74, 158, 255, 0.1));
    outline: 1px dashed var(--accent-color, #4a9eff);
    outline-offset: -1px;
    border-radius: 6px;
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
