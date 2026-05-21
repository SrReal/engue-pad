<script lang="ts">
  import { detectedUrls, clearUrl } from "$lib/terminal/urlDetector";
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { addPreview, layoutState } from "$lib/layout/store.svelte";
  import { triggerMascotEvent } from "$lib/mascot/store.svelte";
  import { X } from "phosphor-svelte";

  function dismiss(url: string, terminalId: string) {
    clearUrl(url, terminalId);
  }

  function openPreview(url: string, terminalId: string) {
    const nodeId = layoutState.activeNodeId ?? layoutState.root.id;
    addPreview(nodeId, url);
    triggerMascotEvent("preview_opened");
    clearUrl(url, terminalId);
  }

  async function openExternal(url: string, terminalId: string) {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
    clearUrl(url, terminalId);
  }
</script>

{#if $detectedUrls.length > 0}
  <div class="url-toast-container">
    {#each $detectedUrls as detected (detected.timestamp)}
      <div class="url-toast">
        <span class="url-text">{detected.url}</span>
        <button class="url-action" onclick={() => openPreview(detected.url, detected.terminalId)} type="button">
          Open preview
        </button>
        <button class="url-action secondary" onclick={() => openExternal(detected.url, detected.terminalId)} type="button">
          External
        </button>
        <button
          class="url-dismiss"
          onclick={() => dismiss(detected.url, detected.terminalId)}
          type="button"
          aria-label="Dismiss"
        >
          <X size={14} />
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

  .url-action.secondary {
    background: var(--bg-tab-hover, #3d3d3d);
    border: 1px solid var(--border-color, #333);
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
