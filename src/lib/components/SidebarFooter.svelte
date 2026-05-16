<script lang="ts">
  import { gitStore } from "$lib/git/store.svelte";
  import { workspaceInfo } from "$lib/workspace/store.svelte";

  const changedCount = $derived.by(() => {
    if (!gitStore.isRepo) return 0;
    return Object.keys(gitStore.files).length;
  });
</script>

{#if workspaceInfo.rootPath}
  <div class="sidebar-footer">
    {#if gitStore.isRepo}
      <span class="branch" title="Git branch">🌿 {gitStore.branch}</span>
      {#if changedCount > 0}
        <span class="changes" title="{changedCount} changed file{changedCount === 1 ? '' : 's'}">● {changedCount}</span>
      {/if}
    {:else}
      <span class="no-repo">No git</span>
    {/if}
  </div>
{/if}

<style>
  .sidebar-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    border-top: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #252526);
    font-size: 11px;
    color: var(--text-muted, #888);
    user-select: none;
    -webkit-user-select: none;
    min-height: 24px;
  }

  .branch {
    color: var(--accent-color, #4a9eff);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .changes {
    color: #f0a732;
    font-size: 10px;
  }

  .no-repo {
    opacity: 0.5;
  }
</style>
