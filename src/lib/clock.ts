import { quadBounds, type QuadCorners } from './perspective';

/**
 * Alarm-clock glass quad as % of the scene media frame (2560×1440).
 * Order tl → tr → br → bl. Source of truth: /workspace/besky-clock-fit/clock-corners.json
 * Mapped through the cover-box the same way other overlays are (object-fit: cover).
 */
export const DEFAULT_CLOCK_CORNERS: QuadCorners = {
  tl: [42.1, 83.54],
  tr: [57.37, 87.26],
  br: [57.11, 96.19],
  bl: [41.68, 91.72],
};

/** @deprecated Prefer DEFAULT_CLOCK_CORNERS or loadClockCorners(); kept for re-exports. */
export const CLOCK_CORNERS: QuadCorners = DEFAULT_CLOCK_CORNERS;

export const CLOCK_CORNERS_STORAGE_KEY = 'besky-nap-timer-clock-corners';

function cloneCorners(c: QuadCorners): QuadCorners {
  return {
    tl: [c.tl[0], c.tl[1]],
    tr: [c.tr[0], c.tr[1]],
    br: [c.br[0], c.br[1]],
    bl: [c.bl[0], c.bl[1]],
  };
}

function isPoint(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1])
  );
}

function parseCorners(raw: unknown): QuadCorners | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (isPoint(o.tl) && isPoint(o.tr) && isPoint(o.br) && isPoint(o.bl)) {
    return {
      tl: [o.tl[0], o.tl[1]],
      tr: [o.tr[0], o.tr[1]],
      br: [o.br[0], o.br[1]],
      bl: [o.bl[0], o.bl[1]],
    };
  }
  return null;
}

/** Load calibrated corners from localStorage, else defaults from clock-corners.json. */
export function loadClockCorners(): QuadCorners {
  try {
    const raw = localStorage.getItem(CLOCK_CORNERS_STORAGE_KEY);
    if (!raw) return cloneCorners(DEFAULT_CLOCK_CORNERS);
    const parsed = parseCorners(JSON.parse(raw));
    if (parsed) return parsed;
  } catch {
    /* ignore */
  }
  return cloneCorners(DEFAULT_CLOCK_CORNERS);
}

export function saveClockCorners(corners: QuadCorners): void {
  try {
    localStorage.setItem(CLOCK_CORNERS_STORAGE_KEY, JSON.stringify(cloneCorners(corners)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearClockCorners(): void {
  try {
    localStorage.removeItem(CLOCK_CORNERS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Axis-aligned hit target covering the glass quad + Besky's hand on the clock. */
export function clockHitFromCorners(corners: QuadCorners) {
  const bbox = quadBounds(corners, { left: 4.5, top: 10, right: 5, bottom: 4 });
  return {
    left: `${bbox.left}%`,
    top: `${bbox.top}%`,
    width: `${bbox.width}%`,
    height: `${bbox.height}%`,
  } as const;
}

const _clockBBox = quadBounds(DEFAULT_CLOCK_CORNERS, { left: 4.5, top: 10, right: 5, bottom: 4 });
export const CLOCK_HIT = {
  left: `${_clockBBox.left}%`,
  top: `${_clockBBox.top}%`,
  width: `${_clockBBox.width}%`,
  height: `${_clockBBox.height}%`,
} as const;
