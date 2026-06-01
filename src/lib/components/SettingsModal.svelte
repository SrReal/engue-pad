<script lang="ts">
  import { getDefaultSettings, saveSettings, type AppSettings } from "$lib/workspace/settings";
  import { appSettings, updateAppSettings } from "$lib/workspace/settingsStore.svelte";
  import { X, Copy } from "phosphor-svelte";
  import { t, setLocale } from "$lib/i18n";
  import { invoke } from "@tauri-apps/api/core";

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch((e) => console.error("Copy failed:", e));
  }

  let { show = $bindable(false) }: { show?: boolean } = $props();
  let activeTab = $state<"general" | "editor" | "terminal" | "git" | "cli">("general");
  let draft = $state<AppSettings>(getDefaultSettings());

  let cliInstalled = $state(false);
  let cliPath = $state<string | null>(null);
  let cliInstallLoading = $state(false);
  let cliInstallError = $state<string | null>(null);
  let os = $state<string>("macos");

  $effect(() => {
    if (show) {
      draft = { ...getDefaultSettings(), ...appSettings };
    }
  });

  $effect(() => {
    if (activeTab === "cli" && show) {
      checkCliStatus();
      detectOs();
    }
  });

  async function detectOs() {
    try {
      const result = await invoke<string>("get_os");
      os = result;
    } catch (e) {
      console.error("Failed to detect OS:", e);
    }
  }

  async function checkCliStatus() {
    try {
      const status = await invoke<{ installed: boolean; path?: string }>("is_cli_installed");
      cliInstalled = status.installed;
      cliPath = status.path ?? null;
      cliInstallError = null;
    } catch (e) {
      console.error("Failed to check CLI status:", e);
    }
  }

  function getClaudeCmd(): string {
    if (os === "windows") {
      return `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.claude\\skills\\engue"\nCopy-Item ".enguepad\\skills\\claude-code.md" "$env:USERPROFILE\\.claude\\skills\\engue\\SKILL.md"`;
    }
    return "mkdir -p ~/.claude/skills/engue\ncp .enguepad/skills/claude-code.md ~/.claude/skills/engue/SKILL.md";
  }

  function getCodexCmd(): string {
    if (os === "windows") {
      return `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.codex\\skills"\nCopy-Item ".enguepad\\skills\\codex.md" "$env:USERPROFILE\\.codex\\skills\\enguepad.md"`;
    }
    return "mkdir -p ~/.codex/skills\ncp .enguepad/skills/codex.md ~/.codex/skills/enguepad.md";
  }

  function getOpencodeCmd(): string {
    if (os === "windows") {
      return `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.opencode\\skills"\nCopy-Item ".enguepad\\skills\\opencode.md" "$env:USERPROFILE\\.opencode\\skills\\enguepad.md"`;
    }
    return "mkdir -p ~/.opencode/skills\ncp .enguepad/skills/opencode.md ~/.opencode/skills/enguepad.md";
  }

  async function installCli() {
    cliInstallLoading = true;
    cliInstallError = null;
    try {
      const result = await invoke<{ success: boolean; path?: string; error?: string }>("install_cli");
      if (result.success) {
        cliInstalled = true;
        cliPath = result.path ?? null;
      } else {
        cliInstallError = result.error ?? t("settingsCliUnknownError");
      }
    } catch (e) {
      cliInstallError = String(e);
    } finally {
      cliInstallLoading = false;
    }
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    draft = { ...draft, [key]: value };
  }

  function updateNested(parent: keyof AppSettings, key: string, value: unknown) {
    const parentObj = (draft[parent] ?? {}) as Record<string, unknown>;
    const updated = { ...parentObj, [key]: value };
    draft = { ...draft, [parent]: updated as AppSettings[keyof AppSettings] };
  }

  function apply() {
    if (draft.locale) setLocale(draft.locale);
    updateAppSettings(draft);
    saveSettings(draft);
    show = false;
  }

  function cancel() {
    show = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") cancel();
  }
</script>

