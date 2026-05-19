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

export type VoiceGender = "male" | "female" | "boy" | "girl";

export type SemanticEvent =
  | "idle"
  | "esperando_respuesta"
  | "aviso_fin_tarea"
  | "error"
  | "iniciando_tarea"
  | "continuo_trabajando"
  | "llamar_atencion"
  | "esperando_comando"
  | "terminal_cerrado"
  | "terminal_creado"
  | "panel_dividido"
  | "preview_abierto"
  | "archivo_renombrado"
  | "imagen_abierta"
  | "audio_abierto"
  | "maximizado"
  | "restaurado"
  | "approval_request";

export type EventMapping = Record<SemanticEvent, PetState>;

export const DEFAULT_EVENT_MAPPING: EventMapping = {
  idle: "idle",
  esperando_respuesta: "idle",
  aviso_fin_tarea: "jump",
  error: "failed",
  iniciando_tarea: "wave",
  continuo_trabajando: "run",
  llamar_atencion: "review",
  esperando_comando: "idle",
  terminal_cerrado: "idle",
  terminal_creado: "wave",
  panel_dividido: "wave",
  preview_abierto: "wave",
  archivo_renombrado: "jump",
  imagen_abierta: "wave",
  audio_abierto: "wave",
  maximizado: "extra1",
  restaurado: "extra2",
  approval_request: "review",
};

export type EventPhrases = Partial<Record<SemanticEvent, string>>;

export const DEFAULT_EVENT_PHRASES: Record<SemanticEvent, string> = {
  idle: "",
  esperando_respuesta: "Te estoy esperando...",
  aviso_fin_tarea: "¡Listo! Todo salió bien.",
  error: "¡Ups! Algo salió mal.",
  iniciando_tarea: "¡Hola! ¿En qué puedo ayudarte?",
  continuo_trabajando: "Trabajando duro...",
  llamar_atencion: "Revisando el código...",
  esperando_comando: "Esperando tu siguiente comando...",
  terminal_cerrado: "Terminal cerrado.",
  terminal_creado: "Nuevo terminal listo.",
  panel_dividido: "Panel dividido.",
  preview_abierto: "Abriendo preview...",
  archivo_renombrado: "Archivo renombrado.",
  imagen_abierta: "Mostrando imagen...",
  audio_abierto: "Reproduciendo audio...",
  maximizado: "Pantalla completa.",
  restaurado: "Ventana restaurada.",
  approval_request: "¡Necesito tu aprobación!",
};

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
  stateLabels?: Partial<Record<PetState, string>>;
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
