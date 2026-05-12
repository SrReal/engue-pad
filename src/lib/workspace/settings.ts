import { invoke } from "@tauri-apps/api/core";

export type AppSettings = {
  lastProjectPath: string | null;
};

const SETTINGS_FILE = "settings.json";

async function getSettingsPath(): Promise<string> {
  const dir = await invoke<string>("get_app_data_dir");
  return `${dir}/${SETTINGS_FILE}`;
}

export async function loadSettings(): Promise<AppSettings> {
  const path = await getSettingsPath();
  try {
    const raw = await invoke<string>("read_file", { path });
    return JSON.parse(raw);
  } catch {
    return { lastProjectPath: null };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const path = await getSettingsPath();
  await invoke("write_file", { path, contents: JSON.stringify(settings, null, 2) });
}
