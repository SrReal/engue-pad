<script lang="ts">
  import { openUrl } from "@tauri-apps/plugin-opener";
  import { Desktop, DeviceMobile } from "phosphor-svelte";
  import { t } from "$lib/i18n";

  let { url }: { url: string } = $props();
  let iframeRef = $state<HTMLIFrameElement | null>(null);
  let isLoading = $state(true);
  let isMobile = $state(false);

  function refresh() {
    if (iframeRef) {
      isLoading = true;
      iframeRef.src = url;
    }
  }

  function openExternal() {
    openUrl(url).catch(() => {
      window.open(url, "_blank");
    });
  }

  function handleLoad() {
    isLoading = false;
  }
</script>

<div class="web-preview">
  <div class="toolbar">
    <span class="url" title={url}>{url}</span>
    <button class="tool-btn" onclick={() => isMobile = !isMobile} title={isMobile ? t("previewDesktop") : t("previewMobile")}>
      {#if isMobile}<Desktop size={16} />{:else}<DeviceMobile size={16} />{/if}
    </button>
    <button class="tool-btn" onclick={refresh} title={t("previewRefresh")}>&#x21bb;</button>
    <button class="tool-btn" onclick={openExternal} title={t("previewOpenBrowser")}>&#x2197;</button>
  </div>
  <div class="viewport" class:mobile={isMobile}>
    {#if isLoading}
      <div class="loading">{t("previewLoading")}</div>
    {/if}
    <iframe
      bind:this={iframeRef}
      src={url}
      title={url}
      onload={handleLoad}
      sandbox="allow-scripts allow-same-origin allow-forms"
    ></iframe>
  </div>
</div>

<style>
  .web-preview {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--bg-panel, #1e1e1e);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--bg-tab-bar, #2d2d2d);
    border-bottom: 1px solid var(--border-color, #333);
  }

  .url {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--text-muted, #888);
  }

  .tool-btn {
    background: transparent;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 14px;
    line-height: 1;
  }

  .tool-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-muted, #888);
    font-size: 13px;
    z-index: 1;
  }

  .viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    background: var(--bg-panel, #1e1e1e);
  }

  .viewport iframe {
    flex: 1;
    border: none;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .viewport.mobile iframe {
    flex: none;
    width: 375px;
    height: 667px;
    border: 1px solid var(--border-color, #333);
    border-radius: 12px;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.44);
  }
</style>
