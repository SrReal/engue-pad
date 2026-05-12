<script lang="ts">
  import type { Split } from "$lib/layout/types";
  import { setSplitRatio } from "$lib/layout/store.svelte";
  import LayoutNode from "./LayoutNode.svelte";

  let { node }: { node: Split } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);

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
</script>

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
    role="separator"
    aria-orientation={node.direction}
  ></div>
  <div class="pane" style:flex={1 - node.ratio}>
    <LayoutNode node={node.second} />
  </div>
</div>

<style>
  .split-container {
    display: flex;
    width: 100%;
    height: 100%;
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
  }

  .divider {
    background: var(--border-color, #333);
    flex-shrink: 0;
  }

  .divider.horizontal {
    width: 4px;
    cursor: col-resize;
  }

  .divider.vertical {
    height: 4px;
    cursor: row-resize;
  }

  .divider:hover {
    background: var(--accent-color, #4a9eff);
  }
</style>
