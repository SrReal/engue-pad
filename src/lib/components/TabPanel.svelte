<script lang="ts">
  import type { TabGroup, Tab } from "$lib/layout/types";
  import { layoutState, closeTab, setActiveTab, setActiveNode, splitNode, addTerminal, removeNode, moveTab, moveTabToPanel, renameTab } from "$lib/layout/store.svelte";
  import { tabDrag } from "$lib/layout/tabDragStore";
  import { workspaceInfo } from "$lib/workspace/store.svelte";
  import { confirm } from "@tauri-apps/plugin-dialog";
  import { get } from "svelte/store";
  import { triggerMascotEvent } from "$lib/mascot/store.svelte";
  import { X, ArrowsOutLineVertical, ArrowsOutLineHorizontal, TerminalWindow, Globe } from "phosphor-svelte";
  import { t } from "$lib/i18n";
  import { formatFile } from "$lib/editor/formatter";
  import FileIcon from "./FileIcon.svelte";
  import Editor from "./Editor.svelte";
  import MarkdownViewer from "./MarkdownViewer.svelte";
  import Terminal from "./Terminal.svelte";
  import WebPreview from "./WebPreview.svelte";
  import ImageViewer from "./ImageViewer.svelte";
  import AudioPlayer from "./AudioPlayer.svelte";

  let { node }: { node: TabGroup } = $props();
  let isActive = $derived(layoutState.activeNodeId === node.id);
  let tabContextMenu = $state<{ x: number; y: number; tabId: string } | null>(null);
  let terminalRefs = $state<Record<string, Terminal>>({});
  let editorRefs = $state<Record<string, Editor>>({});
  let dragOverIndex = $state<number | null>(null);
  let dragOffsetX = $state(0);
  let dragPosX = $state(0);
  let dragPosY = $state(0);
  let tabBarRef = $state<HTMLDivElement | null>(null);
  let isMouseDown = $state(false);
  let panelRef = $state<HTMLDivElement | null>(null);

  let dragState = $state(get(tabDrag));
  $effect(() => {
    const unsub = tabDrag.subscribe((v) => { dragState = v; });
    return unsub;
  });
  const isDragging = $derived(dragState.tabId !== null);
  const isDragOrigin = $derived(dragState.fromNodeId === node.id && dragState.tabId !== null);
  const isDragTarget = $derived(isDragging && dragState.fromNodeId !== node.id && isMouseOverPanel(dragState.x, dragState.y));
  const dragOverPanel = $derived(isDragTarget);
  let renamingTabId = $state<string | null>(null);
  let renameValue = $state("");
  let renameInputRef = $state<HTMLInputElement | null>(null);

  function isMouseOverPanel(x: number, y: number): boolean {
    if (!panelRef) return false;
    const rect = panelRef.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function isImage(path: string): boolean {
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(path);
  }
  function isAudio(path: string): boolean {
    return /\.(mp3|wav|ogg|flac|m4a|aac|wma|opus)$/i.test(path);
  }

  $effect(() => {
    if (renamingTabId && renameInputRef) {
      renameInputRef.focus();
      renameInputRef.select();
    }
  });

  function getTabIndex(tabId: string): number {
    return node.tabs.findIndex((t) => t.id === tabId);
  }

  function getInsertIndex(clientX: number): number {
    if (!tabBarRef) return 0;
    const children = Array.from(tabBarRef.children).filter(
      (c) => c.classList.contains("tab")
    ) as HTMLElement[];
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      if (clientX < center) return i;
    }
    return children.length;
  }

  function handleMouseDown(e: MouseEvent, tabId: string) {
    const target = e.target as HTMLElement;
    if (target.closest(".tab-close")) return;
    e.preventDefault();
    isMouseDown = true;
    const tabRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetX = e.clientX - tabRect.left;
    dragPosX = tabRect.left;
    dragPosY = tabRect.top;
    document.body.classList.add("is-dragging-tab");
    tabDrag.set({ tabId, fromNodeId: node.id, x: e.clientX, y: e.clientY });
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    const state = get(tabDrag);
    if (!state.tabId) return;
    dragPosX = e.clientX - dragOffsetX;
    dragPosY = (tabBarRef?.getBoundingClientRect().top ?? 0);
    dragOverIndex = getInsertIndex(e.clientX);
    tabDrag.set({ ...state, x: e.clientX, y: e.clientY });
  }

  function handleGlobalMouseUp(e: MouseEvent) {
    const state = get(tabDrag);
    if (!state.tabId) return;
    const tabId = state.tabId;
    const fromNodeId = state.fromNodeId;
    isMouseDown = false;
    dragOverIndex = null;
    document.body.classList.remove("is-dragging-tab");
    tabDrag.set({ tabId: null, fromNodeId: null, x: 0, y: 0 });
    if (!fromNodeId) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const targetPanel = el?.closest('[data-node-id]') as HTMLElement | null;
    const toNodeId = targetPanel?.dataset.nodeId ?? null;

    if (toNodeId && toNodeId !== fromNodeId) {
      moveTabToPanel(fromNodeId, tabId, toNodeId);
      return;
    }

    const insertIndex = getInsertIndex(e.clientX);
    const fromIndex = getTabIndex(tabId);
    if (fromIndex === -1) return;
    if (fromIndex === insertIndex || fromIndex + 1 === insertIndex) return;
    moveTab(node.id, fromIndex, insertIndex);
  }

  // Safety: clear drag state if mouse leaves window
  function handleWindowMouseLeave() {
    if (get(tabDrag).tabId) {
      isMouseDown = false;
      dragOverIndex = null;
      document.body.classList.remove("is-dragging-tab");
      tabDrag.set({ tabId: null, fromNodeId: null, x: 0, y: 0 });
    }
  }

  $effect(() => {
    const activeTab = node.tabs.find((t) => t.id === node.activeTabId);
    if (activeTab?.type === "terminal" && isActive) {
      terminalRefs[activeTab.id]?.focusTerminal();
      setTimeout(() => {
        terminalRefs[activeTab.id]?.resizeTerminal();
      }, 50);
    }
  });

  async function handleClose(tabId: string, e: MouseEvent) {
    e.stopPropagation();
    const tab = node.tabs.find((t) => t.id === tabId);
    if (tab?.dirty) {
      const confirmed = await confirm(t("tabUnsavedChangesBody", tab.title), { title: t("tabUnsavedChangesTitle"), kind: "warning" });
      if (!confirmed) return;
    }
    closeTab(node.id, tabId);
    triggerMascotEvent("idle");
  }

  function handleActivate(tabId: string) {
    setActiveTab(node.id, tabId);
    setActiveNode(node.id);
    triggerMascotEvent("keep_working");
  }

  function handlePanelClick() {
    setActiveNode(node.id);
  }

  function handleTabContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    e.stopPropagation();
    tabContextMenu = { x: e.clientX, y: e.clientY, tabId };
  }

  function closeTabContextMenu() {
    tabContextMenu = null;
  }

  function startTabRename(tabId: string) {
    const tab = node.tabs.find((t) => t.id === tabId);
    if (tab) {
      renamingTabId = tabId;
      renameValue = tab.title;
    }
  }

  function handleRenameTab() {
    if (tabContextMenu) {
      startTabRename(tabContextMenu.tabId);
    }
    closeTabContextMenu();
  }

  async function handleFormatTab() {
    if (!tabContextMenu) return;
    const tab = node.tabs.find((t) => t.id === tabContextMenu!.tabId);
    if (!tab || tab.type !== "editor") { closeTabContextMenu(); return; }
    const editor = editorRefs[tabContextMenu.tabId];
    if (editor && typeof editor.format === "function") {
      editor.format();
    } else if (tab.path) {
      try { await formatFile(tab.path); } catch (e) { console.error("Format failed:", e); }
    }
    closeTabContextMenu();
  }

  function submitRename(tabId: string) {
    if (renamingTabId === tabId) {
      renameTab(node.id, tabId, renameValue.trim() || t("tabUntitled"));
      renamingTabId = null;
      renameValue = "";
      triggerMascotEvent("file_renamed");
    }
  }

  function cancelRename() {
    renamingTabId = null;
    renameValue = "";
  }

  async function handleClosePanel() {
    const dirtyTabs = node.tabs.filter((t) => t.dirty);
    if (dirtyTabs.length > 0) {
      const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
      const confirmed = await confirm(t("tabClosePanelBody", names), { title: t("tabUnsavedChangesTitle"), kind: "warning" });
      if (!confirmed) {
        return;
      }
    }
    removeNode(node.id);
  }
