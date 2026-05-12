<script lang="ts">
  import type { TabGroup, Tab } from "$lib/layout/types";
  import { layoutState, closeTab, setActiveTab, setActiveNode, splitNode, pinTab, addTerminal, removeNode, moveTab } from "$lib/layout/store.svelte";
  import Editor from "./Editor.svelte";
  import MarkdownViewer from "./MarkdownViewer.svelte";
  import Terminal from "./Terminal.svelte";

  let { node }: { node: TabGroup } = $props();
  let isActive = $derived(layoutState.activeNodeId === node.id);
  let tabContextMenu = $state<{ x: number; y: number; tabId: string } | null>(null);
  let panelContextMenu = $state<{ x: number; y: number } | null>(null);
  let terminalRef = $state<Terminal | null>(null);
  let dragOverIndex = $state<number | null>(null);

  function getTabIndex(tabId: string): number {
    return node.tabs.findIndex((t) => t.id === tabId);
  }

  function handleDragStart(e: DragEvent, tabId: string) {
    e.dataTransfer?.setData("text/plain", tabId);
    e.dataTransfer!.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    const tabId = e.dataTransfer?.getData("text/plain");
    if (!tabId) return;
    const fromIndex = getTabIndex(tabId);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    moveTab(node.id, fromIndex, targetIndex);
    dragOverIndex = null;
  }

  $effect(() => {
    const activeTab = node.tabs.find((t) => t.id === node.activeTabId);
    if (activeTab?.type === "terminal" && terminalRef) {
      terminalRef.focusTerminal();
    }
  });

  function handleClose(tabId: string, e: MouseEvent) {
    e.stopPropagation();
    closeTab(node.id, tabId);
  }

  function handleActivate(tabId: string) {
    setActiveTab(node.id, tabId);
    setActiveNode(node.id);
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

  function handlePinTab() {
    if (tabContextMenu) {
      pinTab(node.id, tabContextMenu.tabId);
    }
    closeTabContextMenu();
  }

  function handleCloseFromMenu() {
    if (tabContextMenu) {
      closeTab(node.id, tabContextMenu.tabId);
    }
    closeTabContextMenu();
  }

  function handlePanelContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    panelContextMenu = { x: e.clientX, y: e.clientY };
  }

  function closePanelContextMenu() {
    panelContextMenu = null;
  }

  function handleClosePanel() {
    removeNode(node.id);
    closePanelContextMenu();
  }
</script>

<svelte:window onclick={() => { closeTabContextMenu(); closePanelContextMenu(); }} />

<div class="tab-panel" class:active={isActive} onclick={handlePanelClick} onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePanelClick(); } }} role="tabpanel" tabindex="0">
  <div class="tab-bar" oncontextmenu={handlePanelContextMenu} role="toolbar" aria-label="Tabs" tabindex="0">
    {#each node.tabs as tab, index (tab.id)}
      <div
        class="tab"
        class:active={node.activeTabId === tab.id}
        class:preview={tab.preview}
        class:drag-over-left={dragOverIndex === index}
        class:drag-over-right={dragOverIndex !== null && dragOverIndex === index + 1 && index === node.tabs.length - 1}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, tab.id)}
        ondragover={(e) => handleDragOver(e, index)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, index)}
        onclick={() => handleActivate(tab.id)}
        oncontextmenu={(e) => handleTabContextMenu(e, tab.id)}
        onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(tab.id); } }}
        role="tab"
        tabindex="0"
      >
        <span class="tab-title">
          {tab.title}{#if tab.dirty}●{/if}
        </span>
        <button class="tab-close" onclick={(e) => handleClose(tab.id, e)} type="button" aria-label="Close tab">×</button>
      </div>
    {/each}
    <button class="tab-add" onclick={() => addTerminal(node.id)} title="New terminal" type="button"><span class="term-icon">&gt;_</span></button>
  </div>
  <div class="tab-content">
    {#if node.activeTabId}
      {@const activeTab = node.tabs.find((t) => t.id === node.activeTabId)}
      {#if activeTab}
        {#if activeTab.type === "terminal"}
          <Terminal bind:this={terminalRef} nodeId={node.id} tabId={activeTab.id} />
        {:else if activeTab.path}
          {#key activeTab.id}
            {#if activeTab.language === "markdown"}
              <MarkdownViewer
                nodeId={node.id}
                tabId={activeTab.id}
                path={activeTab.path}
                initialContent={activeTab.content ?? ""}
              />
            {:else}
              <Editor
                nodeId={node.id}
                tabId={activeTab.id}
                path={activeTab.path}
                language={activeTab.language}
                initialContent={activeTab.content ?? ""}
              />
            {/if}
          {/key}
        {:else}
          <div class="content-placeholder">
            <span>{activeTab.title}</span>
          </div>
        {/if}
      {/if}
    {:else}
      <div class="content-placeholder empty">
        <div class="empty-actions">
          <span class="hint">Click a file in the sidebar to open</span>
        </div>
      </div>
    {/if}
  </div>
</div>

{#if tabContextMenu}
  <div class="context-menu" style:left="{tabContextMenu.x}px" style:top="{tabContextMenu.y}px">
    <button onclick={handleCloseFromMenu}>Close</button>
    <button onclick={handlePinTab}>Pin</button>
  </div>
{/if}

{#if panelContextMenu}
  <div class="context-menu" style:left="{panelContextMenu.x}px" style:top="{panelContextMenu.y}px">
    <button onclick={handleClosePanel}>Close panel</button>
  </div>
{/if}

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel, #1e1e1e);
    outline: 2px solid transparent;
    outline-offset: -2px;
    transition: outline-color 0.15s ease;
  }

  .tab-panel.active {
    outline-color: var(--accent-color, #4a9eff);
  }

  .tab-bar {
    display: flex;
    background: var(--bg-tab-bar, #2d2d2d);
    border-bottom: 1px solid var(--border-color, #333);
    overflow-x: auto;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--bg-tab, #2d2d2d);
    border: none;
    border-right: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    cursor: pointer;
    white-space: nowrap;
    font-size: 13px;
  }

  .tab:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .tab.active {
    background: var(--bg-panel, #1e1e1e);
    border-bottom: 1px solid var(--bg-panel, #1e1e1e);
  }

  .tab.preview .tab-title {
    font-style: italic;
    opacity: 0.8;
  }

  .tab-title {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    font-size: 14px;
    line-height: 1;
  }

  .tab-close:hover {
    background: var(--bg-tab-close-hover, #c44);
  }

  .tab-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin: 2px 4px;
    background: transparent;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 16px;
    border-radius: 3px;
  }

  .tab-add:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .term-icon {
    font-family: monospace;
    font-weight: 600;
    font-size: 14px;
  }

  .drag-over-left {
    border-left: 2px solid var(--accent-color, #4a9eff);
  }

  .drag-over-right {
    border-right: 2px solid var(--accent-color, #4a9eff);
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
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
