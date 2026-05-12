<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import Editor from "./Editor.svelte";

  let { nodeId, tabId, path, initialContent = "" }: {
    nodeId: string;
    tabId: string;
    path?: string;
    initialContent?: string;
  } = $props();

  let showRendered = $state(true);
  let renderedHtml = $state("");
  let isLoading = $state(false);

  async function loadAndRender() {
    if (!path) return;
    isLoading = true;
    try {
      const content = await invoke<string>("read_file", { path });
      renderedHtml = renderMarkdown(content);
    } catch (e) {
      console.error("Failed to read markdown:", e);
    } finally {
      isLoading = false;
    }
  }

  function renderMarkdown(md: string): string {
    let html = md
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      .replace(/\*\*(.*)\*\*/gim, "<b>$1</b>")
      .replace(/\*(.*)\*/gim, "<i>$1</i>")
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/gim, "<br>");
    return html;
  }

  onMount(() => {
    if (path) loadAndRender();
  });
</script>

<div class="markdown-viewer">
  <div class="toolbar">
    <button class="toggle-btn" class:active={!showRendered} onclick={() => showRendered = false}>Raw</button>
    <button class="toggle-btn" class:active={showRendered} onclick={() => showRendered = true}>Preview</button>
  </div>
  {#if showRendered}
    <div class="rendered">
      {#if isLoading}
        <div class="loading">Loading...</div>
      {:else}
        {@html renderedHtml}
      {/if}
    </div>
  {:else}
    <Editor {nodeId} {tabId} {path} language="markdown" {initialContent} />
  {/if}
</div>

<style>
  .markdown-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .toolbar {
    display: flex;
    gap: 4px;
    padding: 4px 8px;
    background: var(--bg-tab-bar, #2d2d2d);
    border-bottom: 1px solid var(--border-color, #333);
    justify-content: flex-end;
  }

  .toggle-btn {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }

  .toggle-btn.active {
    background: var(--accent-color, #4a9eff);
    border-color: var(--accent-color, #4a9eff);
    color: white;
  }

  .rendered {
    flex: 1;
    overflow: auto;
    padding: 16px;
    line-height: 1.6;
  }

  .rendered :global(h1), .rendered :global(h2), .rendered :global(h3) {
    margin-top: 16px;
    margin-bottom: 8px;
  }

  .rendered :global(blockquote) {
    border-left: 3px solid var(--border-color, #333);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--text-muted, #888);
  }

  .rendered :global(a) {
    color: var(--accent-color, #4a9eff);
  }

  .loading {
    color: var(--text-muted, #888);
    font-size: 13px;
    text-align: center;
    padding: 20px;
  }
</style>
