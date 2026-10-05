export type Settings = {
  sleepSounds: boolean;
  cheekyWake: boolean;
  sparks: number;
};

const KEY = 'besky-nap-timer-v1';

const DEFAULTS: Settings = {
  sleepSounds: false,
  cheekyWake: false,
  sparks: 0,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      sleepSounds: Boolean(parsed.sleepSounds),
      cheekyWake: Boolean(parsed.cheekyWake),
      sparks: typeof parsed.sparks === 'number' && parsed.sparks >= 0 ? parsed.sparks : 0,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / private mode
  }
}
