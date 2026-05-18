<script lang="ts">
  import { onDestroy } from "svelte";
  import { mascotSettings, mascotState, mascotData, updateMascotSettings } from "$lib/mascot/store.svelte";
  import { playStateSound, speakForState } from "$lib/mascot/sounds";

  let panelRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let frameIndex = $state(0);
  let animTimer = $state<ReturnType<typeof setInterval> | null>(null);

  const SIZE_MAP = { small: 96, normal: 160 };

  $effect(() => {
    const state = mascotState.currentState;
    if (mascotSettings.mode === "disabled") return;
    playStateSound(state);
    speakForState(state);
    if (mascotSettings.mode === "animated" && mascotData.pet) {
      startAnimation();
    }
    return () => stopAnimation();
  });

  function startAnimation() {
    stopAnimation();
    if (!mascotData.pet) return;
    const ms = mascotData.pet.loopMs / mascotData.pet.framesPerState;
    animTimer = setInterval(() => {
      frameIndex = (frameIndex + 1) % mascotData.pet.framesPerState;
    }, ms);
  }

  function stopAnimation() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }

  function getBgStyle(): string {
    const pet = mascotData.pet;
    const img = mascotData.image;
    if (!pet || !img) return "";
    const row = pet.states.indexOf(mascotState.currentState);
    const fi = mascotSettings.mode === "animated" ? frameIndex : 0;
    const sx = fi * pet.frameWidth;
    const sy = Math.max(0, row) * pet.frameHeight;
    const size = SIZE_MAP[mascotSettings.size];
    const scaleX = size / pet.frameWidth;
    const scaleY = size / pet.frameHeight;
    return `background-image: url('${img.src}'); background-size: ${img.naturalWidth * scaleX}px ${img.naturalHeight * scaleY}px; background-position: -${sx * scaleX}px -${sy * scaleY}px;`;
  }

  function onPointerDown(e: PointerEvent) {
    if (!panelRef) return;
    isDragging = true;
    dragOffset = { x: e.clientX - (mascotSettings.position?.x ?? 0), y: e.clientY - (mascotSettings.position?.y ?? 0) };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
  }

  function onWindowPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    updateMascotSettings({ position: { x, y } });
  }

  function onWindowPointerUp() {
    isDragging = false;
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
  }

  onDestroy(() => {
    stopAnimation();
  });
</script>

{#if mascotSettings.enabled && mascotSettings.mode !== "disabled" && mascotData.pet && mascotData.image}
  <div
    class="mascot-panel"
    class:dragging={isDragging}
    bind:this={panelRef}
    style:left="{mascotSettings.position?.x ?? 20}px"
    style:top="{mascotSettings.position?.y ?? 20}px"
    style:width="{SIZE_MAP[mascotSettings.size]}px"
    style:height="{SIZE_MAP[mascotSettings.size]}px"
    style={getBgStyle()}
    onpointerdown={onPointerDown}
    role="img"
    aria-label="Mascota {mascotData.pet.name}"
  >
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
    background-repeat: no-repeat;
    border-radius: 8px;
  }

  .mascot-panel.dragging {
    cursor: grabbing;
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
