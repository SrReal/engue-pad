<script lang="ts">
  import { onMount } from "svelte";
  import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

  let { children } = $props();

  let menuOpen = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let menuCanCut = $state(false);
  let menuCanCopy = $state(false);
  let menuCanPaste = $state(false);
  let menuTargetEl = $state<HTMLElement | null>(null);

  function isEditable(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") return true;
    if (el.isContentEditable) return true;
    if (el.closest(".cm-editor")) return true;
    return false;
  }

  function hasSelection(): boolean {
    const sel = window.getSelection();
    return !!sel && sel.toString().trim().length > 0;
  }

  async function handlePaste() {
    const target = menuTargetEl;
    if (!target) return;
    const editorEl = target.closest(".cm-editor") as HTMLElement | null;
    const active = editorEl || target;
    try {
      const text = await readText();
      if (!text) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        const start = active.selectionStart ?? 0;
        const end = active.selectionEnd ?? 0;
        const value = active.value;
        active.value = value.slice(0, start) + text + value.slice(end);
        active.selectionStart = active.selectionEnd = start + text.length;
        active.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        active.focus();
        document.execCommand("insertText", false, text);
      }
    } catch (e) {
      console.error("Paste failed:", e);
    }
    menuOpen = false;
  }

  async function handleCopy() {
    try {
      const sel = window.getSelection()?.toString() ?? "";
      if (sel) await writeText(sel);
    } catch {
      document.execCommand("copy");
    }
    menuOpen = false;
  }

  async function handleCut() {
    try {
      const sel = window.getSelection()?.toString() ?? "";
      if (sel) {
        await writeText(sel);
        document.execCommand("delete");
      }
    } catch {
      document.execCommand("cut");
    }
    menuOpen = false;
  }

  onMount(() => {
    const ctxHandler = (e: MouseEvent) => {
      const editable = isEditable(e.target);
      const selection = hasSelection();
      // If no text selected and not editable, silently block the native menu
      if (!selection && !editable) {
        e.preventDefault();
        menuOpen = false;
        return;
      }
      e.preventDefault();
      menuX = e.clientX;
      menuY = e.clientY;
      menuCanCut = editable && selection;
      menuCanCopy = selection;
      menuCanPaste = editable;
      menuTargetEl = e.target as HTMLElement;
      menuOpen = true;
    };

    const clickHandler = () => {
      menuOpen = false;
    };

    window.addEventListener("contextmenu", ctxHandler);
    window.addEventListener("click", clickHandler);
    return () => {
      window.removeEventListener("contextmenu", ctxHandler);
      window.removeEventListener("click", clickHandler);
    };
  });
</script>

{@render children()}