</script>

<svelte:window
  onclick={() => { closeTabContextMenu(); }}
  onmousemove={handleGlobalMouseMove}
  onmouseup={handleGlobalMouseUp}
  onmouseleave={handleWindowMouseLeave}
/>

<div
  class="tab-panel"
  data-node-id={node.id}
  class:active={isActive}
  class:drag-target={isDragTarget}
  bind:this={panelRef}
  onclick={handlePanelClick}
  onkeydown={(e: KeyboardEvent) => {
    // Only handle Enter/Space when focus is on the panel itself, not bubbled from xterm/editor.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePanelClick();
    }
  }}
  role="tabpanel"
  tabindex="0"
>
  <div class="tab-bar" role="toolbar" aria-label="Tabs" tabindex="0">
    <button class="tab-add" onclick={() => { addTerminal(node.id, t("terminalDefaultTitle"), workspaceInfo.rootPath ?? undefined); triggerMascotEvent("terminal_created"); }} title={t("tabNewTerminal")} type="button"><TerminalWindow size={16} /></button>
    <div class="tabs-scroll" bind:this={tabBarRef}>
      {#each node.tabs as tab, index (tab.id)}
        <div
          class="tab"
          class:active={node.activeTabId === tab.id}
          class:preview={tab.preview}
          class:drop-before={dragOverIndex === index}
          class:drop-after={dragOverIndex === index + 1}
          class:is-dragging={dragState.tabId === tab.id && dragState.fromNodeId === node.id}
          onmousedown={(e) => handleMouseDown(e, tab.id)}
          onclick={() => handleActivate(tab.id)}
          ondblclick={() => { if (tab.type === "terminal") startTabRename(tab.id); }}
          oncontextmenu={(e) => handleTabContextMenu(e, tab.id)}
          onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(tab.id); } }}
          role="tab"
          tabindex="0"
        >
          {#if renamingTabId === tab.id}
            <input
              class="rename-input"
              type="text"
              bind:value={renameValue}
              bind:this={renameInputRef}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") { e.preventDefault(); submitRename(tab.id); }
                if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
              }}
              onblur={() => submitRename(tab.id)}
            />
          {:else}
            <span class="tab-title">
              {#if tab.type === "terminal"}
                <TerminalWindow size={12} />
              {:else if tab.type === "preview"}
                <Globe size={12} />
              {:else if tab.path}
                <FileIcon path={tab.path} size={12} />
              {:else}
                <FileIcon type="file" size={12} />
              {/if}
              <span class="tab-label">{tab.title}{#if tab.dirty}●{/if}</span>
            </span>
          {/if}
          <button class="tab-close" onclick={(e) => handleClose(tab.id, e)} type="button" aria-label={t("tabClose")}><X size={12} /></button>
        </div>
      {/each}
    </div>
    <div class="panel-actions">
      <button class="panel-action-btn" onclick={() => { splitNode(node.id, 'horizontal'); triggerMascotEvent("panel_split"); }} title={t("tabSplitHorizontal")} type="button"><ArrowsOutLineHorizontal size={14} /></button>
      <button class="panel-action-btn" onclick={() => { splitNode(node.id, 'vertical'); triggerMascotEvent("panel_split"); }} title={t("tabSplitVertical")} type="button"><ArrowsOutLineVertical size={14} /></button>
      <button class="panel-action-btn close" onclick={handleClosePanel} title={t("tabClosePanel")} type="button"><X size={14} /></button>
    </div>
  </div>
  {#if isDragOrigin && dragState.tabId}
    {@const draggedTab = node.tabs.find((t) => t.id === dragState.tabId)}
    {#if draggedTab}
      <div class="drag-ghost" style:left="{dragPosX}px" style:top="{dragPosY}px">
        <span>{draggedTab.title}</span>
      </div>
    {/if}
  {/if}
  <div class="tab-content">
    {#each node.tabs as tab (tab.id)}
      {#if tab.type === "terminal"}
        <div class="terminal-tab-content" class:hidden={tab.id !== node.activeTabId}>
          <Terminal bind:this={terminalRefs[tab.id]} nodeId={node.id} tabId={tab.id} cwd={tab.cwd ?? workspaceInfo.rootPath ?? undefined} shell={tab.shell} />
        </div>
      {:else if tab.type === "preview"}
        <div class="preview-tab-content" class:hidden={tab.id !== node.activeTabId}>
          <WebPreview url={tab.url ?? ""} />
        </div>
      {:else if tab.id === node.activeTabId}
        {#if tab.path}
          {#if isImage(tab.path)}
            <ImageViewer path={tab.path} />
          {:else if isAudio(tab.path)}
            <AudioPlayer path={tab.path} />
          {:else}
            {#key tab.id}
              {#if tab.language === "markdown"}
                <MarkdownViewer
                  nodeId={node.id}
                  tabId={tab.id}
                  path={tab.path}
                  initialContent={tab.content ?? ""}
                  dirty={tab.dirty}
                />
              {:else}
                <Editor
                  bind:this={editorRefs[tab.id]}
                  nodeId={node.id}
                  tabId={tab.id}
                  path={tab.path}
                  language={tab.language}
                  initialContent={tab.content ?? ""}
                  dirty={tab.dirty}
                />
              {/if}
            {/key}
          {/if}
        {:else}
          <div class="content-placeholder">
            <span>{tab.title}</span>
          </div>
        {/if}
      {/if}
    {/each}

    {#if !node.activeTabId}
      <div class="content-placeholder empty">
        <div class="empty-actions">
          <span class="hint">{t("tabHintOpenFile")}</span>
        </div>
      </div>
    {/if}
  </div>

  {#if isDragTarget}
    <div class="drop-overlay">
      <div class="drop-indicator">
        <span class="drop-arrow"><ArrowsOutLineVertical size={28} weight="bold" /></span>
        <span class="drop-label">{t("tabMoveHere")}</span>
      </div>
    </div>
  {/if}
</div>

{#if tabContextMenu}
  <div class="context-menu" style:left="{tabContextMenu.x}px" style:top="{tabContextMenu.y}px">
    {#if node.tabs.find((t) => t.id === tabContextMenu!.tabId)?.type === "editor"}
      <button onclick={handleFormatTab}>{t("tabFormat")}</button>
    {/if}
    <button onclick={handleRenameTab}>{t("tabRename")}</button>
  </div>
{/if}


<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    outline: 2px solid transparent;
    outline-offset: -2px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    position: relative;
    border-radius: 6px;
    overflow: hidden;
  }

  .tab-panel.active {
    outline: none;
    border-color: rgba(14, 165, 255, 0.78);
    box-shadow: inset 0 0 0 1px rgba(14, 165, 255, 0.16);
  }

  .tab-panel.drag-target {
    outline: 2px dashed var(--accent-color, #4a9eff);
    outline-offset: -2px;
    background: var(--accent-soft, rgba(74, 158, 255, 0.05));
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(14, 165, 255, 0.1);
    z-index: 50;
    animation: dropFadeIn 0.15s ease;
    pointer-events: none;
  }

  .drop-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 32px;
    background: var(--bg-surface, #252526);
    border: 2px dashed var(--accent-color, #4a9eff);
    border-radius: 8px;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.42);
    animation: dropBounceIn 0.2s ease;
  }

  .drop-arrow {
    font-size: 24px;
    color: var(--accent-color, #4a9eff);
    animation: dropPulse 1s ease-in-out infinite;
  }

  .drop-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-color, #4a9eff);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  @keyframes dropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes dropBounceIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes dropPulse {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  .tab-bar {
    display: flex;
    background: var(--bg-tab-bar, #2d2d2d);
    border-bottom: 1px solid var(--border-color, #333);
    overflow: hidden;
    min-height: 34px;
  }

  .tabs-scroll {
    display: flex;
    flex: 1;
    overflow-x: auto;
    min-width: 0;
    scrollbar-width: thin;
    scrollbar-color: var(--border-strong, #333) transparent;
  }

  .tabs-scroll::-webkit-scrollbar {
    height: 4px;
  }

  .tabs-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .tabs-scroll::-webkit-scrollbar-thumb {
    background: var(--border-color, #333);
    border-radius: 2px;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 7px 34px 7px 12px;
    background: var(--bg-tab, #2d2d2d);
    border: none;
    border-right: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    cursor: pointer;
    white-space: nowrap;
    font-size: 13px;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
    max-width: 220px;
    position: relative;
    --tab-close-bg: var(--bg-tab, #2d2d2d);
    transition: background 0.12s ease, color 0.12s ease;
  }

  .tab:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    --tab-close-bg: var(--bg-tab-hover, #3d3d3d);
  }

  .tab.active {
    background: var(--bg-panel, #1e1e1e);
    color: #ffffff;
    border-bottom: 1px solid var(--bg-panel, #1e1e1e);
    --tab-close-bg: var(--bg-panel, #1e1e1e);
  }

  .tab.active::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-color, #4a9eff), var(--accent-cyan, #00e5ff));
    pointer-events: none;
  }

  .tab.preview .tab-title {
    font-style: italic;
    opacity: 0.8;
  }

  .tab-title {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .tab-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tab-close {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.15s ease;
    background: var(--tab-close-bg);
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    padding: 0;
  }

  .tab:hover .tab-close {
    opacity: 1;
  }

  .tab-close:hover {
    background: var(--bg-tab-close-hover, #c44);
  }

  .tab-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin: 1px 2px;
    background: transparent;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 16px;
    border-radius: 6px;
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  }

  .tab-add:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .drop-before {
    border-left: 2px solid var(--accent-color, #4a9eff);
  }

  .drop-after {
    border-right: 2px solid var(--accent-color, #4a9eff);
  }

  .is-dragging {
    opacity: 0.3;
  }

  .drag-ghost {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--bg-tab, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    color: var(--text-color, #ccc);
    font-size: 13px;
    white-space: nowrap;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
    user-select: none;
    -webkit-user-select: none;
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .terminal-tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
  }

  .terminal-tab-content.hidden {
    display: none;
  }

  .preview-tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
  }

  .preview-tab-content.hidden {
    display: none;
  }

  .rename-input {
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    padding: 2px 6px;
    font-size: 13px;
    border-radius: 5px;
    outline: none;
    max-width: 140px;
  }

  .content-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted, #888);
    font-size: 14px;
  }

  .empty-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .hint {
    font-size: 12px;
    color: var(--text-muted, #666);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 4px;
    border-left: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .panel-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    font-size: 14px;
    border-radius: 6px;
    user-select: none;
    -webkit-user-select: none;
    padding: 0;
  }

  .panel-action-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    color: var(--text-color, #ccc);
  }

  .panel-action-btn.close:hover {
    background: var(--bg-tab-close-hover, #c44);
    color: white;
  }

  .context-menu {
    position: fixed;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 7px;
    padding: 4px 0;
    z-index: 1000;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.44);
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

  :global(body.is-dragging-tab) {
    cursor: grabbing !important;
    user-select: none !important;
    -webkit-user-select: none !important;
  }

  :global(body.is-dragging-tab *) {
    cursor: grabbing !important;
  }
</style>
