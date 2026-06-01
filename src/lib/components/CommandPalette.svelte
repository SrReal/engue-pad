<script lang="ts">
  import { t } from "$lib/i18n";
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";

  let { rootPath, onSelect, onClose }: {
    rootPath: string;
    onSelect: (path: string) => void;
    onClose: () => void;
  } = $props();

  let query = $state("");
  let files = $state<string[]>([]);
  let selectedIndex = $state(0);
  let listRef = $state<HTMLUListElement | null>(null);
  let inputRef = $state<HTMLInputElement | null>(null);
  let loading = $state(true);

  async function loadFiles() {
    loading = true;
    try {
      files = await invoke<string[]>("list_project_files", { path: rootPath });
    } catch (e) {
      console.error("Failed to list project files:", e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadFiles();
    inputRef?.focus();
  });

  function fileName(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
  }

  function fileDir(path: string): string {
    const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    return idx >= 0 ? path.slice(0, idx) : "";
  }

  function score(path: string, q: string): number {
    const lowerPath = path.toLowerCase();
    const lowerQ = q.toLowerCase();
    const name = fileName(path).toLowerCase();
    if (name === lowerQ) return 1000;
    if (name.startsWith(lowerQ)) return 900;
    if (name.includes(lowerQ)) return 700;
    if (lowerPath.includes(lowerQ)) return 500;
    return 0;
  }

  let filtered = $derived.by(() => {
    const q = query.trim();
    if (!q) return files.slice(0, 50);
    const scored = files
      .map((f) => ({ path: f, s: score(f, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.path.localeCompare(b.path));
    return scored.map((x) => x.path).slice(0, 50);
  });

  $effect(() => {
    const _ = filtered.length;
    selectedIndex = 0;
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
      scrollToSelected();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollToSelected();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const path = filtered[selectedIndex];
      if (path) {
        onSelect(path);
        onClose();
      }
      return;
    }
  }

  function scrollToSelected() {
    const el = listRef?.children[selectedIndex] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleSelect(path: string) {
    onSelect(path);
    onClose();
  }

  function highlight(text: string, q: string): string {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, '<mark>$1</mark>');
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="palette-backdrop" onclick={handleBackdropClick}>
  <div class="palette-modal">
    <input
      class="palette-input"
      type="text"
      bind:this={inputRef}
      bind:value={query}
      placeholder={t("headerSearchPlaceholder")}
      spellcheck="false"
      autocomplete="off"
    />
    {#if loading}
      <div class="palette-empty">{t("loading")}</div>
    {:else if filtered.length === 0}
      <div class="palette-empty">{t("searchNoResults")}</div>
    {:else}
      <ul class="palette-list" bind:this={listRef}>
        {#each filtered as path, i}
          <li
            class="palette-item"
            class:selected={i === selectedIndex}
            onclick={() => handleSelect(path)}
            role="option"
            aria-selected={i === selectedIndex}
          >
            <span class="palette-name">{@html highlight(fileName(path), query)}</span>
            <span class="palette-dir">{fileDir(path)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 7, 18, 0.72);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 9998;
    padding-top: 80px;
  }

  .palette-modal {
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-radius: 10px;
    width: 560px;
    max-width: 90vw;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .palette-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 14px 16px;
    font-size: 15px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .palette-input::placeholder {
    color: var(--text-muted, #888);
  }

  .palette-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow: auto;
    flex: 1;
  }

  .palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color, #ccc);
    transition: background 0.05s;
  }

  .palette-item:hover,
  .palette-item.selected {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .palette-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .palette-name :global(mark) {
    background: transparent;
    color: var(--accent-color, #4a9eff);
    font-weight: 700;
  }

  .palette-dir {
    color: var(--text-muted, #888);
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
    text-align: right;
  }

  .palette-empty {
    padding: 20px;
    text-align: center;
    color: var(--text-muted, #888);
    font-size: 13px;
  }
</style>