{#if menuOpen}
  <div class="global-context-menu" style:left="{menuX}px" style:top="{menuY}px">
    {#if menuCanCut}
      <button onclick={handleCut}>Cortar</button>
    {/if}
    {#if menuCanCopy}
      <button onclick={handleCopy}>Copiar</button>
    {/if}
    {#if menuCanPaste}
      <button onclick={handlePaste}>Pegar</button>
    {/if}
  </div>
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @font-face {
    font-family: "Inter";
    src: url("/fonts/InterVariable.ttf") format("truetype");
    font-weight: 100 900;
    font-display: swap;
  }

  @font-face {
    font-family: "Inter";
    src: url("/fonts/InterVariable-Italic.ttf") format("truetype");
    font-weight: 100 900;
    font-style: italic;
    font-display: swap;
  }

  :global(body) {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px;
    overflow: hidden;
  }

  :global(::selection) {
    background: rgba(14, 165, 255, 0.35);
  }

  /* CodeMirror selection highlight - override oneDark theme */
  :global(.cm-content ::selection) {
    background: rgba(14, 165, 255, 0.35) !important;
  }
  :global(.cm-selectionBackground) {
    background: rgba(14, 165, 255, 0.25) !important;
  }
  :global(.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground) {
    background: rgba(14, 165, 255, 0.4) !important;
  }
  :global(.cm-cursor) {
    border-left-color: var(--accent-color, #0ea5ff) !important;
  }
  /* xterm selection */
  :global(.xterm-selection div) {
    background: rgba(14, 165, 255, 0.35) !important;
  }

  :global(.tab-bar, .panel-actions, .app-header, .status-bar,
    .context-menu, .global-context-menu, .drag-ghost, .drop-overlay,
    .tree-item, button, [role="tab"], [role="toolbar"]) {
    user-select: none;
    -webkit-user-select: none;
  }

  :global(:root) {
    --accent-color: #0ea5ff;
    --accent-hover: #0d8cff;
    --accent-cyan: #00e5ff;
    --accent-soft: rgba(14, 165, 255, 0.14);
    --bg-app: #07111f;
    --bg-panel: #0b1422;
    --bg-sidebar: #0e1622;
    --bg-surface: #111827;
    --bg-tab: #101b2a;
    --bg-tab-bar: #0b1220;
    --bg-tab-close-hover: #ef4444;
    --bg-tab-hover: #172438;
    --border-color: #2a3342;
    --border-strong: #334155;
    --text-color: #f1f5f9;
    --text-muted: #94a3b8;
    --text-subtle: #64748b;
    --success-color: #22c55e;
    --warning-color: #f59e0b;
    --error-color: #ef4444;
    --app-zoom: 1;
    --app-ui-font-size: 13px;
  }

  :global(body.theme-light) {
    --accent-color: #0d8cff;
    --accent-hover: #0a73d9;
    --accent-cyan: #00c7dd;
    --accent-soft: rgba(13, 140, 255, 0.12);
    --bg-app: #f1f5f9;
    --bg-panel: #ffffff;
    --bg-sidebar: #f8fafc;
    --bg-surface: #ffffff;
    --bg-tab: #f1f5f9;
    --bg-tab-bar: #e2e8f0;
    --bg-tab-close-hover: #ef4444;
    --bg-tab-hover: #e2e8f0;
    --border-color: #cbd5e1;
    --border-strong: #94a3b8;
    --text-color: #0b1220;
    --text-muted: #475569;
    --text-subtle: #64748b;
    --success-color: #16a34a;
    --warning-color: #d97706;
    --error-color: #dc2626;
  }

  :global(input:not([type="checkbox"]):not([type="range"]),
    select,
    textarea) {
    background-color: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #2a3342);
    border-radius: 6px;
    color: var(--text-color, #f1f5f9);
    font: inherit;
    min-height: 28px;
    outline: none;
    padding: 5px 9px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    transition: border-color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease;
  }

  :global(select) {
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--text-muted, #94a3b8) 50%),
      linear-gradient(135deg, var(--text-muted, #94a3b8) 50%, transparent 50%);
    background-position:
      calc(100% - 15px) 50%,
      calc(100% - 10px) 50%;
    background-repeat: no-repeat;
    background-size: 5px 5px, 5px 5px;
    padding-right: 30px;
  }

  :global(input:not([type="checkbox"]):not([type="range"]):hover,
    select:hover,
    textarea:hover) {
    border-color: var(--border-strong, #334155);
  }

  :global(input:not([type="checkbox"]):not([type="range"]):focus,
    select:focus,
    textarea:focus) {
    border-color: var(--accent-color, #0ea5ff);
    box-shadow: 0 0 0 2px rgba(14, 165, 255, 0.18);
  }

  :global(input[type="checkbox"]) {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid var(--border-strong, #334155);
    border-radius: 4px;
    background: var(--bg-surface, #111827);
    cursor: pointer;
    display: inline-grid;
    place-content: center;
    flex-shrink: 0;
  }

  :global(input[type="checkbox"]::before) {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 2px;
    transform: scale(0);
    transition: transform 0.1s ease;
    background: var(--accent-cyan, #00e5ff);
  }

  :global(input[type="checkbox"]:checked) {
    border-color: var(--accent-color, #0ea5ff);
    background: rgba(14, 165, 255, 0.18);
  }

  :global(input[type="checkbox"]:checked::before) {
    transform: scale(1);
  }

  :global(input[type="range"]) {
    accent-color: var(--accent-color, #0ea5ff);
  }

  .global-context-menu {
    position: fixed;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #2a3342);
    border-radius: 7px;
    padding: 4px 0;
    z-index: 10000;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.44);
    min-width: 140px;
  }

  .global-context-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 7px 16px;
    background: none;
    border: none;
    color: var(--text-color, #f1f5f9);
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }

  .global-context-menu button:hover {
    background: var(--bg-tab-hover, #172438);
  }
</style>
