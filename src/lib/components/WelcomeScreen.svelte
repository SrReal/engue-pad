<script lang="ts">
  import { t } from "$lib/i18n";
  import { FolderOpen, X } from "phosphor-svelte";

  let { recentFolders, onOpenFolder, onOpenRecent, onRemoveRecent }: {
    recentFolders: string[];
    onOpenFolder: () => void;
    onOpenRecent: (path: string) => void;
    onRemoveRecent: (path: string) => void;
  } = $props();

  function folderName(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
  }
</script>

<div class="welcome-screen">
  <div class="welcome-content">
    <img class="welcome-logo" src="/favicon.png" alt="" />
    <h1 class="welcome-title">{t("appName")}</h1>
    <button class="welcome-open-btn" onclick={onOpenFolder}>
      <FolderOpen size={18} />
      {t("welcomeOpenFolder")}
    </button>

    {#if recentFolders.length > 0}
      <div class="recent-section">
        <h2 class="recent-title">{t("welcomeRecentFolders")}</h2>
        <ul class="recent-list">
          {#each recentFolders as path}
            <li class="recent-item">
              <button class="recent-path" onclick={() => onOpenRecent(path)} title={path}>
                {folderName(path)}
              </button>
              <button class="recent-remove" onclick={() => onRemoveRecent(path)} title={t("welcomeRemoveRecent")} type="button">
                <X size={12} />
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {:else}
      <p class="recent-empty">{t("welcomeNoRecent")}</p>
    {/if}
  </div>
</div>

<style>
  .welcome-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: linear-gradient(180deg, #0b1220 0%, var(--bg-app, #1a1a1a) 100%);
    color: var(--text-color, #ccc);
  }

  .welcome-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 40px;
    max-width: 420px;
    width: 100%;
  }

  .welcome-logo {
    width: 64px;
    height: 64px;
  }

  .welcome-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
    color: var(--accent-cyan, #00e5ff);
    letter-spacing: -0.5px;
  }

  .welcome-open-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 20px;
    background: var(--accent-color, #4a9eff);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s;
  }

  .welcome-open-btn:hover {
    filter: brightness(1.1);
  }

  .recent-section {
    width: 100%;
  }

  .recent-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted, #888);
    margin: 0 0 8px;
  }

  .recent-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    padding: 4px;
    transition: border-color 0.15s;
  }

  .recent-item:hover {
    border-color: var(--accent-color, #4a9eff);
  }

  .recent-path {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    font-size: 13px;
    text-align: left;
    padding: 6px 8px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-radius: 4px;
  }

  .recent-path:hover {
    color: var(--accent-color, #4a9eff);
  }

  .recent-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .recent-remove:hover {
    background: var(--error-color, #c44);
    color: white;
  }

  .recent-empty {
    font-size: 13px;
    color: var(--text-muted, #888);
    margin: 0;
  }
</style>
