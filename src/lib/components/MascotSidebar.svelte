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
  import { DEFAULT_EVENT_PHRASES } from "$lib/mascot/types";
  import { saveSettings } from "$lib/workspace/settings";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { workspaceInfo } from "$lib/workspace/store.svelte";
  import { saveProjectMascotConfig } from "$lib/mascot/projectStore.svelte";
  import { CaretRight, X } from "phosphor-svelte";

  const STATES: PetState[] = [0, 1, 2, 3, 4, 5, 6, 7];
  const EVENT_LABELS: Record<SemanticEvent, string> = {
    idle: "Idle",
    esperando_respuesta: "Esperando respuesta",
    aviso_fin_tarea: "Aviso fin tarea",
    error: "Error",
    iniciando_tarea: "Iniciando tarea",
    continuo_trabajando: "Continuo trabajando",
    llamar_atencion: "Llamar atención",
    esperando_comando: "Esperando comando",
    terminal_cerrado: "Terminal cerrado",
    terminal_creado: "Terminal creado",
    panel_dividido: "Panel dividido",
    preview_abierto: "Preview abierto",
    archivo_renombrado: "Archivo renombrado",
    imagen_abierta: "Imagen abierta",
    audio_abierto: "Audio abierto",
    maximizado: "Maximizado",
    restaurado: "Restaurado",
    approval_request: "Solicitud de aprobación",
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

  function eventPhrase(key: SemanticEvent): string {
    return mascotSettings.eventPhrases?.[key] ?? DEFAULT_EVENT_PHRASES[key] ?? "";
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
</script>

<div class="mascot-sidebar">
  <!-- Scope selector -->
  <div class="scope-bar">
    <span class="scope-label">Configuración:</span>
    <button class="scope-btn" class:active={appSettings.mascotScope !== "project"} onclick={() => setScope("global")} type="button">Global</button>
    <button class="scope-btn" class:active={appSettings.mascotScope === "project"} onclick={() => setScope("project")} type="button">Este proyecto</button>
  </div>

  <!-- Installed Mascots -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("mascotas")}>
      <span class="section-arrow" class:open={expandedSections["mascotas"]}><CaretRight size={12} /></span>
      <span class="section-title">Mascotas</span>
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
          <div class="empty">Ninguna mascota instalada</div>
        {/each}
      </div>
      <button class="btn-import" onclick={importMascot}>Importar desde carpeta</button>
    {/if}
  </div>

  <!-- Appearance -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("apariencia")}>
      <span class="section-arrow" class:open={expandedSections["apariencia"]}><CaretRight size={12} /></span>
      <span class="section-title">Apariencia</span>
    </button>
    {#if expandedSections["apariencia"]}
      <div class="row">
        <button class="btn" class:active={mascotSettings.mode === "disabled"} onclick={() => setMode("disabled")}>Disabled</button>
        <button class="btn" class:active={mascotSettings.mode === "compact"} onclick={() => setMode("compact")}>Compact</button>
        <button class="btn" class:active={mascotSettings.mode === "animated"} onclick={() => setMode("animated")}>Animated</button>
      </div>
      <div class="row">
        <button class="btn" class:active={mascotSettings.size === "small"} onclick={() => setSize("small")}>Small</button>
        <button class="btn" class:active={mascotSettings.size === "normal"} onclick={() => setSize("normal")}>Normal</button>
      </div>
    {/if}
  </div>

  <!-- Audio -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("audio")}>
      <span class="section-arrow" class:open={expandedSections["audio"]}><CaretRight size={12} /></span>
      <span class="section-title">Audio</span>
    </button>
    {#if expandedSections["audio"]}
      <div class="row">
        <button class="btn test-btn" onclick={testSound}>Probar sonido</button>
        <button class="btn test-btn" onclick={testVoice}>Probar voz</button>
      </div>
      <div class="row check-row">
        <label class="check-label">
          <input type="checkbox" checked={mascotSettings.soundEnabled} onchange={toggleSound} />
          Sonido
        </label>
        <label class="check-label">
          <input type="checkbox" checked={mascotSettings.voiceEnabled} onchange={toggleVoice} />
          Voz
        </label>
      </div>
      <div class="field">
        <span>Volumen</span>
        <input type="range" min="0" max="1" step="0.1" value={mascotSettings.volume} oninput={(e) => setVolume(+e.currentTarget.value)} />
        <span class="value">{Math.round(mascotSettings.volume * 100)}%</span>
      </div>
    {/if}
  </div>

  <!-- Voice -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("voz")}>
      <span class="section-arrow" class:open={expandedSections["voz"]}><CaretRight size={12} /></span>
      <span class="section-title">Voz</span>
    </button>
    {#if expandedSections["voz"]}
      <div class="field">
        <span>Idioma</span>
        <select value={mascotSettings.voiceLang} onchange={(e) => setVoiceLang(e.currentTarget.value)}>
          <option value="es-ES">Español</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <div class="field">
        <span>Tono</span>
        <select value={mascotSettings.voiceGender} onchange={(e) => setVoiceGender(e.currentTarget.value as VoiceGender)}>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="boy">Niño</option>
          <option value="girl">Niña</option>
        </select>
      </div>
    {/if}
  </div>

  <!-- Event Mappings -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("mapeos")}>
      <span class="section-arrow" class:open={expandedSections["mapeos"]}><CaretRight size={12} /></span>
      <span class="section-title">Mapeos de eventos</span>
    </button>
    {#if expandedSections["mapeos"]}
      {#each Object.entries(EVENT_LABELS) as [key, label]}
        <div class="field">
          <span>{label}</span>
          <select value={mascotSettings.eventMappings?.[key as SemanticEvent] ?? 0} onchange={(e) => setEventMapping(key as SemanticEvent, Number(e.currentTarget.value))}>
            {#each STATES as s}
              <option value={s}>Fila {s}</option>
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
      <span class="section-title">Frases por evento</span>
    </button>
    {#if expandedSections["frases"]}
      {#each Object.entries(EVENT_LABELS) as [key, label]}
        <div class="field phrase-field">
          <span>{label}</span>
          <input type="text" value={eventPhrase(key as SemanticEvent)} onchange={(e) => setEventPhrase(key as SemanticEvent, e.currentTarget.value)} placeholder="Sin frase" />
        </div>
      {/each}
    {/if}
  </div>

  <!-- Manual States -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("manuales")}>
      <span class="section-arrow" class:open={expandedSections["manuales"]}><CaretRight size={12} /></span>
      <span class="section-title">Estados manuales</span>
    </button>
    {#if expandedSections["manuales"]}
      <div class="btn-grid">
        {#each STATES as state}
          <button class="btn state-btn" class:active={mascotState.currentState === state} onclick={() => triggerState(state)}>
            Fila {state}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Info -->
  <div class="section">
    <button class="section-header" onclick={() => toggleSection("info")}>
      <span class="section-arrow" class:open={expandedSections["info"]}><CaretRight size={12} /></span>
      <span class="section-title">Info</span>
    </button>
    {#if expandedSections["info"]}
      {#if mascotData.pet}
        <div class="info-row"><span>Nombre:</span> {mascotData.pet.name}</div>
        <div class="info-row"><span>Frame:</span> {mascotData.pet.frameWidth}x{mascotData.pet.frameHeight}</div>
        <div class="info-row"><span>Frames/estado:</span> {mascotData.pet.framesPerState}</div>
        <div class="info-row"><span>Frames por fila:</span> {mascotData.pet.framesPerRow?.join(", ") ?? "N/A"}</div>
        <div class="info-row"><span>Loop:</span> {mascotData.pet.loopMs}ms</div>
      {:else}
        <div class="info-row muted">Ninguna mascota cargada</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .mascot-sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 12px;
    font-size: 13px;
    overflow: auto;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .mascot-item:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .mascot-item.active {
    background: rgba(74, 158, 255, 0.12);
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
    background: none;
    border: none;
    color: #c75450;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 4px;
  }

  .btn-import {
    background: var(--accent-color, #4a9eff);
    border: none;
    color: white;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    text-align: center;
  }

  .btn-import:hover {
    opacity: 0.9;
  }

  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .check-row {
    align-items: center;
  }

  .btn {
    flex: 1;
    background: var(--bg-tab, #2d2d2d);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
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

  .test-btn {
    background: transparent;
    border: 1px dashed var(--border-color, #555);
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
  }

  .field {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .field span:first-child {
    width: 120px;
    flex-shrink: 0;
    color: var(--text-muted, #888);
  }

  .field select,
  .field input[type="range"],
  .field input[type="text"] {
    flex: 1;
    background: var(--bg-sidebar, #252526);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 3px 6px;
    border-radius: 3px;
    font-size: 12px;
    min-width: 0;
  }

  .phrase-field span {
    width: 120px;
    flex-shrink: 0;
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
    background: rgba(74, 158, 255, 0.2);
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
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #252526);
  }

  .scope-label {
    font-size: 11px;
    color: var(--text-muted, #888);
    margin-right: auto;
  }

  .scope-btn {
    background: transparent;
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    cursor: pointer;
  }

  .scope-btn.active {
    background: var(--accent-color, #4a9eff);
    color: white;
    border-color: var(--accent-color, #4a9eff);
  }
</style>
