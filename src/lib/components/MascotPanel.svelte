<script lang="ts">
  import { onDestroy } from "svelte";
  import { mascotSettings, mascotState, mascotData, updateMascotSettings } from "$lib/mascot/store.svelte";
  import { playStateSound, speakForState } from "$lib/mascot/sounds";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { saveSettings } from "$lib/workspace/settings";

  let panelRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let dragOffset = { x: 0, y: 0 };
  let frameIndex = $state(0);
  let rafId: number | null = null;
  let lastFrameTime = 0;
  let lastSoundState = "";

  const SIZE_MAP = { small: 96, normal: 160 };

  $effect(() => {
    if (mascotSettings.mode === "animated" && mascotData.pet) {
      startAnimation();
    } else {
      stopAnimation();
    }
    return () => stopAnimation();
  });

  $effect(() => {
    const state = mascotState.currentState;
    if (state === lastSoundState) return;
    lastSoundState = state;
    if (mascotSettings.mode === "disabled") return;
    playStateSound(state);
    speakForState(state);
  });

  function actualFrames(pet: import("$lib/mascot/types").PetInfo, img: HTMLImageElement, row: number): number {
    if (pet.framesPerRow && pet.framesPerRow[row] != null) {
      return pet.framesPerRow[row];
    }
    const perRow = Math.floor(img.naturalWidth / pet.frameWidth);
    return Math.min(pet.framesPerState, perRow);
  }

  function startAnimation() {
    stopAnimation();
    const pet = mascotData.pet;
    const img = mascotData.image;
    if (!pet || !img) return;
    const row = pet.states.indexOf(mascotState.currentState);
    const maxFrames = actualFrames(pet, img, Math.max(0, row));
    const frameDuration = pet.loopMs / maxFrames;
    lastFrameTime = performance.now();

    function tick(now: number) {
      if (!pet || !img) return;
      const currentRow = pet.states.indexOf(mascotState.currentState);
      const max = actualFrames(pet, img, Math.max(0, currentRow));
      const elapsed = now - lastFrameTime;
      if (elapsed >= frameDuration) {
        frameIndex = (frameIndex + 1) % max;
        lastFrameTime = now;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }

  function stopAnimation() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function getBgStyle(): string {
    const pet = mascotData.pet;
    const img = mascotData.image;
    if (!pet || !img) return "";
    const maxRows = Math.min(pet.states.length, Math.floor(img.naturalHeight / pet.frameHeight));
    const row = Math.min(Math.max(0, pet.states.indexOf(mascotState.currentState)), maxRows - 1);
    const rowFrames = actualFrames(pet, img, row);
    const fi = mascotSettings.mode === "animated" ? Math.min(frameIndex, rowFrames - 1) : 0;
    const sx = fi * pet.frameWidth;
    const sy = row * pet.frameHeight;
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
    if (appSettings.mascot) {
      appSettings.mascot.position = mascotSettings.position;
    }
    saveSettings(appSettings);
  }

  onDestroy(() => {
    stopAnimation();
  });
</script>

{#if mascotSettings.enabled && mascotSettings.mode !== "disabled" && mascotData.pet && mascotData.image && mascotData.image.naturalWidth > 0}
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
    image-rendering: pixelated;
  }

  .mascot-panel.dragging {
    cursor: grabbing;
  }

</style>
