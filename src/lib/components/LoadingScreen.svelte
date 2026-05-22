<script lang="ts">
  import { t } from "$lib/i18n";
  export let text = "";
</script>

<div class="loading-screen">
  <div class="loading-content">
    <div class="spinner"></div>
    <div class="loading-text">{text || t("loadingScreenDefault")}</div>
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #0b1220 0%, var(--bg-app, #1a1a1a) 100%);
    color: var(--text-color, #ccc);
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color, #333);
    border-top-color: var(--accent-cyan, #00e5ff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-muted, #888);
    user-select: none;
    -webkit-user-select: none;
  }
</style>
