export type PetState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MascotMode = "disabled" | "compact" | "animated";
export type MascotSize = "small" | "normal";

export type VoiceGender = "male" | "female" | "boy" | "girl";

export type SemanticEvent =
  | "idle"
  | "waiting_response"
  | "task_done"
  | "error"
  | "starting_task"
  | "keep_working"
  | "get_attention"
  | "waiting_command"
  | "terminal_closed"
  | "terminal_created"
  | "panel_split"
  | "preview_opened"
  | "file_renamed"
  | "image_opened"
  | "audio_opened"
  | "maximized"
  | "restored"
  | "approval_request";

export type EventMapping = Record<SemanticEvent, PetState>;

export const DEFAULT_EVENT_MAPPING: EventMapping = {
  idle: 0,
  waiting_response: 0,
  task_done: 6,
  error: 3,
  starting_task: 1,
  keep_working: 2,
  get_attention: 4,
  waiting_command: 0,
  terminal_closed: 0,
  terminal_created: 1,
  panel_split: 1,
  preview_opened: 1,
  file_renamed: 6,
  image_opened: 1,
  audio_opened: 1,
  maximized: 7,
  restored: 5,
  approval_request: 4,
};

export type EventPhrases = Partial<Record<SemanticEvent, string>>;

export type MascotSettings = {
  mode: MascotMode;
  size: MascotSize;
  enabled: boolean;
  soundEnabled: boolean;
  volume: number;
  voiceEnabled: boolean;
  voiceLang: string;
  voiceGender: VoiceGender;
  currentMascot: string | null;
  position: { x: number; y: number } | null;
  eventMappings?: EventMapping;
  eventPhrases?: EventPhrases;
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
  framesPerRow?: number[];
  states: number[];
  loopMs: number;
  spritesheet: string;
};

export type MascotState = {
  currentState: number;
  prevState: number;
  idleTimeout: ReturnType<typeof setTimeout> | null;
};

export const PET_STATES: PetState[] = [0, 1, 2, 3, 4, 5, 6, 7];
