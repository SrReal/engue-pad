import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  lastProjectPath: string | null;
  rightSidebarCollapsed?: boolean;
  rightSidebarWidth?: number;
};

const SETTINGS_FILE = "settings.json";

async function getSettingsPath(): Promise<string> {
  const dir = await invoke<string>("get_app_data_dir");
  const path = dir.endsWith("/") || dir.endsWith("\\") ? `${dir}${SETTINGS_FILE}` : `${dir}/${SETTINGS_FILE}`;
  console.log("[settings] getSettingsPath:", path);
  return path;
}

export async function loadSettings(): Promise<AppSettings> {
  const path = await getSettingsPath();
  console.log("[settings] loadSettings path:", path);
  try {
    const raw = await invoke<string>("read_file", { path });
    console.log("[settings] loaded raw:", raw);
    return JSON.parse(raw);
  } catch (e) {
    console.log("[settings] loadSettings failed, returning defaults:", e);
    return { lastProjectPath: null };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const path = await getSettingsPath();
  const dir = path.replace(/[/\\]settings\.json$/, "");
  try {
    await invoke("ensure_dir", { path: dir });
    await invoke("write_file", { path, contents: JSON.stringify(settings, null, 2) });
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}
