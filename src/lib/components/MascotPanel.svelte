<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { mascotSettings, mascotState, mascotPet, mascotImage, updateMascotSettings, setMascotState } from "$lib/mascot/store.svelte";
  import { createAnimationEngine } from "$lib/mascot/animation";
  import { playStateSound, speakForState } from "$lib/mascot/sounds";
  import type { PetState } from "$lib/mascot/types";

  let panelRef = $state<HTMLDivElement | null>(null);
  let canvasRef = $state<HTMLCanvasElement | null>(null);
  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let engine = createAnimationEngine();

  const SIZE_MAP = { small: 96, normal: 160 };

  $effect(() => {
    const pet = mascotPet;
    const img = mascotImage;
    const mode = mascotSettings.mode;
    const canvas = canvasRef;
    if (!pet || !img || !canvas || mode === "disabled") {
      engine.stop();
      return;
    }
    if (mode === "animated" && img.complete) {
      canvas.width = SIZE_MAP[mascotSettings.size];
      canvas.height = SIZE_MAP[mascotSettings.size];
      engine.start(canvas, pet, img);
    } else if (mode === "compact" && img.complete) {
      canvas.width = SIZE_MAP[mascotSettings.size];
      canvas.height = SIZE_MAP[mascotSettings.size];
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, pet.frameHeight, pet.frameWidth, pet.frameHeight, 0, 0, canvas.width, canvas.height);
      }
    }
    return () => engine.stop();
  });

  $effect(() => {
    const state = mascotState.currentState;
    if (mascotSettings.mode === "disabled") return;
    engine.setState(state);
    playStateSound(state);
    speakForState(state);
  });

  function onPointerDown(e: PointerEvent) {
    if (!panelRef) return;
    isDragging = true;
    dragOffset = { x: e.clientX - (mascotSettings.position?.x ?? 20), y: e.clientY - (mascotSettings.position?.y ?? 20) };
    panelRef.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    updateMascotSettings({ position: { x, y } });
  }

  function onPointerUp() {
    isDragging = false;
  }

  onMount(() => {
    if (!mascotSettings.position) {
      updateMascotSettings({ position: { x: window.innerWidth - 200, y: window.innerHeight - 220 } });
    }
  });

  onDestroy(() => {
    engine.stop();
  });
</script>

{#if mascotSettings.enabled && mascotSettings.mode !== "disabled" && mascotPet}
  <div
    class="mascot-panel"
    class:dragging={isDragging}
    bind:this={panelRef}
    style:left="{mascotSettings.position?.x ?? 20}px"
    style:top="{mascotSettings.position?.y ?? 20}px"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    role="img"
    aria-label="Mascota {mascotPet.name}"
  >
    <canvas bind:this={canvasRef}></canvas>
    {#if mascotSettings.mode === "animated"}
      <div class="state-badge">{mascotState.currentState}</div>
    {/if}
  </div>
{/if}

<style>
  .mascot-panel {
    position: fixed;
    z-index: 9998;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: auto;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  }

  .mascot-panel.dragging {
    cursor: grabbing;
  }

  .mascot-panel canvas {
    display: block;
    border-radius: 8px;
  }

  .state-badge {
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-sidebar, #252526);
    color: var(--text-muted, #888);
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--border-color, #333);
    white-space: nowrap;
    pointer-events: none;
  }
</style>
