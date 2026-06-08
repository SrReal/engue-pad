<script lang="ts">
  import { t } from "$lib/i18n";
  import { extractJsTsSymbols } from "$lib/editor/symbols";
  import { requestEditorJump } from "$lib/editor/editorJumpStore.svelte";
  import { activeEditorSymbols } from "$lib/editor/activeSymbolsStore.svelte";
  import { Function, Cube, Lightning, Plus } from "phosphor-svelte";

  let query = $state("");
  let symbols = $derived(
    activeEditorSymbols.language === "javascript" || activeEditorSymbols.language === "typescript"
      ? extractJsTsSymbols(activeEditorSymbols.content)
      : []
  );
  let filtered = $derived(
    symbols.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
  );
</script>

<div class="symbol-panel">
  <div class="panel-header">{t("symbolPanelTitle")}</div>
  <div class="search-box">
    <input
      type="text"
      bind:value={query}
      placeholder={t("symbolPanelSearch")}
    />
  </div>
  {#if filtered.length === 0}
    <div class="empty">{symbols.length === 0 ? t("symbolPanelEmpty") : t("symbolPanelNoResults")}</div>
  {:else}
    <div class="symbol-list">
      {#each filtered as symbol}
        <button class="symbol-item {symbol.type}" onclick={() => requestEditorJump(symbol.line)}>
          {#if symbol.type === "function"}
            <Function size={12} />
          {:else if symbol.type === "class"}
            <Cube size={12} />
          {:else if symbol.type === "arrow"}
            <Lightning size={12} />
          {:else}
            <Plus size={12} />
          {/if}
          <span class="symbol-name">{symbol.name}</span>
          <span class="symbol-line">:{symbol.line}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .symbol-panel {
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 180px;
    background: var(--bg-panel, #1e1e1e);
    border-left: 1px solid var(--border-color, #333);
    overflow: hidden;
  }

  .panel-header {
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted, #888);
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .search-box {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .search-box input {
    width: 100%;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    border-radius: 4px;
    color: var(--text-color, #ccc);
    padding: 3px 6px;
    font-size: 12px;
    outline: none;
  }

  .search-box input:focus {
    border-color: var(--accent-color, #4a9eff);
  }

  .symbol-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }

  .symbol-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 6px;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--text-color, #ccc);
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
  }

  .symbol-item:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .symbol-item.function {
    color: var(--accent-cyan, #00e5ff);
  }

  .symbol-item.class {
    color: var(--accent-warm, #f0a732);
  }

  .symbol-item.arrow {
    color: var(--accent-color, #4a9eff);
  }

  .symbol-item.method {
    color: #c792ea;
  }

  .symbol-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .symbol-line {
    margin-left: auto;
    font-size: 10px;
    color: var(--text-muted, #666);
    flex-shrink: 0;
  }

  .empty {
    padding: 12px;
    font-size: 12px;
    color: var(--text-muted, #888);
    text-align: center;
  }
</style>
