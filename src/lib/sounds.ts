const SOUND_PREFS_KEY = "padhai-buddy-preferences";
let audioContext: AudioContext | null = null;

const lastPlayTime: Record<string, number> = {};
const COOLDOWN_MS = 100;

interface Note {
  freq: number;
  freqEnd: number;
  duration: number;
  delay: number;
  type: OscillatorType;
  volume: number;
}

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

function canPlay(key: string): boolean {
  const now = Date.now();
  if (now - (lastPlayTime[key] || 0) < COOLDOWN_MS) return false;
  lastPlayTime[key] = now;
  return true;
}

function playNotes(key: string, notes: Note[]) {
  if (!isSoundEnabled()) return;
  if (!canPlay(key)) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = note.type;

      const startTime = ctx.currentTime + note.delay;
      osc.frequency.setValueAtTime(note.freq, startTime);
      if (note.freqEnd !== note.freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(note.freqEnd, 10), startTime + note.duration);
      }

      const vol = note.volume * 0.25;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

      osc.start(startTime);
      osc.stop(startTime + note.duration);
    }
  } catch {
    // ignore sound errors
  }
}

export function playSend() {
  playNotes("send", [
    { freq: 784, freqEnd: 988, duration: 0.07, delay: 0, type: "sine", volume: 0.3 },
    { freq: 988, freqEnd: 1175, duration: 0.07, delay: 0.07, type: "sine", volume: 0.3 },
  ]);
}

export function playReceive() {
  playNotes("receive", [
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0, type: "sine", volume: 0.22 },
    { freq: 494, freqEnd: 494, duration: 0.1, delay: 0.1, type: "sine", volume: 0.2 },
    { freq: 790, freqEnd: 790, duration: 0.15, delay: 0.2, type: "triangle", volume: 0.25 },
  ]);
}

export function playCopy() {
  playNotes("copy", [
    { freq: 1200, freqEnd: 1300, duration: 0.03, delay: 0, type: "sine", volume: 0.18 },
    { freq: 1300, freqEnd: 1200, duration: 0.03, delay: 0.03, type: "sine", volume: 0.18 },
  ]);
}

export function playError() {
  playNotes("error", [
    { freq: 196, freqEnd: 147, duration: 0.4, delay: 0, type: "sine", volume: 0.25 },
  ]);
}

export function playLogin() {
  playNotes("login", [
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0, type: "sine", volume: 0.35 },
    { freq: 990, freqEnd: 990, duration: 0.12, delay: 0.1, type: "triangle", volume: 0.3 },
  ]);
}

export function playLogout() {
  playNotes("logout", [
    { freq: 523, freqEnd: 330, duration: 0.2, delay: 0, type: "sine", volume: 0.25 },
  ]);
}

export function playSignup() {
  playNotes("signup", [
    { freq: 523, freqEnd: 523, duration: 0.1, delay: 0, type: "sine", volume: 0.3 },
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0.08, type: "sine", volume: 0.3 },
    { freq: 990, freqEnd: 1100, duration: 0.18, delay: 0.16, type: "triangle", volume: 0.35 },
  ]);
}

export function playSettings() {
  playNotes("settings", [
    { freq: 800, freqEnd: 900, duration: 0.04, delay: 0, type: "sine", volume: 0.12 },
  ]);
}

export function playSuccess() {
  playNotes("success", [
    { freq: 660, freqEnd: 660, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 990, freqEnd: 1320, duration: 0.18, delay: 0.12, type: "triangle", volume: 0.35 },
  ]);
}

export function playProfileUpdate() {
  playNotes("profileUpdate", [
    { freq: 523, freqEnd: 523, duration: 0.1, delay: 0, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 784, duration: 0.12, delay: 0.1, type: "sine", volume: 0.32 },
  ]);
}

export function playPasswordChange() {
  playNotes("passwordChange", [
    { freq: 440, freqEnd: 440, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 880, freqEnd: 880, duration: 0.15, delay: 0.12, type: "triangle", volume: 0.32 },
  ]);
}

export function playSessionLogout() {
  playNotes("sessionLogout", [
    { freq: 440, freqEnd: 280, duration: 0.25, delay: 0, type: "sine", volume: 0.2 },
  ]);
}
