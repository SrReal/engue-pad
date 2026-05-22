<script lang="ts">
  import { open } from "@tauri-apps/plugin-dialog";
  import {
    mascotSettings,
    mascotState,
    mascotData,
    updateMascotSettings,
    setMascotState,
    triggerMascotEvent,
    importMascotFromFolder,
    listInstalledMascots,
    loadMascot,
    deleteMascot,
    type MascotItem,
  } from "$lib/mascot/store.svelte";
  import { playTone, speak } from "$lib/mascot/sounds";
  import type { PetState, EventMapping, VoiceGender, SemanticEvent } from "$lib/mascot/types";
  import type { Dictionary } from "$lib/i18n";
  import { t } from "$lib/i18n";
  import { saveSettings } from "$lib/workspace/settings";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { workspaceInfo } from "$lib/workspace/store.svelte";
  import { saveProjectMascotConfig } from "$lib/mascot/projectStore.svelte";
  import { CaretRight, X } from "phosphor-svelte";

  const STATES: PetState[] = [0, 1, 2, 3, 4, 5, 6, 7];
  const EVENT_LABELS: Record<SemanticEvent, string> = {
    idle: t("eventIdle"),
    waiting_response: t("eventWaitingResponse"),
    task_done: t("eventTaskDone"),
    error: t("eventError"),
    starting_task: t("eventStartingTask"),
    keep_working: t("eventKeepWorking"),
    get_attention: t("eventGetAttention"),
    waiting_command: t("eventWaitingCommand"),
    terminal_closed: t("eventTerminalClosed"),
    terminal_created: t("eventTerminalCreated"),
    panel_split: t("eventPanelSplit"),
    preview_opened: t("eventPreviewOpened"),
    file_renamed: t("eventFileRenamed"),
    image_opened: t("eventImageOpened"),
    audio_opened: t("eventAudioOpened"),
    maximized: t("eventMaximized"),
    restored: t("eventRestored"),
    approval_request: t("eventApprovalRequest"),
  };

  let installedMascots = $state<MascotItem[]>([]);

  let expandedSections = $state<Record<string, boolean>>({
    mascotas: true,
    apariencia: true,
    audio: true,
    voz: true,
    mapeos: false,
    frases: false,
    estados: false,
    manuales: false,
    info: false,
  });

  function toggleSection(key: string) {
    expandedSections[key] = !expandedSections[key];
  }

  $effect(() => {
    listInstalledMascots().then((m) => (installedMascots = m));
  });

  function triggerState(state: PetState) {
    setMascotState(state);
  }

  async function testSound() {
    await playTone(523, 0.2, "sine");
    setTimeout(async () => await playTone(659, 0.2, "sine"), 150);
    setTimeout(async () => await playTone(784, 0.2, "sine"), 300);
  }

  function testVoice() {
    speak("¡Hola! Esto es una prueba de voz.");
  }

  function setMode(mode: "disabled" | "compact" | "animated") {
    updateMascotSettings({ mode });
    saveMascotSettings();
  }

  function setSize(size: "small" | "normal") {
    updateMascotSettings({ size });
    saveMascotSettings();
  }

  function toggleSound() {
    updateMascotSettings({ soundEnabled: !mascotSettings.soundEnabled });
    saveMascotSettings();
  }

  function toggleVoice() {
    updateMascotSettings({ voiceEnabled: !mascotSettings.voiceEnabled });
    saveMascotSettings();
  }

  function setVolume(value: number) {
    updateMascotSettings({ volume: value });
    saveMascotSettings();
  }

  function setVoiceLang(lang: string) {
    updateMascotSettings({ voiceLang: lang });
    saveMascotSettings();
  }

  function setVoiceGender(gender: VoiceGender) {
    updateMascotSettings({ voiceGender: gender });
    saveMascotSettings();
  }

  function setEventMapping(key: SemanticEvent, state: number) {
    const mappings = { ...(mascotSettings.eventMappings ?? {}), [key]: state } as EventMapping;
    updateMascotSettings({ eventMappings: mappings });
    saveMascotSettings();
  }

  function setEventPhrase(key: SemanticEvent, phrase: string) {
    const phrases = { ...(mascotSettings.eventPhrases ?? {}), [key]: phrase };
    updateMascotSettings({ eventPhrases: phrases });
    saveMascotSettings();
  }

  const PHRASE_MAP: Record<SemanticEvent, string> = {
    idle: "phraseIdle",
    waiting_response: "phraseWaitingResponse",
    task_done: "phraseTaskDone",
    error: "phraseError",
    starting_task: "phraseStartingTask",
    keep_working: "phraseKeepWorking",
    get_attention: "phraseWaitingResponse",
    waiting_command: "phraseWaitingCommand",
    terminal_closed: "phraseTerminalClosed",
    terminal_created: "phraseTerminalCreated",
    panel_split: "phrasePanelSplit",
    preview_opened: "phrasePreviewOpened",
    file_renamed: "phraseFileRenamed",
    image_opened: "phraseImageOpened",
    audio_opened: "phraseAudioOpened",
    maximized: "phraseMaximized",
    restored: "phraseRestored",
    approval_request: "phraseApprovalRequest",
  };

  function eventPhrase(key: SemanticEvent): string {
    return mascotSettings.eventPhrases?.[key] ?? t(PHRASE_MAP[key] as keyof Dictionary) ?? "";
  }

  function selectMascot(slug: string) {
    updateMascotSettings({ currentMascot: slug, enabled: true, mode: "animated" });
    loadMascot(slug);
    saveMascotSettings();
  }

  async function importMascot() {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      const slug = await importMascotFromFolder(selected);
      if (slug) {
        installedMascots = await listInstalledMascots();
        selectMascot(slug);
      }
    }
  }

  async function removeMascot(slug: string) {
    await deleteMascot(slug);
    if (mascotSettings.currentMascot === slug) {
      updateMascotSettings({ currentMascot: null, enabled: false });
      saveMascotSettings();
    }
    installedMascots = await listInstalledMascots();
  }

  function saveMascotSettings() {
    const scope = appSettings.mascotScope ?? "global";
    if (scope === "project" && workspaceInfo.rootPath) {
      saveProjectMascotConfig(workspaceInfo.rootPath, { ...mascotSettings });
      return;
    }
    if (appSettings.mascot) {
      Object.assign(appSettings.mascot, { ...mascotSettings });
      saveSettings(appSettings);
    }
  }

  async function setScope(scope: "global" | "project") {
    appSettings.mascotScope = scope;
    await saveSettings(appSettings);
    if (scope === "project" && workspaceInfo.rootPath) {
      await saveProjectMascotConfig(workspaceInfo.rootPath, { ...mascotSettings });
    }
  }

  function currentScope(): "global" | "project" {
    return appSettings.mascotScope === "project" ? "project" : "global";
  }
