/** Persist active nap so backgrounded / discarded tabs can catch up. */

export type NapSessionPhase =
  | 'running'
  | 'fallingAsleep'
  | 'idleOut'
  | 'paused'
  | 'snooze';

export type NapSession = {
  endAt: number | null;
  durationSec: number;
  phase: NapSessionPhase;
  /** Present when phase === 'paused'. */
  remainingSec?: number;
  /** Guard against double spark award (StrictMode / remount). */
  fired?: boolean;
};

const KEY = 'besky-nap-timer-session';

export function loadNapSession(): NapSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NapSession>;
    if (typeof parsed.durationSec !== 'number' || parsed.durationSec < 1) return null;
    if (
      parsed.phase !== 'running' &&
      parsed.phase !== 'fallingAsleep' &&
      parsed.phase !== 'idleOut' &&
      parsed.phase !== 'paused' &&
      parsed.phase !== 'snooze'
    ) {
      return null;
    }
    const endAt =
      parsed.endAt == null
        ? null
        : typeof parsed.endAt === 'number' && parsed.endAt > 0
          ? parsed.endAt
          : null;
    const session: NapSession = {
      endAt,
      durationSec: Math.floor(parsed.durationSec),
      phase: parsed.phase,
      fired: Boolean(parsed.fired),
    };
    if (typeof parsed.remainingSec === 'number' && parsed.remainingSec >= 0) {
      session.remainingSec = parsed.remainingSec;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveNapSession(session: NapSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function clearNapSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
