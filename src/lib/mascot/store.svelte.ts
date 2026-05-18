import { invoke } from "@tauri-apps/api/core";
import { type MascotSettings, type MascotState, type PetInfo, type PetState } from "./types";

export const mascotSettings = $state<MascotSettings>({
  mode: "disabled",
  size: "normal",
  enabled: false,
  soundEnabled: true,
  volume: 0.5,
  voiceEnabled: false,
  voiceLang: "es-ES",
  currentMascot: null,
  position: null,
});

export const mascotState = $state<MascotState>({
  currentState: "idle",
  prevState: "idle",
  idleTimeout: null,
});

export let mascotPet = $state<PetInfo | null>(null);
export let mascotImage = $state<HTMLImageElement | null>(null);

const IDLE_RETURN_MS = 3000;

export function updateMascotSettings(patch: Partial<MascotSettings>) {
  Object.assign(mascotSettings, patch);
}

export function setMascotState(state: PetState) {
  if (!mascotSettings.enabled || mascotSettings.mode === "disabled") return;
  if (mascotState.idleTimeout) clearTimeout(mascotState.idleTimeout);
  mascotState.prevState = mascotState.currentState;
  mascotState.currentState = state;
  if (state !== "idle") {
    mascotState.idleTimeout = setTimeout(() => {
      setMascotState("idle");
    }, IDLE_RETURN_MS);
  }
}

export async function getMascotDir(): Promise<string> {
  const dir = await invoke<string>("get_app_data_dir");
  return dir.replace(/[\\/]+$/, "") + "/mascots";
}

export async function loadMascot(slug: string): Promise<PetInfo | null> {
  try {
    const dir = await getMascotDir();
    const jsonPath = `${dir}/${slug}/pet.json`;
    const raw = await invoke<string>("read_file", { path: jsonPath });
    const parsed = JSON.parse(raw);
    const spritesheetName: string =
      parsed.spritesheet ?? `spritesheet.${await spritesheetExtension(`${dir}/${slug}`)}`;
    const pet: PetInfo = {
      name: parsed.name ?? slug,
      slug: parsed.slug ?? slug,
      tags: parsed.tags,
      vibes: parsed.vibes,
      kind: parsed.kind,
      frameWidth: parsed.frameWidth ?? parsed.frame_size?.width ?? 192,
      frameHeight: parsed.frameHeight ?? parsed.frame_size?.height ?? 208,
      framesPerState: parsed.framesPerState ?? 9,
      states: parsed.states ?? ["idle", "wave", "run", "failed", "review", "jump", "extra1", "extra2"],
      loopMs: parsed.loopMs ?? 1100,
      spritesheet: `${dir}/${slug}/${spritesheetName}`,
    };
    mascotPet = pet;
    const img = new Image();
    img.src = (await invoke<string>("convert_file_src", { path: pet.spritesheet })) || pet.spritesheet;
    mascotImage = img;
    return pet;
  } catch {
    mascotPet = null;
    mascotImage = null;
    return null;
  }
}

async function spritesheetExtension(dirPath: string): Promise<"webp" | "png"> {
  try {
    await invoke<string>("read_file", { path: `${dirPath}/spritesheet.webp` });
    return "webp";
  } catch {
    return "png";
  }
}

export async function importMascotFromFolder(sourcePath: string): Promise<string | null> {
  try {
    const raw = await invoke<string>("read_file", { path: `${sourcePath}/pet.json` });
    const parsed = JSON.parse(raw);
    const slug: string = parsed.slug ?? parsed.name?.toLowerCase().replace(/\s+/g, "-") ?? "custom";
    const destDir = `${await getMascotDir()}/${slug}`;
    await invoke("ensure_dir", { path: destDir });
    const entries = await invoke<{ entries: { name: string; path: string; is_file: boolean; is_dir: boolean }[] }>("list_directory", { path: sourcePath });
    const files = entries.entries.filter((e) => e.is_file).map((e) => e.name);
    for (const file of files) {
      const content = await invoke<number[]>("read_file_bytes", { path: `${sourcePath}/${file}` });
      const bytes = new Uint8Array(content);
      const blob = new Blob([bytes]);
      const text = await blob.text();
      await invoke("write_file", { path: `${destDir}/${file}`, contents: text });
    }
    return slug;
  } catch {
    return null;
  }
}

export async function listInstalledMascots(): Promise<{ slug: string; name: string }[]> {
  try {
    const dir = await getMascotDir();
    const entries = await invoke<{ entries: { name: string; path: string; is_file: boolean; is_dir: boolean }[] }>("list_directory", { path: dir });
    const mascots: { slug: string; name: string }[] = [];
    for (const entry of entries.entries.filter((e) => e.is_dir)) {
      try {
        const raw = await invoke<string>("read_file", { path: `${entry.path}/pet.json` });
        const parsed = JSON.parse(raw);
        mascots.push({ slug: parsed.slug ?? entry.name, name: parsed.name ?? entry.name });
      } catch {
        mascots.push({ slug: entry.name, name: entry.name });
      }
    }
    return mascots;
  } catch {
    return [];
  }
}
