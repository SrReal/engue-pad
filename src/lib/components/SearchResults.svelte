<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { addTab } from "$lib/layout/store.svelte";
  import { layoutState } from "$lib/layout/store.svelte";

  type SearchMatch = {
    path: string;
    line: number;
    text: string;
  };

  let { content }: { content: string } = $props();

  let data = $derived(() => {
    try {
      return JSON.parse(content) as { query: string; global: boolean; results: SearchMatch[] };
    } catch {
      return { query: "", global: false, results: [] };
    }
  });

  function openFile(path: string, line: number) {
    const activeNodeId = layoutState.activeNodeId ?? layoutState.root.id;
    const name = path.split(/[\\/]/).pop() ?? path;
    addTab(activeNodeId, {
      id: path,
      title: name,
      path,
    });
  }

  function highlight(text: string, query: string): string {
    const q = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}<mark>${match}</mark>${after}`;
  }
</script>

<div class="search-panel">
  {#if data().results.length === 0}
    <div class="empty">No results</div>
  {:else}
    <div class="results">
      {#each data().results as match}
        <button class="result-row" onclick={() => openFile(match.path, match.line)}>
          <div class="result-path">{match.path}</div>
          <div class="result-line">Line {match.line}: {@html highlight(match.text, data().query)}</div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-panel {
    padding: 12px;
    overflow: auto;
    height: 100%;
  }

  .empty {
    color: var(--text-muted, #888);
    text-align: center;
    padding: 40px;
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-color, #ccc);
    font-size: 13px;
  }

  .result-row:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    border-color: var(--accent-color, #4a9eff);
  }

  .result-path {
    font-size: 11px;
    color: var(--accent-color, #4a9eff);
    opacity: 0.85;
  }

  .result-line {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .result-line :global(mark) {
    background: var(--accent-soft, rgba(74, 158, 255, 0.25));
    color: var(--accent-color, #4a9eff);
    border-radius: 2px;
    padding: 0 2px;
  }
</style>
