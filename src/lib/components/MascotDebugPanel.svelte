<script lang="ts">
  import { mascotSettings, mascotState, mascotData, updateMascotSettings, setMascotState } from "$lib/mascot/store.svelte";
  import { playTone, speak } from "$lib/mascot/sounds";
  import type { PetState } from "$lib/mascot/types";

  const STATES: PetState[] = ["idle", "wave", "run", "failed", "review", "jump", "extra1", "extra2"];

  function triggerState(state: PetState) {
    setMascotState(state);
  }

  function testSound() {
    playTone(523, 0.2, "sine");
    setTimeout(() => playTone(659, 0.2, "sine"), 150);
    setTimeout(() => playTone(784, 0.2, "sine"), 300);
  }

  function testVoice() {
    speak("¡Hola! Esto es una prueba de voz.");
  }

  function setMode(mode: "disabled" | "compact" | "animated") {
    updateMascotSettings({ mode });
  }

  function setSize(size: "small" | "normal") {
    updateMascotSettings({ size });
  }

  function toggleSound() {
    updateMascotSettings({ soundEnabled: !mascotSettings.soundEnabled });
  }

  function toggleVoice() {
    updateMascotSettings({ voiceEnabled: !mascotSettings.voiceEnabled });
  }
</script>

<div class="debug-panel">
  <div class="section">
    <h3>Estados</h3>
    <div class="btn-grid">
      {#each STATES as state}
        <button class="btn state-btn" class:active={mascotState.currentState === state} onclick={() => triggerState(state)}>
          {state}
        </button>
      {/each}
    </div>
  </div>

  <div class="section">
    <h3>Audio</h3>
    <div class="row">
      <button class="btn" onclick={testSound}>Probar sonido</button>
      <button class="btn" onclick={testVoice}>Probar voz</button>
    </div>
    <div class="row">
      <label class="check-label">
        <input type="checkbox" checked={mascotSettings.soundEnabled} onchange={toggleSound} />
        Sonido
      </label>
      <label class="check-label">
        <input type="checkbox" checked={mascotSettings.voiceEnabled} onchange={toggleVoice} />
        Voz
      </label>
    </div>
  </div>

  <div class="section">
    <h3>Modo</h3>
    <div class="row">
      <button class="btn" class:active={mascotSettings.mode === "disabled"} onclick={() => setMode("disabled")}>Disabled</button>
      <button class="btn" class:active={mascotSettings.mode === "compact"} onclick={() => setMode("compact")}>Compact</button>
      <button class="btn" class:active={mascotSettings.mode === "animated"} onclick={() => setMode("animated")}>Animated</button>
    </div>
  </div>

  <div class="section">
    <h3>Tamaño</h3>
    <div class="row">
      <button class="btn" class:active={mascotSettings.size === "small"} onclick={() => setSize("small")}>Small</button>
      <button class="btn" class:active={mascotSettings.size === "normal"} onclick={() => setSize("normal")}>Normal</button>
    </div>
  </div>

  <div class="section">
    <h3>Info</h3>
    {#if mascotData.pet}
      <div class="info-row"><span>Nombre:</span> {mascotData.pet.name}</div>
      <div class="info-row"><span>Slug:</span> {mascotData.pet.slug}</div>
      <div class="info-row"><span>Frame:</span> {mascotData.pet.frameWidth}x{mascotData.pet.frameHeight}</div>
      <div class="info-row"><span>Frames/estado:</span> {mascotData.pet.framesPerState}</div>
      <div class="info-row"><span>Frames por fila:</span> {mascotData.pet.framesPerRow?.join(", ") ?? "N/A"}</div>
      <div class="info-row"><span>Loop:</span> {mascotData.pet.loopMs}ms</div>
      <div class="info-row"><span>Estados:</span> {mascotData.pet.states.join(", ")}</div>
    {:else}
      <div class="info-row muted">Ninguna mascota cargada</div>
    {/if}
  </div>
</div>

<style>
  .debug-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 12px;
    font-size: 13px;
  }

  .section h3 {
    margin: 0 0 8px;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--text-muted, #888);
    letter-spacing: 0.5px;
  }

  .btn-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .btn {
    background: var(--bg-tab, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    flex: 1;
    min-width: 0;
  }

  .btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .btn.active {
    background: var(--accent-color, #4a9eff);
    color: white;
    border-color: var(--accent-color, #4a9eff);
  }

  .state-btn.active {
    background: rgba(74, 158, 255, 0.2);
    border-color: var(--accent-color, #4a9eff);
    color: var(--accent-color, #4a9eff);
  }

  .check-label {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-color, #ccc);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px solid var(--border-color, #333);
    font-size: 12px;
  }

  .info-row span {
    color: var(--text-muted, #888);
  }

  .info-row.muted {
    color: var(--text-muted, #888);
    justify-content: center;
    border: none;
    padding: 8px 0;
  }
</style>
