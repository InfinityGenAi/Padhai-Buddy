const SOUND_PREFS_KEY = "padhai-buddy-preferences";
const COOLDOWN_MS = 80;

let audioContext: AudioContext | null = null;
let lastPlayTime = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SOUND_PREFS_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      return prefs.soundEnabled !== false;
    }
  } catch {
    // ignore
  }
  return true;
}

function playTone(freq: number, freqEnd: number, duration: number, volume: number, type: OscillatorType = "sine") {
  const now = Date.now();
  if (now - lastPlayTime < COOLDOWN_MS) return;
  lastPlayTime = now;

  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 10), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore sound errors
  }
}

export function playSend() {
  playTone(800, 300, 0.08, 0.5);
}

export function playReceive() {
  playTone(500, 700, 0.12, 0.5);
}

export function playCopy() {
  playTone(600, 900, 0.06, 0.4);
}

export function playError() {
  playTone(200, 150, 0.15, 0.3);
}

export function playLogin() {
  playTone(600, 900, 0.08, 0.5);
  setTimeout(() => playTone(900, 1200, 0.1, 0.5), 150);
}

export function playLogout() {
  playTone(500, 300, 0.1, 0.4);
}