</script>

<div class="mascot-sidebar">
  <!-- Scope selector -->
  <label class="scope-bar">
    <span class="scope-label">{t("mascotConfig")}</span>
    <select value={currentScope()} onchange={(e) => setScope(e.currentTarget.value as "global" | "project")}>
      <option value="global">{t("mascotScopeGlobal")}</option>
      <option value="project">{t("mascotScopeProject")}</option>
    </select>
  </label>

  <!-- Installed Mascots -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("mascotas")}>
      <span class="section-arrow" class:open={expandedSections["mascotas"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotMascots")}</span>
    </button>
    {#if expandedSections["mascotas"]}
      <div class="mascot-list">
        {#each installedMascots as m}
          <div class="mascot-item" class:active={mascotSettings.currentMascot === m.slug} onclick={() => selectMascot(m.slug)}>
            {#if m.spritesheetUrl}
              <div class="mascot-thumb-wrapper">
                <div class="mascot-thumb" style="background-image: url('{m.spritesheetUrl}'); background-size: {Math.round((m.frameWidth * m.framesPerState) * (48 / m.frameWidth))}px {Math.round((m.frameHeight * m.states.length) * (48 / m.frameWidth))}px; background-position: 0 0; background-repeat: no-repeat;"></div>
              </div>
            {:else}
              <div class="mascot-thumb-wrapper placeholder">?</div>
            {/if}
            <div class="mascot-info">
              <div class="mascot-name">{m.name}</div>
              <button class="btn-delete" onclick={(e) => { e.stopPropagation(); removeMascot(m.slug); }}><X size={14} /></button>
            </div>
          </div>
        {:else}
          <div class="empty">{t("mascotNoMascots")}</div>
        {/each}
      </div>
      <button class="btn-import" onclick={importMascot}>{t("mascotImportFromFolder")}</button>
    {/if}
  </div>

  <!-- Appearance -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("apariencia")}>
      <span class="section-arrow" class:open={expandedSections["apariencia"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotAppearance")}</span>
    </button>
    {#if expandedSections["apariencia"]}
      <div class="field">
        <span>{t("mascotAppearance")}</span>
        <select value={mascotSettings.mode} onchange={(e) => setMode(e.currentTarget.value as "disabled" | "compact" | "animated")}>
          <option value="disabled">{t("mascotDisabled")}</option>
          <option value="compact">{t("mascotCompact")}</option>
          <option value="animated">{t("mascotAnimated")}</option>
        </select>
      </div>
      <div class="row size-row">
        <button class="btn" class:active={mascotSettings.size === "small"} onclick={() => setSize("small")}>{t("mascotSmall")}</button>
        <button class="btn" class:active={mascotSettings.size === "normal"} onclick={() => setSize("normal")}>{t("mascotNormal")}</button>
      </div>
    {/if}
  </div>

  <!-- Audio -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("audio")}>
      <span class="section-arrow" class:open={expandedSections["audio"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotAudio")}</span>
    </button>
    {#if expandedSections["audio"]}
      <div class="row test-row">
        <button class="btn test-btn" onclick={testSound}>{t("mascotTestSound")}</button>
        <button class="btn test-btn" onclick={testVoice}>{t("mascotTestVoice")}</button>
      </div>
      <div class="row check-row">
        <label class="check-label">
          <input type="checkbox" checked={mascotSettings.soundEnabled} onchange={toggleSound} />
          {t("mascotSound")}
        </label>
        <label class="check-label">
          <input type="checkbox" checked={mascotSettings.voiceEnabled} onchange={toggleVoice} />
          {t("mascotVoice")}
        </label>
      </div>
      <div class="field">
        <span>{t("mascotVolume")}</span>
        <input
          class="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={mascotSettings.volume}
          style="--value: {mascotSettings.volume * 100}%"
          oninput={(e) => setVolume(+e.currentTarget.value)}
        />
        <span class="value">{Math.round(mascotSettings.volume * 100)}%</span>
      </div>
    {/if}
  </div>

  <!-- Voice -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("voz")}>
      <span class="section-arrow" class:open={expandedSections["voz"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotVoice")}</span>
    </button>
    {#if expandedSections["voz"]}
      <div class="field">
        <span>{t("mascotLanguage")}</span>
        <select value={mascotSettings.voiceLang} onchange={(e) => setVoiceLang(e.currentTarget.value)}>
          <option value="es-ES">Español</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <div class="field">
        <span>{t("mascotTone")}</span>
        <select value={mascotSettings.voiceGender} onchange={(e) => setVoiceGender(e.currentTarget.value as VoiceGender)}>
          <option value="male">{t("mascotGenderMan")}</option>
          <option value="female">{t("mascotGenderWoman")}</option>
          <option value="boy">{t("mascotGenderBoy")}</option>
          <option value="girl">{t("mascotGenderGirl")}</option>
        </select>
      </div>
    {/if}
  </div>

  <!-- Event Mappings -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("mapeos")}>
      <span class="section-arrow" class:open={expandedSections["mapeos"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotEventMappings")}</span>
    </button>
    {#if expandedSections["mapeos"]}
      {#each Object.entries(EVENT_LABELS) as [key, label]}
        <div class="field">
          <span>{label}</span>
          <select value={mascotSettings.eventMappings?.[key as SemanticEvent] ?? 0} onchange={(e) => setEventMapping(key as SemanticEvent, Number(e.currentTarget.value))}>
            {#each STATES as s}
              <option value={s}>{t("mascotRow")} {s}</option>
            {/each}
          </select>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Event Phrases -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("frases")}>
      <span class="section-arrow" class:open={expandedSections["frases"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotPhrases")}</span>
    </button>
    {#if expandedSections["frases"]}
      {#each Object.entries(EVENT_LABELS) as [key, label]}
        <div class="field phrase-field">
          <span>{label}</span>
          <input type="text" value={eventPhrase(key as SemanticEvent)} onchange={(e) => setEventPhrase(key as SemanticEvent, e.currentTarget.value)} placeholder={t("mascotNoPhrase")} />
        </div>
      {/each}
    {/if}
  </div>

  <!-- Manual States -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("manuales")}>
      <span class="section-arrow" class:open={expandedSections["manuales"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotManualStates")}</span>
    </button>
    {#if expandedSections["manuales"]}
      <div class="btn-grid">
        {#each STATES as state}
          <button class="btn state-btn" class:active={mascotState.currentState === state} onclick={() => triggerState(state)}>
            {t("mascotRow")} {state}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Info -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("info")}>
      <span class="section-arrow" class:open={expandedSections["info"]}><CaretRight size={12} /></span>
      <span class="section-title">{t("mascotInfo")}</span>
    </button>
    {#if expandedSections["info"]}
      {#if mascotData.pet}
        <div class="info-row"><span>{t("mascotName")}</span> {mascotData.pet.name}</div>
        <div class="info-row"><span>{t("mascotFrame")}</span> {mascotData.pet.frameWidth}x{mascotData.pet.frameHeight}</div>
        <div class="info-row"><span>{t("mascotFramesPerState")}</span> {mascotData.pet.framesPerState}</div>
        <div class="info-row"><span>{t("mascotFramesPerRow")}</span> {mascotData.pet.framesPerRow?.join(", ") ?? "N/A"}</div>
        <div class="info-row"><span>{t("mascotLoop")}</span> {mascotData.pet.loopMs}ms</div>
      {:else}
        <div class="info-row muted">{t("mascotNoMascotLoaded")}</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .mascot-sidebar {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 12px;
    font-size: 13px;
    overflow: auto;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .section:last-child {
    border-bottom: none;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-align: left;
  }

  .section-header:hover {
    color: var(--text-color, #ccc);
  }

  .section-arrow {
    font-size: 10px;
    transition: transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
  }

  .section-arrow.open {
    transform: rotate(90deg);
  }

  .section-title {
    font-size: 12px;
    text-transform: uppercase;
    color: inherit;
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  .mascot-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow: auto;
  }

  .mascot-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .mascot-item:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .mascot-item.active {
    background: var(--accent-soft, rgba(74, 158, 255, 0.12));
    border-color: var(--accent-color, #4a9eff);
  }

  .mascot-thumb-wrapper {
    width: 48px;
    height: 48px;
    overflow: hidden;
    border-radius: 4px;
    background: var(--bg-panel, #1e1e1e);
    flex-shrink: 0;
  }

  .mascot-thumb-wrapper.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted, #888);
    font-size: 14px;
  }

  .mascot-thumb {
    width: 48px;
    height: 48px;
    display: block;
  }

  .mascot-info {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .mascot-name {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-delete {
    background: transparent;
    border: 1px solid transparent;
    color: var(--error-color, #c75450);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
    border-radius: 5px;
  }

  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.35);
  }

  .btn-import {
    background: var(--accent-color, #4a9eff);
    border: none;
    color: white;
    min-height: 34px;
    padding: 7px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
  }

  .btn-import:hover {
    background: var(--accent-hover, #0d8cff);
  }

  .row {
    display: grid;
    gap: 8px;
    width: 100%;
  }

  .size-row,
  .test-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .size-row .btn {
    min-height: 28px;
    padding: 4px 8px;
  }

  .check-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-surface, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    min-height: 34px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    min-width: 0;
    text-align: center;
    white-space: normal;
    overflow-wrap: anywhere;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }

  .btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .btn.active {
    background: var(--accent-color, #4a9eff);
    color: white;
    border-color: var(--accent-color, #4a9eff);
  }

  .test-btn {
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #555);
  }

  .test-btn:hover {
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
    min-height: 34px;
    padding: 0 10px;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    min-width: 0;
  }

  .field {
    display: grid;
    grid-template-columns: minmax(86px, 112px) minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    min-width: 0;
  }

  .field span:first-child {
    color: var(--text-muted, #888);
    min-width: 0;
  }

  .field select,
  .field input[type="text"] {
    background-color: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    min-height: 34px;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 12px;
    min-width: 0;
  }

  .field input[type="range"] {
    flex: 1;
    min-width: 0;
  }

  .volume-slider {
    appearance: none;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      #0ea5ff 0 var(--value),
      rgba(30, 41, 59, 0.92) var(--value) 100%
    );
    accent-color: #0ea5ff;
  }

  .volume-slider::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #0ea5ff;
    border: 2px solid #0b1220;
    box-shadow: 0 0 0 1px rgba(14, 165, 255, 0.45);
  }

  .volume-slider::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: rgba(30, 41, 59, 0.92);
  }

  .volume-slider::-moz-range-progress {
    height: 6px;
    border-radius: 999px;
    background: #0ea5ff;
  }

  .volume-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #0ea5ff;
    border: 2px solid #0b1220;
    box-shadow: 0 0 0 1px rgba(14, 165, 255, 0.45);
  }

  .phrase-field span {
    color: var(--text-muted, #888);
  }

  .field .value {
    width: 36px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .btn-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .state-btn.active {
    background: var(--accent-soft, rgba(74, 158, 255, 0.2));
    border-color: var(--accent-color, #4a9eff);
    color: var(--accent-color, #4a9eff);
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

  .empty {
    color: var(--text-muted, #888);
    text-align: center;
    padding: 8px;
    font-size: 12px;
  }

  .scope-bar {
    display: grid;
    grid-template-columns: minmax(76px, auto) minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    background: var(--bg-tab-bar, #252526);
  }

  .scope-label {
    font-size: 11px;
    color: var(--text-muted, #888);
    min-width: 0;
  }

  .scope-bar select {
    width: 100%;
    min-width: 0;
    min-height: 34px;
    background-color: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 12px;
  }
</style>
