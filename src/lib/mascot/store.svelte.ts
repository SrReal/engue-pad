import { invoke } from "@tauri-apps/api/core";
import { type MascotSettings, type MascotState, type PetInfo, type PetState, type SemanticEvent, DEFAULT_EVENT_MAPPING } from "./types";
import { speak } from "./sounds";
import { t } from "../i18n";
import { detectSpriteFrames } from "./frameDetect";

export const mascotSettings = $state<MascotSettings>({
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
  eventMappings: { ...DEFAULT_EVENT_MAPPING },
  eventPhrases: {},
});

export const mascotState = $state<MascotState>({
  currentState: 0,
  prevState: 0,
  idleTimeout: null,
});

export const mascotData = $state<{ pet: PetInfo | null; image: HTMLImageElement | null }>({
  pet: null,
  image: null,
});

const IDLE_RETURN_MS = 3000;

export function updateMascotSettings(patch: Partial<MascotSettings>) {
  Object.assign(mascotSettings, patch);
}

export function applyMascotConfig(config: MascotSettings) {
  Object.assign(mascotSettings, config);
}

export function setMascotState(state: number) {
  if (!mascotSettings.enabled || mascotSettings.mode === "disabled") return;
  if (mascotState.idleTimeout) clearTimeout(mascotState.idleTimeout);
  mascotState.prevState = mascotState.currentState;
  mascotState.currentState = state;
  if (state !== 0) {
    mascotState.idleTimeout = setTimeout(() => {
      setMascotState(0);
    }, IDLE_RETURN_MS);
  }
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

export function triggerMascotEvent(event: SemanticEvent) {
  const mappings = mascotSettings.eventMappings ?? DEFAULT_EVENT_MAPPING;
  const state = mappings[event];
  if (state != null) setMascotState(state);
  const phrases = mascotSettings.eventPhrases ?? {};
  const i18nKey = PHRASE_MAP[event];
  const text = phrases[event] ?? (i18nKey ? t(i18nKey as any) : "");
  if (text) speak(text);
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

    // Migrate legacy string states to numeric row indices
    const rawStates = parsed.states ?? ["idle", "wave", "run", "failed", "review", "jump", "extra1", "extra2"];
    const stateMap: Record<string, number> = { idle: 0, wave: 1, run: 2, failed: 3, review: 4, jump: 5, extra1: 6, extra2: 7 };
    const states: number[] = Array.isArray(rawStates)
      ? rawStates.map((s: string | number) => (typeof s === "string" ? (stateMap[s] ?? 0) : s))
      : [0, 1, 2, 3, 4, 5, 6, 7];

    const pet: PetInfo = {
      name: parsed.name ?? slug,
      slug: parsed.slug ?? slug,
      tags: parsed.tags,
      vibes: parsed.vibes,
      kind: parsed.kind,
      frameWidth: parsed.frameWidth ?? parsed.frame_size?.width ?? 192,
      frameHeight: parsed.frameHeight ?? parsed.frame_size?.height ?? 208,
      framesPerState: parsed.framesPerState ?? 9,
      framesPerRow: Array.isArray(parsed.framesPerRow) ? parsed.framesPerRow : undefined,
      states,
      loopMs: parsed.loopMs ?? 1100,
      spritesheet: `${dir}/${slug}/${spritesheetName}`,
    };
    mascotData.pet = pet;

    // Load spritesheet via Blob URL to avoid CORS issues with canvas drawImage
    const bytes = await invoke<number[]>("read_file_bytes", { path: pet.spritesheet });
    const blob = new Blob([new Uint8Array(bytes)]);
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });

    mascotData.image = img;
    return pet;
  } catch {
    mascotData.pet = null;
    mascotData.image = null;
    return null;
  }
}

async function spritesheetExtension(dirPath: string): Promise<"webp" | "png"> {
  try {
    await invoke<number[]>("read_file_bytes", { path: `${dirPath}/spritesheet.webp` });
    return "webp";
  } catch {
    return "png";
  }
}