{#if show}
  <div class="modal-backdrop" onclick={cancel} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <span class="modal-title">{t("settingsTitle")}</span>
        <button class="close-btn" onclick={cancel} aria-label={t("tabClose")}><X size={16} /></button>
      </div>
      <div class="modal-body">
        <div class="tabs">
          <button class="tab-btn" class:active={activeTab === "general"} onclick={() => activeTab = "general"}>{t("settingsTabGeneral")}</button>
          <button class="tab-btn" class:active={activeTab === "editor"} onclick={() => activeTab = "editor"}>{t("settingsTabEditor")}</button>
          <button class="tab-btn" class:active={activeTab === "terminal"} onclick={() => activeTab = "terminal"}>{t("settingsTabTerminal")}</button>
          <button class="tab-btn" class:active={activeTab === "git"} onclick={() => activeTab = "git"}>{t("settingsTabGit")}</button>
          <button class="tab-btn" class:active={activeTab === "cli"} onclick={() => activeTab = "cli"}>{t("settingsTabCli")}</button>
        </div>
        <div class="tab-content">
          {#if activeTab === "general"}
            <div class="section">
              <label class="field">
                <span>{t("settingsUiFontSize")}</span>
                <input type="number" min="10" max="20" value={draft.uiFontSize ?? 13} onchange={(e) => update("uiFontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>{t("settingsZoom")}</span>
                <input type="range" min="0.8" max="1.5" step="0.05" value={draft.zoom ?? 1} onchange={(e) => update("zoom", +e.currentTarget.value)} />
                <span class="value">{draft.zoom ?? 1}x</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.restoreLayout ?? true} onchange={(e) => update("restoreLayout", e.currentTarget.checked)} />
                <span>{t("settingsRestoreLayout")}</span>
              </label>
              <label class="field">
                <span>{t("settingsLanguage")}</span>
                <select value={draft.locale ?? "en"} onchange={(e) => update("locale", e.currentTarget.value as "en" | "es")}>
                  <option value="en">{t("settingsLanguageEnglish")}</option>
                  <option value="es">{t("settingsLanguageSpanish")}</option>
                </select>
              </label>
              <label class="field">
                <span>{t("settingsMascotScope")}</span>
                <select value={draft.mascotScope ?? "global"} onchange={(e) => update("mascotScope", e.currentTarget.value as "global" | "project")}>
                  <option value="global">{t("settingsMascotGlobal")}</option>
                  <option value="project">{t("settingsMascotPerProject")}</option>
                </select>
              </label>
            </div>
          {:else if activeTab === "editor"}
            <div class="section">
              <label class="field">
                <span>{t("settingsEditorFontSize")}</span>
                <input type="number" min="10" max="24" value={draft.editor?.fontSize ?? 14} onchange={(e) => updateNested("editor", "fontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>{t("settingsEditorLineHeight")}</span>
                <input type="number" min="1" max="2" step="0.1" value={draft.editor?.lineHeight ?? 1.5} onchange={(e) => updateNested("editor", "lineHeight", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.wordWrap ?? true} onchange={(e) => updateNested("editor", "wordWrap", e.currentTarget.checked)} />
                <span>{t("settingsEditorWordWrap")}</span>
              </label>
              <label class="field">
                <span>{t("settingsEditorTabSize")}</span>
                <input type="number" min="2" max="8" value={draft.editor?.tabSize ?? 2} onchange={(e) => updateNested("editor", "tabSize", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.insertSpaces ?? true} onchange={(e) => updateNested("editor", "insertSpaces", e.currentTarget.checked)} />
                <span>{t("settingsEditorInsertSpaces")}</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.showLineNumbers ?? true} onchange={(e) => updateNested("editor", "showLineNumbers", e.currentTarget.checked)} />
                <span>{t("settingsEditorShowLineNumbers")}</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.highlightActiveLine ?? true} onchange={(e) => updateNested("editor", "highlightActiveLine", e.currentTarget.checked)} />
                <span>{t("settingsEditorHighlightActiveLine")}</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.minimap ?? false} onchange={(e) => updateNested("editor", "minimap", e.currentTarget.checked)} />
                <span>{t("settingsEditorMinimap")}</span>
              </label>
              <label class="field">
                <span>{t("settingsEditorAutoSave")}</span>
                <select value={draft.editor?.autoSave ?? "off"} onchange={(e) => updateNested("editor", "autoSave", e.currentTarget.value)}>
                  <option value="off">{t("settingsEditorAutoSaveOff")}</option>
                  <option value="onFocusChange">{t("settingsEditorAutoSaveFocus")}</option>
                  <option value="afterDelay">{t("settingsEditorAutoSaveDelay")}</option>
                </select>
              </label>
            </div>
          {:else if activeTab === "terminal"}
            <div class="section">
              <label class="field">
                <span>{t("settingsTerminalDefaultShell")}</span>
                <input type="text" value={draft.terminal?.defaultShell ?? ""} onchange={(e) => updateNested("terminal", "defaultShell", e.currentTarget.value)} placeholder={t("settingsTerminalShellPlaceholder")} />
              </label>
              <label class="field">
                <span>{t("settingsEditorFontSize")}</span>
                <input type="number" min="10" max="24" value={draft.terminal?.fontSize ?? 14} onchange={(e) => updateNested("terminal", "fontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>{t("settingsTerminalScrollback")}</span>
                <input type="number" min="100" max="10000" value={draft.terminal?.scrollback ?? 1000} onchange={(e) => updateNested("terminal", "scrollback", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.terminal?.copyOnSelect ?? false} onchange={(e) => updateNested("terminal", "copyOnSelect", e.currentTarget.checked)} />
                <span>{t("settingsTerminalCopyOnSelect")}</span>
              </label>
            </div>
          {:else if activeTab === "git"}
            <div class="section">
              <label class="field">
                <span>{t("settingsGitRefreshInterval")}</span>
                <input type="number" min="1" max="60" value={draft.git?.refreshInterval ?? 5} onchange={(e) => updateNested("git", "refreshInterval", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.git?.showIndicators ?? true} onchange={(e) => updateNested("git", "showIndicators", e.currentTarget.checked)} />
                <span>{t("settingsGitShowIndicators")}</span>
              </label>
            </div>
          {:else if activeTab === "cli"}
            <div class="section cli-section">
              <h4 class="cli-title">{t("settingsCliTitle")}</h4>
              <p class="cli-description">{t("settingsCliDescription")}</p>

              <div class="cli-status">
                {#if cliInstalled}
                  <div class="cli-status-badge installed">✓ {t("settingsCliStatusInstalled")}</div>
                  {#if cliPath}
                    <div class="cli-status-path">{t("settingsCliInstalledAt")} {cliPath}</div>
                  {/if}
                {:else}
                  <div class="cli-status-badge not-installed">✗ {t("settingsCliStatusNotInstalled")}</div>
                {/if}
              </div>

              {#if !cliInstalled}
                <button class="btn primary" onclick={installCli} disabled={cliInstallLoading}>
                  {cliInstallLoading ? t("settingsCliInstalling") : t("settingsCliInstallBtn")}
                </button>
              {/if}

              {#if cliInstallError}
                <div class="cli-error">{t("settingsCliInstallError")} {cliInstallError}</div>
              {/if}

              <hr class="cli-divider" />

              <div class="cli-agent">
                <div class="cli-agent-name">{t("settingsCliClaudeCode")}</div>
                <p class="cli-step">{t("settingsCliStepInstall")}</p>
                <div class="cli-code-wrap">
                  <pre class="cli-code"><code>{getClaudeCmd()}</code></pre>
                  <button class="cli-copy" onclick={() => copyToClipboard(getClaudeCmd())} title={t("settingsCliCopy")}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div class="cli-agent">
                <div class="cli-agent-name">{t("settingsCliCodex")}</div>
                <p class="cli-step">{t("settingsCliStepInstall")}</p>
                <div class="cli-code-wrap">
                  <pre class="cli-code"><code>{getCodexCmd()}</code></pre>
                  <button class="cli-copy" onclick={() => copyToClipboard(getCodexCmd())} title={t("settingsCliCopy")}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div class="cli-agent">
                <div class="cli-agent-name">{t("settingsCliOpencode")}</div>
                <p class="cli-step">{t("settingsCliStepInstall")}</p>
                <div class="cli-code-wrap">
                  <pre class="cli-code"><code>{getOpencodeCmd()}</code></pre>
                  <button class="cli-copy" onclick={() => copyToClipboard(getOpencodeCmd())} title={t("settingsCliCopy")}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <p class="cli-ready">{t("settingsCliStepReady")}</p>
            </div>
          {/if}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick={cancel}>{t("settingsCancel")}</button>
        <button class="btn primary" onclick={apply}>{t("settingsApply")}</button>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => { if (show) handleKeydown(e); }} />

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(3, 7, 18, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal {
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    width: 560px;
    height: 480px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--bg-tab-bar, #0b1220);
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    padding: 0 4px;
    border-radius: 5px;
  }

  .close-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .modal-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .tabs {
    display: flex;
    flex-direction: column;
    width: 120px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #0e1622);
    padding: 8px 0;
  }

  .tab-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 8px 16px;
    text-align: left;
    font-size: 13px;
    border-radius: 0;
    border-left: 2px solid transparent;
  }

  .tab-btn:hover {
    color: var(--text-color, #ccc);
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .tab-btn.active {
    color: var(--accent-color, #4a9eff);
    background: var(--accent-soft, rgba(74, 158, 255, 0.08));
    border-left-color: var(--accent-color, #4a9eff);
  }

  .tab-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
  }

  .field span:first-child {
    width: 160px;
    flex-shrink: 0;
  }

  .field input[type="text"],
  .field input[type="number"],
  .field select {
    background-color: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    min-height: 30px;
    padding: 5px 9px;
    border-radius: 6px;
    font-size: 13px;
    flex: 1;
    min-width: 0;
  }

  .field input[type="range"] {
    flex: 1;
  }

  .field .value {
    width: 36px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .field.checkbox {
    padding-left: 172px;
  }

  .field.checkbox input {
    margin: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color, #333);
    background: var(--bg-tab-bar, #0b1220);
    flex-shrink: 0;
  }

  .btn {
    min-height: 32px;
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    border: none;
  }

  .btn.secondary {
    background: transparent;
    color: var(--text-color, #ccc);
    border: 1px solid var(--border-color, #333);
  }

  .btn.secondary:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .btn.primary {
    background: var(--accent-color, #4a9eff);
    color: white;
  }

  .btn.primary:hover {
    background: var(--accent-hover, #0d8cff);
  }

  .cli-section {
    gap: 18px;
  }

  .cli-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color, #ccc);
  }

  .cli-description {
    margin: 0 0 8px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-muted, #888);
  }

  .cli-agent {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .cli-agent-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent-color, #4a9eff);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .cli-step {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted, #888);
  }

  .cli-code-wrap {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .cli-code {
    margin: 0;
    flex: 1;
    min-width: 0;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    padding: 8px 10px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: var(--text-color, #ccc);
    overflow-x: auto;
    white-space: pre;
  }

  .cli-code code {
    font-family: inherit;
    background: none;
    padding: 0;
  }

  .cli-copy {
    flex-shrink: 0;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
  }

  .cli-copy:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    color: var(--accent-color, #4a9eff);
    border-color: var(--accent-color, #4a9eff);
  }

  .cli-ready {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--text-muted, #888);
    font-style: italic;
  }

  .cli-status {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .cli-status-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    width: fit-content;
  }

  .cli-status-badge.installed {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }

  .cli-status-badge.not-installed {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .cli-status-path {
    font-size: 11px;
    color: var(--text-muted, #888);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
  }

  .cli-error {
    font-size: 12px;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    padding: 6px 8px;
    border-radius: 4px;
  }

  .cli-divider {
    border: none;
    border-top: 1px solid var(--border-color, #333);
    margin: 8px 0;
  }

</style>
