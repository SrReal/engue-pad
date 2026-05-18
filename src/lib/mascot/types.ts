export type PetState =
  | "idle"
  | "wave"
  | "run"
  | "failed"
  | "review"
  | "jump"
  | "extra1"
  | "extra2";

export type MascotMode = "disabled" | "compact" | "animated";
export type MascotSize = "small" | "normal";

export type MascotSettings = {
  mode: MascotMode;
  size: MascotSize;
  enabled: boolean;
  soundEnabled: boolean;
  volume: number;
  voiceEnabled: boolean;
  voiceLang: string;
  currentMascot: string | null;
  position: { x: number; y: number } | null;
};

export type PetInfo = {
  name: string;
  slug: string;
  tags?: string[];
  vibes?: string[];
  kind?: string;
  frameWidth: number;
  frameHeight: number;
  framesPerState: number;
  states: PetState[];
  loopMs: number;
  spritesheet: string;
};

export type MascotState = {
  currentState: PetState;
  prevState: PetState;
  idleTimeout: ReturnType<typeof setTimeout> | null;
};

export const PET_STATES: PetState[] = [
  "idle",
  "wave",
  "run",
  "failed",
  "review",
  "jump",
  "extra1",
  "extra2",
];
