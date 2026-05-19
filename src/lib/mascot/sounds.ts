import { mascotSettings } from "./store.svelte";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
  if (!mascotSettings.soundEnabled) return;
  const ctx = getAudioContext();
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

export function playStateSound(state: string) {
  if (!mascotSettings.soundEnabled) return;
  switch (state) {
    case "idle":
      break;
    case "wave":
      playTone(523, 0.15, "sine");
      break;
    case "run":
      playTone(440, 0.1, "square");
      break;
    case "failed":
      playTone(200, 0.4, "sawtooth");
      break;
    case "review":
      playTone(600, 0.2, "triangle");
      break;
    case "jump":
      playTone(880, 0.15, "sine");
      setTimeout(() => playTone(1100, 0.15, "sine"), 120);
      break;
    default:
      playTone(350, 0.1, "sine");
  }
}

export function speak(text: string) {
  if (!mascotSettings.voiceEnabled || !text || !window.speechSynthesis) return;
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = mascotSettings.voiceLang;
    utterance.volume = mascotSettings.volume;
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  } catch {
    // ignore speech errors
  }
}

export function speakForState(state: string) {
  if (!mascotSettings.voiceEnabled) return;
  const phrases: Record<string, string> = {
    idle: "",
    wave: "¡Hola! ¿En qué puedo ayudarte?",
    run: "Trabajando duro...",
    failed: "¡Ups! Algo salió mal.",
    review: "Revisando el código...",
    jump: "¡Listo! Todo salió bien.",
    extra1: "",
    extra2: "",
  };
  const text = phrases[state];
  if (text) speak(text);
}
