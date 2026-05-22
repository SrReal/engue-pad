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
    --accent-color: #4a9eff;
    --bg-app: #1a1a1a;
    --bg-panel: #1e1e1e;
    --bg-sidebar: #252526;
    --bg-tab: #2d2d2d;
    --bg-tab-bar: #252526;
    --bg-tab-close-hover: #c75450;
    --bg-tab-hover: #3d3d3d;
    --border-color: #333;
    --text-color: #ccc;
    --text-muted: #888;
    --app-zoom: 1;
    --app-ui-font-size: 13px;
  }

  :global(body.theme-light) {
    --accent-color: #0066cc;
    --bg-app: #f0f0f0;
    --bg-panel: #ffffff;
    --bg-sidebar: #f5f5f5;
    --bg-tab: #e8e8e8;
    --bg-tab-bar: #f5f5f5;
    --bg-tab-close-hover: #c75450;
    --bg-tab-hover: #e0e0e0;
    --border-color: #ddd;
    --text-color: #333;
    --text-muted: #666;
  }
</style>
