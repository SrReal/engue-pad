<script lang="ts">
  import { getDefaultSettings, saveSettings, type AppSettings } from "$lib/workspace/settings";
  import { appSettings, updateAppSettings } from "$lib/workspace/settingsStore.svelte";
  import { linterConfig } from "$lib/workspace/store.svelte";

  let { show = $bindable(false) }: { show?: boolean } = $props();
  let activeTab = $state<"general" | "editor" | "terminal" | "lint" | "git">("general");
  let draft = $state<AppSettings>(getDefaultSettings());

  $effect(() => {
    if (show) {
      draft = { ...getDefaultSettings(), ...appSettings };
    }
  });

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    draft = { ...draft, [key]: value };
  }

  function updateNested<
    K extends keyof AppSettings,
    N extends NonNullable<AppSettings[K]> extends object ? K : never
  >(parent: N, key: keyof NonNullable<AppSettings[N]>, value: unknown) {
    const parentObj = (draft[parent] ?? {}) as Record<string, unknown>;
    const updated = { ...parentObj, [key]: value };
    draft = { ...draft, [parent]: updated };
  }

  function apply() {
    updateAppSettings(draft);
    saveSettings(draft);
    if (draft.lint) {
      linterConfig.enabled = draft.lint.enabled;
      linterConfig.runOnSave = draft.lint.runOnSave;
      linterConfig.runOnType = draft.lint.runOnType;
      if (draft.lint.languages) {
        linterConfig.languages = draft.lint.languages;
      }
    }
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
        <span class="modal-title">Settings</span>
        <button class="close-btn" onclick={cancel} aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="tabs">
          <button class="tab-btn" class:active={activeTab === "general"} onclick={() => activeTab = "general"}>General</button>
          <button class="tab-btn" class:active={activeTab === "editor"} onclick={() => activeTab = "editor"}>Editor</button>
          <button class="tab-btn" class:active={activeTab === "terminal"} onclick={() => activeTab = "terminal"}>Terminal</button>
          <button class="tab-btn" class:active={activeTab === "lint"} onclick={() => activeTab = "lint"}>Lint</button>
          <button class="tab-btn" class:active={activeTab === "git"} onclick={() => activeTab = "git"}>Git</button>
        </div>
        <div class="tab-content">
          {#if activeTab === "general"}
            <div class="section">
              <label class="field">
                <span>UI Font Size</span>
                <input type="number" min="10" max="20" value={draft.uiFontSize ?? 13} onchange={(e) => update("uiFontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>Zoom</span>
                <input type="range" min="0.8" max="1.5" step="0.05" value={draft.zoom ?? 1} onchange={(e) => update("zoom", +e.currentTarget.value)} />
                <span class="value">{draft.zoom ?? 1}x</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.restoreLayout ?? true} onchange={(e) => update("restoreLayout", e.currentTarget.checked)} />
                <span>Restore layout on reopen</span>
              </label>
              <label class="field">
                <span>Theme</span>
                <select value={draft.theme ?? "dark"} onchange={(e) => update("theme", e.currentTarget.value as "dark" | "light" | "auto")}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </label>
            </div>
          {:else if activeTab === "editor"}
            <div class="section">
              <label class="field">
                <span>Font Size</span>
                <input type="number" min="10" max="24" value={draft.editor?.fontSize ?? 14} onchange={(e) => updateNested("editor", "fontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>Line Height</span>
                <input type="number" min="1" max="2" step="0.1" value={draft.editor?.lineHeight ?? 1.5} onchange={(e) => updateNested("editor", "lineHeight", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.wordWrap ?? true} onchange={(e) => updateNested("editor", "wordWrap", e.currentTarget.checked)} />
                <span>Word Wrap</span>
              </label>
              <label class="field">
                <span>Tab Size</span>
                <input type="number" min="2" max="8" value={draft.editor?.tabSize ?? 2} onchange={(e) => updateNested("editor", "tabSize", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.insertSpaces ?? true} onchange={(e) => updateNested("editor", "insertSpaces", e.currentTarget.checked)} />
                <span>Insert Spaces</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.showLineNumbers ?? true} onchange={(e) => updateNested("editor", "showLineNumbers", e.currentTarget.checked)} />
                <span>Show Line Numbers</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.highlightActiveLine ?? true} onchange={(e) => updateNested("editor", "highlightActiveLine", e.currentTarget.checked)} />
                <span>Highlight Active Line</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.editor?.minimap ?? false} onchange={(e) => updateNested("editor", "minimap", e.currentTarget.checked)} />
                <span>Minimap</span>
              </label>
            </div>
          {:else if activeTab === "terminal"}
            <div class="section">
              <label class="field">
                <span>Default Shell</span>
                <input type="text" value={draft.terminal?.defaultShell ?? ""} onchange={(e) => updateNested("terminal", "defaultShell", e.currentTarget.value)} placeholder="bash, zsh, pwsh..." />
              </label>
              <label class="field">
                <span>Font Size</span>
                <input type="number" min="10" max="24" value={draft.terminal?.fontSize ?? 14} onchange={(e) => updateNested("terminal", "fontSize", +e.currentTarget.value)} />
              </label>
              <label class="field">
                <span>Scrollback Lines</span>
                <input type="number" min="100" max="10000" value={draft.terminal?.scrollback ?? 1000} onchange={(e) => updateNested("terminal", "scrollback", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.terminal?.copyOnSelect ?? false} onchange={(e) => updateNested("terminal", "copyOnSelect", e.currentTarget.checked)} />
                <span>Copy on Select</span>
              </label>
            </div>
          {:else if activeTab === "lint"}
            <div class="section">
              <label class="field checkbox">
                <input type="checkbox" checked={draft.lint?.enabled ?? true} onchange={(e) => updateNested("lint", "enabled", e.currentTarget.checked)} />
                <span>Enable Linting</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.lint?.runOnSave ?? false} onchange={(e) => updateNested("lint", "runOnSave", e.currentTarget.checked)} />
                <span>Run on Save</span>
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.lint?.runOnType ?? true} onchange={(e) => updateNested("lint", "runOnType", e.currentTarget.checked)} />
                <span>Run on Type</span>
              </label>
            </div>
          {:else if activeTab === "git"}
            <div class="section">
              <label class="field">
                <span>Refresh Interval (seconds)</span>
                <input type="number" min="1" max="60" value={draft.git?.refreshInterval ?? 5} onchange={(e) => updateNested("git", "refreshInterval", +e.currentTarget.value)} />
              </label>
              <label class="field checkbox">
                <input type="checkbox" checked={draft.git?.showIndicators ?? true} onchange={(e) => updateNested("git", "showIndicators", e.currentTarget.checked)} />
                <span>Show Indicators in Tree</span>
              </label>
            </div>
          {/if}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn secondary" onclick={cancel}>Cancel</button>
        <button class="btn primary" onclick={apply}>Apply</button>
      </div>
    </div>
  </div>
{/if}

<svelte:window onkeydown={(e) => { if (show) handleKeydown(e); }} />

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
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
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #333);
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
    border-radius: 3px;
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
    background: rgba(74, 158, 255, 0.08);
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
    background: var(--bg-sidebar, #252526);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 4px 8px;
    border-radius: 3px;
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
    flex-shrink: 0;
  }

  .btn {
    padding: 6px 16px;
    border-radius: 4px;
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
    opacity: 0.9;
  }
</style>