export async function importMascotFromFolder(sourcePath: string): Promise<string | null> {
  try {
    const folderName = sourcePath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "custom";
    let parsed: Record<string, unknown> = {};
    try {
      const raw = await invoke<string>("read_file", { path: `${sourcePath}/pet.json` });
      parsed = JSON.parse(raw);
    } catch {
      // no pet.json — generate default
      parsed = {
        name: folderName,
        slug: folderName.toLowerCase().replace(/\s+/g, "-"),
        frameWidth: 192,
        frameHeight: 208,
        framesPerState: 9,
        loopMs: 1100,
        states: [0, 1, 2, 3, 4, 5, 6, 7],
      };
    }

    const slug: string =
      (parsed.slug as string) ||
      (parsed.name as string)?.toLowerCase().replace(/\s+/g, "-") ||
      folderName.toLowerCase().replace(/\s+/g, "-");
    const destDir = `${await getMascotDir()}/${slug}`;
    await invoke("ensure_dir", { path: destDir });

    // Copy all files from source
    const entries = await invoke<{ entries: { name: string; path: string; is_file: boolean; is_dir: boolean }[] }>("list_directory", { path: sourcePath });
    const files = entries.entries.filter((e) => e.is_file).map((e) => e.name);
    for (const file of files) {
      const content = await invoke<number[]>("read_file_bytes", { path: `${sourcePath}/${file}` });
      await invoke("write_file_bytes", { path: `${destDir}/${file}`, contents: content });
    }

    // Detect actual frames per row from the spritesheet
    const spritesheetFile = files.find((f) => f.startsWith("spritesheet."));
    if (spritesheetFile) {
      try {
        const bytes = await invoke<number[]>("read_file_bytes", { path: `${destDir}/${spritesheetFile}` });
        const blob = new Blob([new Uint8Array(bytes)]);
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        const fw = (parsed.frameWidth as number) ?? (parsed.frame_size as { width?: number })?.width ?? 192;
        const fh = (parsed.frameHeight as number) ?? (parsed.frame_size as { height?: number })?.height ?? 208;
        const detected = detectSpriteFrames(img, fw, fh);
        if (detected.length > 0) {
          parsed.framesPerRow = detected;
          const maxFrames = Math.max(...detected);
          if (maxFrames > 0 && maxFrames !== (parsed.framesPerState as number)) {
            parsed.framesPerState = maxFrames;
          }
        }
      } catch {
        // ignore detection errors
      }
    }

    // Write/overwrite pet.json with updated metadata
    await invoke("write_file", { path: `${destDir}/pet.json`, contents: JSON.stringify(parsed, null, 2) });

    return slug;
  } catch {
    return null;
  }
}

export type MascotItem = {
  slug: string;
  name: string;
  spritesheetPath: string;
  spritesheetUrl: string | null;
  frameWidth: number;
  frameHeight: number;
  framesPerState: number;
  states: number[];
};

export async function listInstalledMascots(): Promise<MascotItem[]> {
  try {
    const dir = await getMascotDir();
    const entries = await invoke<{ entries: { name: string; path: string; is_file: boolean; is_dir: boolean }[] }>("list_directory", { path: dir });
    const mascots: MascotItem[] = [];
    for (const entry of entries.entries.filter((e) => e.is_dir)) {
      try {
        const raw = await invoke<string>("read_file", { path: `${entry.path}/pet.json` });
        const parsed = JSON.parse(raw);
        const slug = parsed.slug ?? entry.name;
        const name = parsed.name ?? entry.name;
        const ext = await spritesheetExtension(entry.path);
        const spritesheetPath = `${entry.path}/spritesheet.${ext}`;
        let spritesheetUrl: string | null = null;
        try {
          const bytes = await invoke<number[]>("read_file_bytes", { path: spritesheetPath });
          const blob = new Blob([new Uint8Array(bytes)]);
          spritesheetUrl = URL.createObjectURL(blob);
        } catch {
          spritesheetUrl = null;
        }
        const stateMap: Record<string, number> = { idle: 0, wave: 1, run: 2, failed: 3, review: 4, jump: 5, extra1: 6, extra2: 7 };
        const rawStates = parsed.states ?? ["idle", "wave", "run", "failed", "review", "jump", "extra1", "extra2"];
        const states: number[] = Array.isArray(rawStates)
          ? rawStates.map((s: string | number) => (typeof s === "string" ? (stateMap[s] ?? 0) : s))
          : [0, 1, 2, 3, 4, 5, 6, 7];

        mascots.push({
          slug,
          name,
          spritesheetPath,
          spritesheetUrl,
          frameWidth: parsed.frameWidth ?? parsed.frame_size?.width ?? 192,
          frameHeight: parsed.frameHeight ?? parsed.frame_size?.height ?? 208,
          framesPerState: parsed.framesPerState ?? 9,
          states,
        });
      } catch {
        mascots.push({ slug: entry.name, name: entry.name, spritesheetPath: "", spritesheetUrl: null, frameWidth: 192, frameHeight: 208, framesPerState: 9, states: [0, 1, 2, 3, 4, 5, 6, 7] });
      }
    }
    return mascots;
  } catch {
    return [];
  }
}

export async function deleteMascot(slug: string): Promise<boolean> {
  try {
    const dir = await getMascotDir();
    await invoke("remove_dir_all", { path: `${dir}/${slug}` });
    return true;
  } catch {
    return false;
  }
}
