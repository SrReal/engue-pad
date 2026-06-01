<script lang="ts">
  import { mascotSettings, mascotState, mascotData, updateMascotSettings, setMascotState } from "$lib/mascot/store.svelte";
  import { playTone, speak } from "$lib/mascot/sounds";
  import { t } from "$lib/i18n";
  import type { PetState } from "$lib/mascot/types";

  const STATES: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

  function triggerState(state: number) {
    setMascotState(state);
  }

  function testSound() {
    playTone(523, 0.2, "sine");
    setTimeout(() => playTone(659, 0.2, "sine"), 150);
    setTimeout(() => playTone(784, 0.2, "sine"), 300);
  }

  function testVoice() {
    speak(t("mascotTestVoicePhrase"));
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
    <h3>{t("mascotStates")}</h3>
    <div class="btn-grid">
      {#each STATES as state}
        <button class="btn state-btn" class:active={mascotState.currentState === state} onclick={() => triggerState(state)}>
          {t("mascotRow")} {state}
        </button>
      {/each}
    </div>
  </div>

  <div class="section">
    <h3>{t("mascotAudio")}</h3>
    <div class="row">
      <button class="btn" onclick={testSound}>{t("mascotTestSound")}</button>
      <button class="btn" onclick={testVoice}>{t("mascotTestVoice")}</button>
    </div>
    <div class="row">
      <label class="check-label">
        <input type="checkbox" checked={mascotSettings.soundEnabled} onchange={toggleSound} />
        {t("mascotSound")}
      </label>
      <label class="check-label">
        <input type="checkbox" checked={mascotSettings.voiceEnabled} onchange={toggleVoice} />
        {t("mascotVoice")}
      </label>
    </div>
  </div>

  <div class="section">
    <h3>{t("mascotMode")}</h3>
    <div class="row">
      <button class="btn" class:active={mascotSettings.mode === "disabled"} onclick={() => setMode("disabled")}>{t("mascotDisabled")}</button>
      <button class="btn" class:active={mascotSettings.mode === "compact"} onclick={() => setMode("compact")}>{t("mascotCompact")}</button>
      <button class="btn" class:active={mascotSettings.mode === "animated"} onclick={() => setMode("animated")}>{t("mascotAnimated")}</button>
    </div>
  </div>

  <div class="section">
    <h3>{t("mascotSize")}</h3>
    <div class="row">
      <button class="btn" class:active={mascotSettings.size === "small"} onclick={() => setSize("small")}>{t("mascotSmall")}</button>
      <button class="btn" class:active={mascotSettings.size === "normal"} onclick={() => setSize("normal")}>{t("mascotNormal")}</button>
    </div>
  </div>

  <div class="section">
    <h3>{t("mascotInfo")}</h3>
    {#if mascotData.pet}
      <div class="info-row"><span>{t("mascotName")}</span> {mascotData.pet.name}</div>
      <div class="info-row"><span>{t("mascotSlug")}</span> {mascotData.pet.slug}</div>
      <div class="info-row"><span>{t("mascotFrame")}</span> {mascotData.pet.frameWidth}x{mascotData.pet.frameHeight}</div>
      <div class="info-row"><span>{t("mascotFramesPerState")}</span> {mascotData.pet.framesPerState}</div>
      <div class="info-row"><span>{t("mascotFramesPerRow")}</span> {mascotData.pet.framesPerRow?.join(", ") ?? t("mascotNa")}</div>
      <div class="info-row"><span>{t("mascotLoop")}</span> {mascotData.pet.loopMs}ms</div>
      <div class="info-row"><span>{t("mascotStates")}</span> {mascotData.pet.states.join(", ")}</div>
    {:else}
      <div class="info-row muted">{t("mascotNoMascotLoaded")}</div>
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
