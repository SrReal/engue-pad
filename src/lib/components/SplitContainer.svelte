<script lang="ts">
  import type { Split } from "$lib/layout/types";
  import { setSplitRatio, removeNode } from "$lib/layout/store.svelte";
  import LayoutNode from "./LayoutNode.svelte";

  let { node }: { node: Split } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let contextMenu = $state<{ x: number; y: number } | null>(null);

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const ratio =
      node.direction === "horizontal"
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height;
    setSplitRatio(node.id, ratio);
  }

  function onPointerUp() {
    isDragging = false;
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = { x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function handleRemoveSplit() {
    removeNode(node.id);
    closeContextMenu();
  }
</script>

<svelte:window onclick={closeContextMenu} />

<div
  class="split-container"
  class:horizontal={node.direction === "horizontal"}
  class:vertical={node.direction === "vertical"}
  bind:this={containerRef}
>
  <div class="pane" style:flex={node.ratio}>
    <LayoutNode node={node.first} />
  </div>
  <div
    class="divider"
    class:horizontal={node.direction === "horizontal"}
    class:vertical={node.direction === "vertical"}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    oncontextmenu={handleContextMenu}
    role="separator"
    aria-orientation={node.direction}
  ></div>

  {#if contextMenu}
    <div class="context-menu" style:left="{contextMenu.x}px" style:top="{contextMenu.y}px">
      <button onclick={handleRemoveSplit}>Remove split</button>
    </div>
  {/if}
  <div class="pane" style:flex={1 - node.ratio}>
    <LayoutNode node={node.second} />
  </div>
</div>

<style>
  .split-container {
    display: flex;
    width: 100%;
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .split-container.horizontal {
    flex-direction: row;
  }

  .split-container.vertical {
    flex-direction: column;
  }

  .pane {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .divider {
    background: transparent;
    flex-shrink: 0;
  }

  .divider.horizontal {
    width: 8px;
    cursor: col-resize;
  }

  .divider.vertical {
    height: 8px;
    cursor: row-resize;
  }

  .divider:hover {
    background: linear-gradient(
      90deg,
      transparent 3px,
      var(--accent-color, #4a9eff) 3px,
      var(--accent-color, #4a9eff) 5px,
      transparent 5px
    );
  }

  .divider.vertical:hover {
    background: linear-gradient(
      180deg,
      transparent 3px,
      var(--accent-color, #4a9eff) 3px,
      var(--accent-color, #4a9eff) 5px,
      transparent 5px
    );
  }

  .context-menu {
    position: fixed;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 7px;
    padding: 4px 0;
    z-index: 1000;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.44);
  }

  .context-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 16px;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 13px;
  }

  .context-menu button:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }
</style>
