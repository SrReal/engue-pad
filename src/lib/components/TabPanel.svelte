<script lang="ts">
  import type { TabGroup, Tab } from "$lib/layout/types";
  import { layoutState, closeTab, setActiveTab, setActiveNode, splitNode, pinTab, addTerminal, removeNode, moveTab } from "$lib/layout/store.svelte";
  import { workspaceInfo } from "$lib/workspace/store.svelte";
  import { confirm } from "@tauri-apps/plugin-dialog";
  import Editor from "./Editor.svelte";
  import MarkdownViewer from "./MarkdownViewer.svelte";
  import Terminal from "./Terminal.svelte";

  let { node }: { node: TabGroup } = $props();
  let isActive = $derived(layoutState.activeNodeId === node.id);
  let tabContextMenu = $state<{ x: number; y: number; tabId: string } | null>(null);
  let panelContextMenu = $state<{ x: number; y: number } | null>(null);
  let terminalRefs = $state<Record<string, Terminal>>({});
  let dragOverIndex = $state<number | null>(null);
  let draggedTabId = $state<string | null>(null);
  let dragOffsetX = $state(0);
  let dragPosX = $state(0);
  let dragPosY = $state(0);
  let tabBarRef = $state<HTMLDivElement | null>(null);
  let isMouseDown = $state(false);

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
    isMouseDown = true;
    draggedTabId = tabId;
    const tabRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffsetX = e.clientX - tabRect.left;
    dragPosX = tabRect.left;
    dragPosY = tabRect.top;
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    if (!draggedTabId || !isMouseDown) return;
    dragPosX = e.clientX - dragOffsetX;
    dragPosY = (tabBarRef?.getBoundingClientRect().top ?? 0);
    dragOverIndex = getInsertIndex(e.clientX);
  }

  function handleGlobalMouseUp(e: MouseEvent) {
    if (!draggedTabId || !isMouseDown) return;
    const tabId = draggedTabId;
    const insertIndex = getInsertIndex(e.clientX);
    draggedTabId = null;
    isMouseDown = false;
    dragOverIndex = null;
    const fromIndex = getTabIndex(tabId);
    if (fromIndex === -1) return;
    if (fromIndex === insertIndex || fromIndex + 1 === insertIndex) return;
    moveTab(node.id, fromIndex, insertIndex);
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
      const confirmed = await confirm(`"${tab.title}" has unsaved changes. Close without saving?`, { title: "Unsaved Changes", kind: "warning" });
      if (!confirmed) return;
    }
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

  async function handleCloseFromMenu() {
    if (tabContextMenu) {
      const tab = node.tabs.find((t) => t.id === tabContextMenu!.tabId);
      if (tab?.dirty) {
        const confirmed = await confirm(`"${tab.title}" has unsaved changes. Close without saving?`, { title: "Unsaved Changes", kind: "warning" });
        if (!confirmed) {
          closeTabContextMenu();
          return;
        }
      }
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

  async function handleClosePanel() {
    const dirtyTabs = node.tabs.filter((t) => t.dirty);
    if (dirtyTabs.length > 0) {
      const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
      const confirmed = await confirm(`${names} has unsaved changes. Close the panel without saving?`, { title: "Unsaved Changes", kind: "warning" });
      if (!confirmed) {
        closePanelContextMenu();
        return;
      }
    }
    removeNode(node.id);
    closePanelContextMenu();
  }
</script>

<svelte:window
  onclick={() => { closeTabContextMenu(); closePanelContextMenu(); }}
  onmousemove={handleGlobalMouseMove}
  onmouseup={handleGlobalMouseUp}
/>

<div
  class="tab-panel"
  class:active={isActive}
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
  <div class="tab-bar" bind:this={tabBarRef} oncontextmenu={handlePanelContextMenu} role="toolbar" aria-label="Tabs" tabindex="0">
    {#each node.tabs as tab, index (tab.id)}
      <div
        class="tab"
        class:active={node.activeTabId === tab.id}
        class:preview={tab.preview}
        class:drop-before={dragOverIndex === index}
        class:drop-after={dragOverIndex === index + 1}
        class:is-dragging={draggedTabId === tab.id}
        onmousedown={(e) => handleMouseDown(e, tab.id)}
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
    <button class="tab-add" onclick={() => addTerminal(node.id, "Terminal", workspaceInfo.rootPath ?? undefined)} title="New terminal" type="button"><span class="term-icon">&gt;_</span></button>
  </div>
  {#if draggedTabId}
    {@const draggedTab = node.tabs.find((t) => t.id === draggedTabId)}
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
          <Terminal bind:this={terminalRefs[tab.id]} nodeId={node.id} tabId={tab.id} cwd={tab.cwd ?? workspaceInfo.rootPath ?? undefined} />
        </div>
      {:else if tab.id === node.activeTabId}
        {#if tab.path}
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
                nodeId={node.id}
                tabId={tab.id}
                path={tab.path}
                language={tab.language}
                initialContent={tab.content ?? ""}
                dirty={tab.dirty}
              />
            {/if}
          {/key}
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
    flex: 1;
    min-height: 0;
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
    border-radius: 4px;
    color: var(--text-color, #ccc);
    font-size: 13px;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
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
