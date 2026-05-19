import { invoke } from "@tauri-apps/api/core";
import type { MascotSettings } from "./types";

const PROJECT_MASCOT_FILE = "mascot.json";

export async function loadProjectMascotConfig(rootPath: string): Promise<MascotSettings | null> {
  const path = rootPath.endsWith("/") || rootPath.endsWith("\\")
    ? `${rootPath}.enguepad/${PROJECT_MASCOT_FILE}`
    : `${rootPath}/.enguepad/${PROJECT_MASCOT_FILE}`;
  try {
    const raw = await invoke<string>("read_file", { path });
    const parsed = JSON.parse(raw) as MascotSettings;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveProjectMascotConfig(rootPath: string, config: MascotSettings): Promise<void> {
  const dir = rootPath.endsWith("/") || rootPath.endsWith("\\")
    ? `${rootPath}.enguepad`
    : `${rootPath}/.enguepad`;
  const path = `${dir}/${PROJECT_MASCOT_FILE}`;
  try {
    await invoke("ensure_dir", { path: dir });
    await invoke("write_file", { path, contents: JSON.stringify(config, null, 2) });
  } catch (e) {
    console.error("Failed to save project mascot config:", e);
  }
}
