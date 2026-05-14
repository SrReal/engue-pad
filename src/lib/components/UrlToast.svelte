<script lang="ts">
  import { detectedUrls, clearUrl } from "$lib/terminal/urlDetector";
  import { openUrl } from "@tauri-apps/plugin-opener";

  function dismiss(url: string, terminalId: string) {
    clearUrl(url, terminalId);
  }

  async function openExternal(url: string) {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  }
</script>

{#if $detectedUrls.length > 0}
  <div class="url-toast-container">
    {#each $detectedUrls as detected (detected.timestamp)}
      <div class="url-toast">
        <span class="url-text">{detected.url}</span>
        <button class="url-action" onclick={() => openExternal(detected.url)} type="button">
          Open
        </button>
        <button
          class="url-dismiss"
          onclick={() => dismiss(detected.url, detected.terminalId)}
          type="button"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .url-toast-container {
    position: fixed;
    bottom: 36px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 2000;
    pointer-events: none;
  }

  .url-toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-sidebar, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    font-size: 13px;
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .url-text {
    color: var(--accent-color, #4a9eff);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .url-action {
    background: var(--accent-color, #4a9eff);
    border: none;
    color: white;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
  }

  .url-action:hover {
    opacity: 0.9;
  }

  .url-dismiss {
    background: transparent;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
  }

  .url-dismiss:hover {
    color: var(--text-color, #ccc);
  }
</style>
