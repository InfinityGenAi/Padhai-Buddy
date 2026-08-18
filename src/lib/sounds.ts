const SOUND_PREFS_KEY = "padhai-buddy-preferences";

interface SoundPreferences {
  soundEnabled: boolean;
  soundVolume: "low" | "medium" | "high";
  soundCategories: {
    ui: boolean;
    success: boolean;
    error: boolean;
    notifications: boolean;
    study: boolean;
  };
}

const DEFAULT_SOUND_PREFS: SoundPreferences = {
  soundEnabled: true,
  soundVolume: "medium",
  soundCategories: {
    ui: true,
    success: true,
    error: true,
    notifications: true,
    study: true,
  },
};

const VOLUME_MULTIPLIERS: Record<string, number> = {
  low: 0.3,
  medium: 0.6,
  high: 1.0,
};

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

type SoundCategory = "ui" | "success" | "error" | "notifications" | "study";

function loadSoundPrefs(): SoundPreferences {
  if (typeof window === "undefined") return DEFAULT_SOUND_PREFS;
  try {
    const raw = localStorage.getItem(SOUND_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
      return {
        ...DEFAULT_SOUND_PREFS,
        ...parsed,
        soundCategories: {
          ...DEFAULT_SOUND_PREFS.soundCategories,
          ...(parsed.soundCategories || {}),
        },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SOUND_PREFS;
}

function saveSoundPrefs(prefs: SoundPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function getSoundPreferences(): SoundPreferences {
  return loadSoundPrefs();
}

export function updateSoundPreferences(partial: Partial<SoundPreferences>) {
  const current = loadSoundPrefs();
  const next = {
    ...current,
    ...partial,
    soundCategories: partial.soundCategories
      ? { ...current.soundCategories, ...partial.soundCategories }
      : current.soundCategories,
  };
  saveSoundPrefs(next);
  return next;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function getVolumeMultiplier(): number {
  const prefs = loadSoundPrefs();
  return VOLUME_MULTIPLIERS[prefs.soundVolume] ?? 0.6;
}

function isSoundEnabled(): boolean {
  const prefs = loadSoundPrefs();
  return prefs.soundEnabled;
}

function isCategoryEnabled(category: SoundCategory): boolean {
  const prefs = loadSoundPrefs();
  return prefs.soundCategories[category] ?? true;
}

function canPlay(key: string): boolean {
  const now = Date.now();
  if (now - (lastPlayTime[key] || 0) < COOLDOWN_MS) return false;
  lastPlayTime[key] = now;
  return true;
}

function playNotes(key: string, notes: Note[], category: SoundCategory) {
  if (!isSoundEnabled()) return;
  if (!isCategoryEnabled(category)) return;
  if (!canPlay(key)) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const volMult = getVolumeMultiplier();

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

      const vol = note.volume * volMult * 0.25;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

      osc.start(startTime);
      osc.stop(startTime + note.duration);
    }
  } catch {
    // ignore sound errors
  }
}

const UI: SoundCategory = "ui";
const SUCCESS: SoundCategory = "success";
const ERROR: SoundCategory = "error";
const NOTIFICATIONS: SoundCategory = "notifications";
const STUDY: SoundCategory = "study";

export function playClick() {
  playNotes("click", [
    { freq: 900, freqEnd: 1100, duration: 0.03, delay: 0, type: "sine", volume: 0.15 },
  ], UI);
}

export function playSuccess() {
  playNotes("success", [
    { freq: 660, freqEnd: 660, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 990, freqEnd: 1320, duration: 0.18, delay: 0.12, type: "triangle", volume: 0.35 },
  ], SUCCESS);
}

export function playError() {
  playNotes("error", [
    { freq: 196, freqEnd: 147, duration: 0.4, delay: 0, type: "sine", volume: 0.25 },
  ], ERROR);
}

export function playNotification() {
  playNotes("notification", [
    { freq: 880, freqEnd: 880, duration: 0.12, delay: 0, type: "sine", volume: 0.25 },
    { freq: 1100, freqEnd: 1100, duration: 0.1, delay: 0.12, type: "triangle", volume: 0.22 },
  ], NOTIFICATIONS);
}

export function playMessageSent() {
  playNotes("send", [
    { freq: 784, freqEnd: 988, duration: 0.07, delay: 0, type: "sine", volume: 0.3 },
    { freq: 988, freqEnd: 1175, duration: 0.07, delay: 0.07, type: "sine", volume: 0.3 },
  ], NOTIFICATIONS);
}

export function playMessageReceived() {
  playNotes("receive", [
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0, type: "sine", volume: 0.22 },
    { freq: 494, freqEnd: 494, duration: 0.1, delay: 0.1, type: "sine", volume: 0.2 },
    { freq: 790, freqEnd: 790, duration: 0.15, delay: 0.2, type: "triangle", volume: 0.25 },
  ], NOTIFICATIONS);
}

export function playSend() {
  playMessageSent();
}

export function playReceive() {
  playMessageReceived();
}

export function playQuizCorrect() {
  playNotes("quizCorrect", [
    { freq: 523, freqEnd: 523, duration: 0.1, delay: 0, type: "sine", volume: 0.3 },
    { freq: 659, freqEnd: 659, duration: 0.1, delay: 0.1, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 1047, duration: 0.2, delay: 0.2, type: "triangle", volume: 0.35 },
  ], STUDY);
}

export function playQuizWrong() {
  playNotes("quizWrong", [
    { freq: 330, freqEnd: 262, duration: 0.3, delay: 0, type: "sine", volume: 0.25 },
    { freq: 262, freqEnd: 196, duration: 0.25, delay: 0.15, type: "sine", volume: 0.2 },
  ], STUDY);
}

export function playQuizComplete() {
  playNotes("quizComplete", [
    { freq: 523, freqEnd: 523, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 659, freqEnd: 659, duration: 0.12, delay: 0.12, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 784, duration: 0.12, delay: 0.24, type: "sine", volume: 0.32 },
    { freq: 1047, freqEnd: 1047, duration: 0.3, delay: 0.36, type: "triangle", volume: 0.38 },
  ], STUDY);
}

export function playFlashcardFlip() {
  playNotes("flashcardFlip", [
    { freq: 1400, freqEnd: 1800, duration: 0.04, delay: 0, type: "sine", volume: 0.1 },
  ], UI);
}

export function playTaskComplete() {
  playNotes("taskComplete", [
    { freq: 440, freqEnd: 880, duration: 0.15, delay: 0, type: "triangle", volume: 0.3 },
    { freq: 880, freqEnd: 880, duration: 0.2, delay: 0.1, type: "sine", volume: 0.35 },
  ], SUCCESS);
}

export function playTimerStart() {
  playNotes("timerStart", [
    { freq: 600, freqEnd: 900, duration: 0.12, delay: 0, type: "sine", volume: 0.25 },
    { freq: 900, freqEnd: 900, duration: 0.15, delay: 0.1, type: "triangle", volume: 0.28 },
  ], STUDY);
}

export function playTimerPause() {
  playNotes("timerPause", [
    { freq: 500, freqEnd: 350, duration: 0.2, delay: 0, type: "sine", volume: 0.22 },
  ], STUDY);
}

export function playTimerResume() {
  playNotes("timerResume", [
    { freq: 400, freqEnd: 700, duration: 0.1, delay: 0, type: "sine", volume: 0.22 },
    { freq: 700, freqEnd: 700, duration: 0.12, delay: 0.08, type: "triangle", volume: 0.25 },
  ], STUDY);
}

export function playTimerComplete() {
  playNotes("timerComplete", [
    { freq: 523, freqEnd: 523, duration: 0.15, delay: 0, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 784, duration: 0.15, delay: 0.15, type: "sine", volume: 0.3 },
    { freq: 1047, freqEnd: 1047, duration: 0.35, delay: 0.3, type: "triangle", volume: 0.38 },
  ], STUDY);
}

export function playEmailSent() {
  playNotes("emailSent", [
    { freq: 600, freqEnd: 900, duration: 0.06, delay: 0, type: "sine", volume: 0.2 },
    { freq: 900, freqEnd: 1200, duration: 0.08, delay: 0.06, type: "sine", volume: 0.22 },
  ], SUCCESS);
}

export function playPasswordReset() {
  playNotes("passwordReset", [
    { freq: 440, freqEnd: 440, duration: 0.1, delay: 0, type: "sine", volume: 0.25 },
    { freq: 880, freqEnd: 880, duration: 0.15, delay: 0.1, type: "triangle", volume: 0.28 },
    { freq: 1320, freqEnd: 1320, duration: 0.1, delay: 0.22, type: "sine", volume: 0.2 },
  ], SUCCESS);
}

export function playSaveSuccess() {
  playNotes("saveSuccess", [
    { freq: 880, freqEnd: 880, duration: 0.08, delay: 0, type: "sine", volume: 0.22 },
    { freq: 1100, freqEnd: 1100, duration: 0.1, delay: 0.08, type: "triangle", volume: 0.2 },
  ], SUCCESS);
}

export function playDeleteSuccess() {
  playNotes("deleteSuccess", [
    { freq: 600, freqEnd: 400, duration: 0.2, delay: 0, type: "sine", volume: 0.2 },
    { freq: 400, freqEnd: 300, duration: 0.15, delay: 0.12, type: "sine", volume: 0.18 },
  ], UI);
}

export function playAchievement() {
  playNotes("achievement", [
    { freq: 523, freqEnd: 523, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 659, freqEnd: 659, duration: 0.12, delay: 0.12, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 784, duration: 0.12, delay: 0.24, type: "sine", volume: 0.32 },
    { freq: 1047, freqEnd: 1047, duration: 0.35, delay: 0.36, type: "triangle", volume: 0.38 },
    { freq: 1319, freqEnd: 1319, duration: 0.4, delay: 0.45, type: "sine", volume: 0.4 },
  ], SUCCESS);
}

export function playCopy() {
  playNotes("copy", [
    { freq: 1200, freqEnd: 1300, duration: 0.03, delay: 0, type: "sine", volume: 0.18 },
    { freq: 1300, freqEnd: 1200, duration: 0.03, delay: 0.03, type: "sine", volume: 0.18 },
  ], UI);
}

export function playLogin() {
  playNotes("login", [
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0, type: "sine", volume: 0.35 },
    { freq: 990, freqEnd: 990, duration: 0.12, delay: 0.1, type: "triangle", volume: 0.3 },
  ], SUCCESS);
}

export function playLogout() {
  playNotes("logout", [
    { freq: 523, freqEnd: 330, duration: 0.2, delay: 0, type: "sine", volume: 0.25 },
  ], UI);
}

export function playSignup() {
  playNotes("signup", [
    { freq: 523, freqEnd: 523, duration: 0.1, delay: 0, type: "sine", volume: 0.3 },
    { freq: 660, freqEnd: 660, duration: 0.1, delay: 0.08, type: "sine", volume: 0.3 },
    { freq: 990, freqEnd: 1100, duration: 0.18, delay: 0.16, type: "triangle", volume: 0.35 },
  ], SUCCESS);
}

export function playSettings() {
  playNotes("settings", [
    { freq: 800, freqEnd: 900, duration: 0.04, delay: 0, type: "sine", volume: 0.12 },
  ], UI);
}

export function playProfileUpdate() {
  playNotes("profileUpdate", [
    { freq: 523, freqEnd: 523, duration: 0.1, delay: 0, type: "sine", volume: 0.3 },
    { freq: 784, freqEnd: 784, duration: 0.12, delay: 0.1, type: "sine", volume: 0.32 },
  ], SUCCESS);
}

export function playPasswordChange() {
  playNotes("passwordChange", [
    { freq: 440, freqEnd: 440, duration: 0.12, delay: 0, type: "sine", volume: 0.3 },
    { freq: 880, freqEnd: 880, duration: 0.15, delay: 0.12, type: "triangle", volume: 0.32 },
  ], SUCCESS);
}

export function playSessionLogout() {
  playNotes("sessionLogout", [
    { freq: 440, freqEnd: 280, duration: 0.25, delay: 0, type: "sine", volume: 0.2 },
  ], UI);
}
