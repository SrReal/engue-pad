<script lang="ts">
  import { onMount } from "svelte";

  let { children } = $props();

  onMount(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  });
</script>

{@render children()}

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  :global(input, textarea, .cm-editor, .xterm, [contenteditable]) {
    user-select: text;
    -webkit-user-select: text;
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
</style>
