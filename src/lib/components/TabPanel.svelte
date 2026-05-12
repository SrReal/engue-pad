<script lang="ts">
  import type { TabGroup, Tab } from "$lib/layout/types";
  import { layoutState, closeTab, setActiveTab, setActiveNode, splitNode } from "$lib/layout/store.svelte";
  import Editor from "./Editor.svelte";
  import MarkdownViewer from "./MarkdownViewer.svelte";

  let { node }: { node: TabGroup } = $props();
  let isActive = $derived(layoutState.activeNodeId === node.id);

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

  function addHorizontalSplit() {
    splitNode(node.id, "horizontal");
  }

  function addVerticalSplit() {
    splitNode(node.id, "vertical");
  }
</script>

<div class="tab-panel" class:active={isActive} onclick={handlePanelClick} onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePanelClick(); } }} role="tabpanel" tabindex="0">
  <div class="tab-bar">
    {#each node.tabs as tab (tab.id)}
      <div
        class="tab"
        class:active={node.activeTabId === tab.id}
        onclick={() => handleActivate(tab.id)}
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
  </div>
  <div class="tab-content">
    {#if node.activeTabId}
      {@const activeTab = node.tabs.find((t) => t.id === node.activeTabId)}
      {#if activeTab}
        {#if activeTab.path}
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
          <button class="action-btn" onclick={addHorizontalSplit}>⧈ Split horizontal</button>
          <button class="action-btn" onclick={addVerticalSplit}>⧉ Split vertical</button>
          <span class="hint">Click a file in the sidebar to open</span>
        </div>
      </div>
    {/if}
  </div>
</div>

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

  .action-btn {
    background: var(--bg-tab-hover, #3d3d3d);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }

  .action-btn:hover {
    background: var(--accent-color, #4a9eff);
    border-color: var(--accent-color, #4a9eff);
    color: white;
  }

  .hint {
    font-size: 12px;
    color: var(--text-muted, #666);
  }
</style>
