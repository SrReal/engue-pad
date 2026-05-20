export type PetState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  idle: 0,
  esperando_respuesta: 0,
  aviso_fin_tarea: 6,
  error: 3,
  iniciando_tarea: 1,
  continuo_trabajando: 2,
  llamar_atencion: 4,
  esperando_comando: 0,
  terminal_cerrado: 0,
  terminal_creado: 1,
  panel_dividido: 1,
  preview_abierto: 1,
  archivo_renombrado: 6,
  imagen_abierta: 1,
  audio_abierto: 1,
  maximizado: 7,
  restaurado: 5,
  approval_request: 4,
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
