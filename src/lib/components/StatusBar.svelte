<script lang="ts">
  import { layoutState } from "$lib/layout/store.svelte";
  import type { LayoutNode, Tab } from "$lib/layout/types";

  function findActiveTab(root: LayoutNode, activeNodeId: string | null): Tab | null {
    if (!activeNodeId) return null;
    if (root.kind === "tab-group" && root.id === activeNodeId) {
      return root.tabs.find((t) => t.id === root.activeTabId) ?? null;
    }
    if (root.kind === "split") {
      return findActiveTab(root.first, activeNodeId) ?? findActiveTab(root.second, activeNodeId);
    }
    return null;
  }

  const activeTab = $derived(findActiveTab(layoutState.root, layoutState.activeNodeId));
</script>

<div class="status-bar">
  <span class="info path">{activeTab?.path ?? ""}</span>
  <span class="info">{activeTab?.lineEnding ?? "LF"}</span>
  <span class="info">UTF-8</span>
  <span class="info">{activeTab?.language ?? ""}</span>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 12px;
    height: 22px;
    background: var(--bg-sidebar, #252526);
    border-top: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    font-size: 12px;
    flex-shrink: 0;
  }

  .info {
    white-space: nowrap;
  }

  .path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
