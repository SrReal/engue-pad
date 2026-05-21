import { mascotSettings } from "./store.svelte";
import { t } from "../i18n";

let audioCtx: AudioContext | null = null;

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }
  return audioCtx;
}

export async function playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
  if (!mascotSettings.soundEnabled) return;
  const ctx = await getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = mascotSettings.volume * 0.3;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

export async function playStateSound(state: number) {
  if (!mascotSettings.soundEnabled) return;
  switch (state) {
    case 0:
      break;
    case 1:
      await playTone(523, 0.15, "sine");
      break;
    case 2:
      await playTone(440, 0.1, "square");
      break;
    case 3:
      await playTone(200, 0.4, "sawtooth");
      break;
    case 4:
      await playTone(600, 0.2, "triangle");
      break;
    case 5:
      await playTone(880, 0.15, "sine");
      setTimeout(() => playTone(1100, 0.15, "sine"), 120);
      break;
    default:
      await playTone(350, 0.1, "sine");
  }
}

function getVoiceForGender(lang: string, gender: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const langPrefix = lang.split("-")[0].toLowerCase();
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));

  const nameLower = (n: string) => n.toLowerCase();
  const findByKeywords = (keywords: string[]) =>
    candidates.find((v) => keywords.some((k) => nameLower(v.name).includes(k)));

  switch (gender) {
    case "male":
      return (
        findByKeywords(["jorge", "diego", "carlos", "alberto", "david", "james", "john", "paul", "george", "daniel", "thomas", "robert", "michael", "mark", "matthew"]) ??
        candidates[0] ??
        null
      );
    case "female":
      return (
        findByKeywords(["monica", "laura", "elena", "carmen", "sofia", "anna", "sarah", "jennifer", "emma", "olivia", "mary", "linda", "patricia", "susan", "jessica"]) ??
        candidates[0] ??
        null
      );
    case "boy":
      return (
        findByKeywords(["junior", "boy", "nino", "child", "young"]) ??
        candidates[0] ??
        null
      );
    case "girl":
      return (
        findByKeywords(["girl", "nina", "child", "young", "sophie", "lily"]) ??
        candidates[0] ??
        null
      );
    default:
      return candidates[0] ?? null;
  }
}

function getPitchForGender(gender: string): number {
  switch (gender) {
    case "male":
      return 0.9;
    case "female":
      return 1.3;
    case "boy":
      return 1.6;
    case "girl":
      return 1.8;
    default:
      return 1.2;
  }
}

function getRateForGender(gender: string): number {
  switch (gender) {
    case "boy":
    case "girl":
      return 1.15;
    default:
      return 1.05;
  }
}

export function speak(text: string) {
  if (!mascotSettings.voiceEnabled || !text || !window.speechSynthesis) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = mascotSettings.voiceLang;
    utterance.volume = mascotSettings.volume;
    utterance.rate = getRateForGender(mascotSettings.voiceGender);
    utterance.pitch = getPitchForGender(mascotSettings.voiceGender);

    const voice = getVoiceForGender(mascotSettings.voiceLang, mascotSettings.voiceGender);
    if (voice) utterance.voice = voice;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch {
    // ignore speech errors
  }
}

export function speakForState(state: number) {
  if (!mascotSettings.voiceEnabled) return;
  const statePhraseMap: Record<number, string> = {
    0: "",
    1: "phraseStartingTask",
    2: "phraseKeepWorking",
    3: "phraseError",
    4: "phraseWaitingResponse",
    5: "phraseTaskDone",
    6: "",
    7: "",
  };
  const key = statePhraseMap[state];
  if (!key) return;
  const text = t(key as any);
  if (text) speak(text);
}
