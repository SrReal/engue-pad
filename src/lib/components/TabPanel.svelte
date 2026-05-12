<script lang="ts">
  import type { TabGroup, Tab } from "$lib/layout/types";
  import { closeTab, setActiveTab } from "$lib/layout/store.svelte";

  let { node }: { node: TabGroup } = $props();

  function handleClose(tabId: string, e: MouseEvent) {
    e.stopPropagation();
    closeTab(node.id, tabId);
  }

  function handleActivate(tabId: string) {
    setActiveTab(node.id, tabId);
  }
</script>

<div class="tab-panel">
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
        <span class="tab-title">{tab.title}</span>
        <button class="tab-close" onclick={(e) => handleClose(tab.id, e)} type="button" aria-label="Close tab">×</button>
      </div>
    {/each}
  </div>
  <div class="tab-content">
    {#if node.activeTabId}
      {@const activeTab = node.tabs.find((t) => t.id === node.activeTabId)}
      {#if activeTab}
        <div class="content-placeholder">
          {#if activeTab.path}
            <span class="file-path">{activeTab.path}</span>
          {:else}
            <span>{activeTab.title}</span>
          {/if}
        </div>
      {/if}
    {:else}
      <div class="content-placeholder empty">No tabs open</div>
    {/if}
  </div>
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel, #1e1e1e);
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
    overflow: auto;
  }

  .content-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted, #888);
    font-size: 14px;
  }

  .file-path {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-muted, #888);
  }
</style>
