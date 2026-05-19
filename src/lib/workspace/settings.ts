import { invoke } from "@tauri-apps/api/core";
import type { MascotSettings } from "$lib/mascot/types";

export type LinterSettings = {
  enabled: boolean;
  runOnSave: boolean;
  runOnType: boolean;
  languages?: Record<string, string>;
};

export type EditorSettings = {
  fontSize: number;
  lineHeight: number;
  wordWrap: boolean;
  tabSize: number;
  insertSpaces: boolean;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
  minimap: boolean;
};

export type TerminalSettings = {
  defaultShell: string;
  fontSize: number;
  scrollback: number;
  copyOnSelect: boolean;
};

export type GitSettings = {
  refreshInterval: number;
  showIndicators: boolean;
};

export type AppSettings = {
  lastProjectPath: string | null;
  rightSidebarCollapsed?: boolean;
  rightSidebarWidth?: number;
  mascotSidebarCollapsed?: boolean;
  mascotSidebarWidth?: number;
  uiFontSize?: number;
  zoom?: number;
  restoreLayout?: boolean;
  theme?: "dark" | "light" | "auto";
  editor?: EditorSettings;
  terminal?: TerminalSettings;
  lint?: LinterSettings;
  git?: GitSettings;
  mascot?: MascotSettings;
};

const SETTINGS_FILE = "settings.json";

const DEFAULT_EDITOR: EditorSettings = {
  fontSize: 14,
  lineHeight: 1.5,
  wordWrap: true,
  tabSize: 2,
  insertSpaces: true,
  showLineNumbers: true,
  highlightActiveLine: true,
  minimap: false,
};

const DEFAULT_TERMINAL: TerminalSettings = {
  defaultShell: "",
  fontSize: 14,
  scrollback: 1000,
  copyOnSelect: false,
};

const DEFAULT_LINT: LinterSettings = {
  enabled: true,
  runOnSave: false,
  runOnType: true,
};

const DEFAULT_GIT: GitSettings = {
  refreshInterval: 5,
  showIndicators: true,
};

const DEFAULT_MASCOT: MascotSettings = {
  mode: "disabled",
  size: "normal",
  enabled: false,
  soundEnabled: true,
  volume: 0.5,
  voiceEnabled: false,
  voiceLang: "es-ES",
  voiceGender: "female",
  currentMascot: null,
  position: null,
  stateLabels: {},
  eventPhrases: {},
};

export function getDefaultSettings(): Required<Omit<AppSettings, "lastProjectPath">> & { lastProjectPath: string | null } {
  return {
    lastProjectPath: null,
    rightSidebarCollapsed: false,
    rightSidebarWidth: 260,
    mascotSidebarCollapsed: true,
    mascotSidebarWidth: 260,
    uiFontSize: 13,
    zoom: 1,
    restoreLayout: true,
    theme: "dark",
    editor: { ...DEFAULT_EDITOR },
    terminal: { ...DEFAULT_TERMINAL },
    lint: { ...DEFAULT_LINT },
    git: { ...DEFAULT_GIT },
    mascot: { ...DEFAULT_MASCOT },
  };
}

async function getSettingsPath(): Promise<string> {
  const dir = await invoke<string>("get_app_data_dir");
  const path = dir.endsWith("/") || dir.endsWith("\\") ? `${dir}${SETTINGS_FILE}` : `${dir}/${SETTINGS_FILE}`;
  return path;
}

export async function loadSettings(): Promise<AppSettings> {
  const path = await getSettingsPath();
  try {
    const raw = await invoke<string>("read_file", { path });
    const parsed = JSON.parse(raw) as AppSettings;
    return { ...getDefaultSettings(), ...parsed, theme: "dark" };
  } catch {
    return getDefaultSettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const path = await getSettingsPath();
  const dir = path.replace(/[/\\]settings\.json$/, "");
  try {
    await invoke("ensure_dir", { path: dir });
    const toSave = { ...settings, theme: "dark" as const };
    await invoke("write_file", { path, contents: JSON.stringify(toSave, null, 2) });
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}
