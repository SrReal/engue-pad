<script lang="ts">
  import { gitStore } from "$lib/git/store.svelte";
  import { workspaceInfo } from "$lib/workspace/store.svelte";
  import { t } from "$lib/i18n";
  import { TreeView, Circle } from "phosphor-svelte";

  const changedCount = $derived.by(() => {
    if (!gitStore.isRepo) return 0;
    return Object.keys(gitStore.files).length;
  });
</script>

{#if workspaceInfo.rootPath}
  <div class="sidebar-footer">
    {#if gitStore.isRepo}
      <span class="branch" title={t("sidebarGitBranch")}><TreeView size={12} /> {gitStore.branch}</span>
      {#if changedCount > 0}
        <span class="changes" title="{changedCount} {t("sidebarChangedFiles")}"><Circle size={8} weight="fill" /> {changedCount}</span>
      {/if}
    {:else}
      <span class="no-repo">{t("sidebarNoGit")}</span>
    {/if}
  </div>
{/if}

<style>
  .sidebar-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-top: 1px solid var(--border-color, #333);
    background: var(--bg-tab-bar, #252526);
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
    color: var(--warning-color, #f0a732);
    font-size: 10px;
  }

  .no-repo {
    opacity: 0.5;
  }
</style>
