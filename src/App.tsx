import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { PerspectiveClock } from './components/PerspectiveClock';
import {
  clearClockCorners,
  clockHitFromCorners,
  DEFAULT_CLOCK_CORNERS,
  loadClockCorners,
  saveClockCorners,
} from './lib/clock';
import type { Point2, QuadCorners } from './lib/perspective';
import { loadSettings, saveSettings } from './lib/storage';
import {
  clearNapSession,
  loadNapSession,
  saveNapSession,
  type NapSessionPhase,
} from './lib/napSession';
import { ensureNotifyPermission, notifyAlarm } from './lib/notify';
import { playChime } from './lib/audio';
import { swCancel, swSchedule } from './lib/swBridge';
import { character } from './character';
import './App.css';

export { CLOCK_CORNERS, CLOCK_HIT } from './lib/clock';

type Phase = 'home' | 'idleOut' | 'fallingAsleep' | 'running' | 'paused' | 'snooze' | 'waking';

/** Scene media aspect (1168×784 polished clips / stills). Used for cover-box sizing. */
const SCENE_ASPECT = 1168 / 784;

const PRESETS = [5, 10, 25, 45] as const;
const SNOOZE_MIN = 5;
const CALIBRATE_FLAG_KEY = 'besky-nap-timer-calibrate';
const CORNER_ORDER = ['tl', 'tr', 'br', 'bl'] as const;

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function sparksForDuration(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

function selectedOrCustomSeconds(selectedMin: number, customMin: string): number {
  const custom = parseFloat(customMin);
  if (customMin.trim() !== '' && !Number.isNaN(custom) && custom > 0) {
    return Math.floor(custom * 60);
  }
  return selectedMin * 60;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function detectCalibrateMode(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calibrate') === '1') return true;
    if (localStorage.getItem(CALIBRATE_FLAG_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function cornersFromClicks(clicks: Point2[]): QuadCorners {
  return {
    tl: clicks[0],
    tr: clicks[1],
    br: clicks[2],
    bl: clicks[3],
  };
}

function roundCorners(c: QuadCorners, digits = 2): QuadCorners {
  const r = (n: number) => Math.round(n * 10 ** digits) / 10 ** digits;
  return {
    tl: [r(c.tl[0]), r(c.tl[1])],
    tr: [r(c.tr[0]), r(c.tr[1])],
    br: [r(c.br[0]), r(c.br[1])],
    bl: [r(c.bl[0]), r(c.bl[1])],
  };
}


function playFromStart(video: HTMLVideoElement): Promise<void> {
  const begin = () => video.play();
  if (video.currentTime < 0.04) return begin();
  return new Promise((resolve, reject) => {
    let settled = false;
    const go = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', go);
      begin().then(resolve, reject);
    };
    video.addEventListener('seeked', go);
    try {
      video.currentTime = 0;
    } catch {
      go();
    }
  });
}

export default function App() {
  const initial = loadSettings();
  const [sleepSounds, setSleepSounds] = useState(initial.sleepSounds);
  const [cheekyWake, setCheekyWake] = useState(initial.cheekyWake);
  const [sparks, setSparks] = useState(initial.sparks);

  const [phase, setPhase] = useState<Phase>('home');
  const [front, setFront] = useState<'awake' | 'falling' | 'sleep' | 'wake'>('awake');
  const [readyMode, setReadyMode] = useState<'awake' | 'falling' | 'sleep' | 'wake'>('awake');
  const [selectedMin, setSelectedMin] = useState(10);
  const [customMin, setCustomMin] = useState('');
  const [durationSec, setDurationSec] = useState(10 * 60);
  const [remainingSec, setRemainingSec] = useState(10 * 60);
  const [snoozeUsed, setSnoozeUsed] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [idleVideoFailed, setIdleVideoFailed] = useState(false);
  const [fallAsleepVideoFailed, setFallAsleepVideoFailed] = useState(false);
  const [sleepVideoFailed, setSleepVideoFailed] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  const [calibrating] = useState(detectCalibrateMode);
  const [clockCorners, setClockCorners] = useState<QuadCorners>(() => loadClockCorners());
  const [calClicks, setCalClicks] = useState<Point2[]>([]);
  const [calStatus, setCalStatus] = useState('');

  const endAtRef = useRef<number | null>(null);
  const remainingRef = useRef(remainingSec);
  const hidePanelTimer = useRef<number | null>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const fallAsleepVideoRef = useRef<HTMLVideoElement>(null);
  const sleepVideoRef = useRef<HTMLVideoElement>(null);
  const wakeVideoRef = useRef<HTMLVideoElement>(null);
  const cheekyWakeVideoRef = useRef<HTMLVideoElement>(null);
  const fallHandoffRef = useRef(false);
  const phaseRef = useRef<Phase>('home');
  const sleepSoundsRef = useRef(sleepSounds);
  const cheekyWakeRef = useRef(cheekyWake);
  const coverRef = useRef<HTMLDivElement>(null);
  /** Dedupe notification / chime / spark award for one alarm firing. */
  const alarmFiredRef = useRef(false);
  const sessionRestoredRef = useRef(false);

  const clockHit = useMemo(() => clockHitFromCorners(clockCorners), [clockCorners]);
  const calJson = useMemo(
    () => JSON.stringify(roundCorners(clockCorners), null, 2),
    [clockCorners],
  );

  useEffect(() => {
    sleepSoundsRef.current = sleepSounds;
  }, [sleepSounds]);

  useEffect(() => {
    cheekyWakeRef.current = cheekyWake;
  }, [cheekyWake]);

  useEffect(() => {
    document.title = `${character.displayName} Nap Timer`;
  }, []);

  useEffect(() => {
    saveSettings({ sleepSounds, cheekyWake, sparks });
  }, [sleepSounds, cheekyWake, sparks]);

  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const clearHideTimer = () => {
    if (hidePanelTimer.current != null) {
      window.clearTimeout(hidePanelTimer.current);
      hidePanelTimer.current = null;
    }
  };

  const openPanel = useCallback(() => {
    if (calibrating) return;
    clearHideTimer();
    setPanelOpen(true);
  }, [calibrating]);

  const scheduleClosePanel = useCallback(() => {
    if (calibrating) return;
    clearHideTimer();
    hidePanelTimer.current = window.setTimeout(() => setPanelOpen(false), 280);
  }, [calibrating]);

  const closePanelNow = useCallback(() => {
    clearHideTimer();
    setPanelOpen(false);
  }, []);

  const fireAlarm = useCallback((dur: number) => {
    if (alarmFiredRef.current) return;
    alarmFiredRef.current = true;
    endAtRef.current = null;
    setRemainingSec(0);
    remainingRef.current = 0;
    // Notify before phase flip so the OS toast can appear even if video play is blocked.
    notifyAlarm();
    playChime({ cheeky: cheekyWakeRef.current });
    swCancel();
    clearNapSession();
    setPhase('waking');
    const earned = sparksForDuration(dur);
    setSparks((s) => s + earned);
    setPanelOpen(true);
  }, []);

  const tick = useCallback(() => {
    if (endAtRef.current == null) return;
    const left = (endAtRef.current - Date.now()) / 1000;
    remainingRef.current = left;
    setRemainingSec(left);
    if (left <= 0) {
      fireAlarm(durationSec);
    }
  }, [durationSec, fireAlarm]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'fallingAsleep' && phase !== 'idleOut') return;
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, tick]);

  // Restore persisted nap on first mount (survives tab discard / long background).
  useEffect(() => {
    if (sessionRestoredRef.current) return;
    sessionRestoredRef.current = true;
    const session = loadNapSession();
    if (!session) return;

    setDurationSec(session.durationSec);

    if (session.phase === 'paused') {
      const left =
        typeof session.remainingSec === 'number'
          ? session.remainingSec
          : session.durationSec;
      remainingRef.current = left;
      setRemainingSec(left);
      endAtRef.current = null;
      alarmFiredRef.current = false;
      setPhase('paused');
      setPanelOpen(true);
      return;
    }

    // Active countdown phases share an absolute endAt.
    if (session.endAt == null) {
      clearNapSession();
      return;
    }

    if (session.fired) {
      // Already awarded on a previous mount (StrictMode / remount) — show waking only.
      clearNapSession();
      swCancel();
      endAtRef.current = null;
      remainingRef.current = 0;
      setRemainingSec(0);
      alarmFiredRef.current = true;
      setPhase('waking');
      setPanelOpen(true);
      return;
    }

    if (Date.now() >= session.endAt) {
      // Mark fired before awarding so a StrictMode remount cannot double-count sparks.
      saveNapSession({ ...session, endAt: null, fired: true });
      fireAlarm(session.durationSec);
      return;
    }

    endAtRef.current = session.endAt;
    const left = (session.endAt - Date.now()) / 1000;
    remainingRef.current = left;
    setRemainingSec(left);
    alarmFiredRef.current = false;
    // Skip idleOut/fallingAsleep choreography on restore — jump to running sleep loop.
    setPhase('running');
    setPanelOpen(true);
    swSchedule(session.endAt);
  }, [fireAlarm]);

  // Catch-up when the tab returns from background / bfcache.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'hidden') return;
      const p = phaseRef.current;
      if (p === 'running' || p === 'fallingAsleep' || p === 'idleOut') {
        tick();
      }
      if (p === 'waking') {
        const selected = cheekyWakeRef.current
          ? cheekyWakeVideoRef.current
          : wakeVideoRef.current;
        if (selected) {
          selected.muted = false;
          void selected.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [tick]);

  // Home loops the idle clip. Once a nap is set, let that loop finish, then fall asleep.
  useEffect(() => {
    const v = idleVideoRef.current;
    if (!v) return;
    if (idleVideoFailed) {
      if (phase === 'idleOut') setPhase('fallingAsleep');
      return;
    }
    if (phase === 'home' || phase === 'idleOut') {
      v.muted = true;
      v.loop = phase === 'home';
      const restart =
        phase === 'home' &&
        Number.isFinite(v.duration) &&
        v.duration > 0.1 &&
        v.duration - v.currentTime < 0.15;
      const finish = () => setPhase('fallingAsleep');
      const onTime = () => {
        if (phase !== 'idleOut') return;
        if (!Number.isFinite(v.duration) || v.duration <= 0.1) return;
        if (v.duration - v.currentTime > 0.05) return;
        finish();
      };
      if (phase === 'idleOut') {
        v.addEventListener('ended', finish);
        v.addEventListener('timeupdate', onTime);
      }
      void (restart ? playFromStart(v) : v.play()).catch((err: unknown) => {
        const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
        if (name === 'AbortError') return;
        setIdleVideoFailed(true);
        if (phase === 'idleOut') setPhase('fallingAsleep');
      });
      return () => {
        v.removeEventListener('ended', finish);
        v.removeEventListener('timeupdate', onTime);
      };
    }
    v.pause();
  }, [phase, idleVideoFailed]);

  // Fall-asleep transition: play once muted, then → running (countdown already started)
  useEffect(() => {
    const v = fallAsleepVideoRef.current;
    if (!v) return;
    if (phase === 'fallingAsleep' && !fallAsleepVideoFailed) {
      v.muted = true;
      let cancelled = false;
      void playFromStart(v).catch((err: unknown) => {
        if (cancelled) return;
        const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
        if (name === 'AbortError') return;
        setFallAsleepVideoFailed(true);
        setPhase((p) => (p === 'fallingAsleep' ? 'running' : p));
      });
      return () => {
        cancelled = true;
      };
    }
    v.pause();
  }, [phase, fallAsleepVideoFailed]);

  // Sleep loop. Start muted so the browser allows autoplay, then unmute
  // only after playback has a frame. Never force muted back on once it is playing.
  useEffect(() => {
    const v = sleepVideoRef.current;
    if (!v) return;
    if (phase === 'running' || phase === 'paused' || phase === 'snooze') {
      if (phase === 'paused') {
        v.pause();
        return;
      }
      const from = phaseRef.current;
      const fresh = from !== 'paused' && from !== 'running' && from !== 'snooze';
      const wantSound = sleepSoundsRef.current;
      if (v.paused) v.muted = true;
      let cancelled = false;
      const started = fresh ? playFromStart(v) : v.play();
      void started.then(() => {
        if (!cancelled) v.muted = !wantSound;
      }).catch((err: unknown) => {
        if (cancelled) return;
        const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: unknown }).name) : '';
        if (name === 'AbortError') return;
        setSleepVideoFailed(true);
      });
      return () => {
        cancelled = true;
      };
    }
    v.pause();
  }, [phase, sleepVideoFailed]);

  useEffect(() => {
    const v = sleepVideoRef.current;
    if (!v || v.paused) return;
    if (phase === 'running' || phase === 'snooze') v.muted = !sleepSounds;
  }, [sleepSounds, phase]);

  // Selected wake clip once, always with its own alarm audio. On end/error → home.
  useEffect(() => {
    const selected = cheekyWake ? cheekyWakeVideoRef.current : wakeVideoRef.current;
    const other = cheekyWake ? wakeVideoRef.current : cheekyWakeVideoRef.current;
    if (phase === 'waking') {
      other?.pause();
      if (!selected) return;
      selected.muted = false;
      let cancelled = false;
      void playFromStart(selected).catch(() => {
        if (!cancelled) setPhase('home');
      });
      return () => {
        cancelled = true;
      };
    }
    selected?.pause();
    other?.pause();
  }, [phase, cheekyWake]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Keep session phase in sync while a nap is active (idleOut → falling → running).
  useEffect(() => {
    if (
      phase !== 'running' &&
      phase !== 'fallingAsleep' &&
      phase !== 'idleOut' &&
      phase !== 'snooze'
    ) {
      return;
    }
    if (endAtRef.current == null && phase !== 'snooze') return;
    saveNapSession({
      endAt: endAtRef.current,
      durationSec,
      phase: phase as NapSessionPhase,
      ...(phase === 'snooze' ? {} : {}),
    });
  }, [phase, durationSec]);

  const startTimer = useCallback((seconds: number) => {
    const sec = Math.max(1, Math.floor(seconds));
    ensureNotifyPermission();
    setDurationSec(sec);
    setRemainingSec(sec);
    remainingRef.current = sec;
    const endAt = Date.now() + sec * 1000;
    endAtRef.current = endAt;
    alarmFiredRef.current = false;
    const idle = idleVideoRef.current;
    const atSeam =
      !!idle &&
      !idleVideoFailed &&
      Number.isFinite(idle.duration) &&
      idle.duration > 0.1 &&
      (idle.currentTime < 0.05 || idle.duration - idle.currentTime < 0.05);
    const nextPhase: NapSessionPhase =
      !idle || idleVideoFailed || atSeam ? 'fallingAsleep' : 'idleOut';
    setPhase(nextPhase);
    saveNapSession({ endAt, durationSec: sec, phase: nextPhase });
    swSchedule(endAt);
    setSnoozeUsed(false);
    setShowCancelConfirm(false);
    setFallAsleepVideoFailed(false);
    setSleepVideoFailed(false);
    fallHandoffRef.current = false;
  }, [idleVideoFailed]);

  const pause = useCallback(() => {
    if (phase !== 'running') return;
    if (endAtRef.current != null) {
      remainingRef.current = Math.max(0, (endAtRef.current - Date.now()) / 1000);
      setRemainingSec(remainingRef.current);
    }
    endAtRef.current = null;
    setPhase('paused');
    saveNapSession({
      endAt: null,
      durationSec,
      phase: 'paused',
      remainingSec: remainingRef.current,
    });
    swCancel();
  }, [phase, durationSec]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    const endAt = Date.now() + remainingRef.current * 1000;
    endAtRef.current = endAt;
    alarmFiredRef.current = false;
    setPhase('running');
    saveNapSession({ endAt, durationSec, phase: 'running' });
    swSchedule(endAt);
  }, [phase, durationSec]);

  const doCancel = useCallback(() => {
    endAtRef.current = null;
    alarmFiredRef.current = false;
    fallAsleepVideoRef.current?.pause();
    clearNapSession();
    swCancel();
    setPhase('home');
    setShowCancelConfirm(false);
    setRemainingSec(selectedOrCustomSeconds(selectedMin, customMin));
  }, [selectedMin, customMin]);

  const requestCancel = useCallback(() => {
    // Falling-asleep cancel is immediate (no confirm).
    if (phase === 'fallingAsleep' || phase === 'idleOut' || remainingRef.current <= 30) {
      doCancel();
    } else {
      setShowCancelConfirm(true);
    }
  }, [doCancel, phase]);

  const snooze = useCallback(() => {
    if (snoozeUsed) return;
    setSnoozeUsed(true);
    wakeVideoRef.current?.pause();
    cheekyWakeVideoRef.current?.pause();
    setPhase('snooze');
    const sec = SNOOZE_MIN * 60;
    setDurationSec(sec);
    setRemainingSec(sec);
    remainingRef.current = sec;
    alarmFiredRef.current = false;
    saveNapSession({ endAt: null, durationSec: sec, phase: 'snooze' });
    swCancel();
    window.setTimeout(() => {
      const endAt = Date.now() + sec * 1000;
      endAtRef.current = endAt;
      setPhase('running');
      saveNapSession({ endAt, durationSec: sec, phase: 'running' });
      swSchedule(endAt);
    }, 400);
  }, [snoozeUsed]);

  const backHome = useCallback(() => {
    endAtRef.current = null;
    alarmFiredRef.current = false;
    fallAsleepVideoRef.current?.pause();
    wakeVideoRef.current?.pause();
    cheekyWakeVideoRef.current?.pause();
    clearNapSession();
    swCancel();
    setPhase('home');
    setShowCancelConfirm(false);
    setRemainingSec(selectedOrCustomSeconds(selectedMin, customMin));
  }, [selectedMin, customMin]);

  const onWakeEnded = useCallback(() => {
    // Return to awake-idle waiting for input — do not freeze on last wake frame.
    setPhase('home');
  }, []);

  const finishFallingAsleep = useCallback(() => {
    if (fallHandoffRef.current) return;
    fallHandoffRef.current = true;
    const v = fallAsleepVideoRef.current;
    if (v) {
      v.pause();
      // Stop just before the end so the browser doesn't snap back to frame 0.
      if (Number.isFinite(v.duration) && v.duration > 0.1) {
        const hold = Math.max(0, v.duration - 0.06);
        if (v.currentTime < hold) {
          try {
            v.currentTime = hold;
          } catch {
            /* ignore */
          }
        }
      }
    }
    setPhase((p) => {
      if (p !== 'fallingAsleep') return p;
      if (endAtRef.current != null) {
        saveNapSession({
          endAt: endAtRef.current,
          durationSec,
          phase: 'running',
        });
      }
      return 'running';
    });
  }, [durationSec]);

  const onFallAsleepTime = useCallback(() => {
    const v = fallAsleepVideoRef.current;
    if (!v || fallHandoffRef.current) return;
    if (!Number.isFinite(v.duration) || v.duration <= 0.1) return;
    if (v.duration - v.currentTime > 0.06) return;
    finishFallingAsleep();
  }, [finishFallingAsleep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (isTypingTarget(e.target)) return;
      if (calibrating) return;
      e.preventDefault();
      if (phase === 'home') {
        startTimer(selectedOrCustomSeconds(selectedMin, customMin));
      } else if (phase === 'running') {
        pause();
      } else if (phase === 'paused') {
        resume();
      } else if (phase === 'waking') {
        backHome();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, customMin, selectedMin, startTimer, pause, resume, backHome, calibrating]);

  const displayTime =
    phase === 'home'
      ? formatTime(selectedOrCustomSeconds(selectedMin, customMin))
      : formatTime(remainingSec);

  const onPreset = (m: number) => {
    setSelectedMin(m);
    setCustomMin('');
  };

  const onStartClick = () => {
    startTimer(selectedOrCustomSeconds(selectedMin, customMin));
  };

  const onHitActivate = () => {
    if (calibrating) return;
    if (coarsePointer) {
      setPanelOpen((o) => !o);
    } else {
      openPanel();
    }
  };

  const onCalibrateClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const cover = coverRef.current;
    if (!cover) return;
    if (calClicks.length >= 4) return;
    const rect = cover.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const pt: Point2 = [
      Math.round(x * 100) / 100,
      Math.round(y * 100) / 100,
    ];
    const next = [...calClicks, pt] as Point2[];
    setCalClicks(next);
    if (next.length === 4) {
      const corners = roundCorners(cornersFromClicks(next));
      setClockCorners(corners);
      setCalStatus('Quad ready — copy JSON or save to localStorage.');
    } else {
      setCalStatus(`Corner ${next.length}/4: ${CORNER_ORDER[next.length - 1]}`);
    }
  };

  const onCalibrateRedo = () => {
    setCalClicks([]);
    setCalStatus('Click again: tl → tr → br → bl');
  };

  const onCalibrateSave = () => {
    if (calClicks.length === 4) {
      const corners = roundCorners(cornersFromClicks(calClicks));
      saveClockCorners(corners);
      setClockCorners(corners);
    } else {
      saveClockCorners(clockCorners);
    }
    setCalStatus('Saved to localStorage (besky-nap-timer-clock-corners).');
  };

  const onCalibrateCopy = async () => {
    try {
      await navigator.clipboard.writeText(calJson);
      setCalStatus('Copied JSON to clipboard.');
    } catch {
      setCalStatus('Copy failed — select the JSON manually.');
    }
  };

  const onCalibrateReset = () => {
    clearClockCorners();
    setClockCorners({
      tl: [...DEFAULT_CLOCK_CORNERS.tl],
      tr: [...DEFAULT_CLOCK_CORNERS.tr],
      br: [...DEFAULT_CLOCK_CORNERS.br],
      bl: [...DEFAULT_CLOCK_CORNERS.bl],
    });
    setCalClicks([]);
    setCalStatus('Reset to defaults from clock.ts / clock-corners.json.');
  };

  const sceneMode: 'awake' | 'falling' | 'sleep' | 'wake' =
    phase === 'fallingAsleep'
      ? 'falling'
      : phase === 'running' || phase === 'paused' || phase === 'snooze'
        ? 'sleep'
        : phase === 'waking'
          ? 'wake'
          : 'awake';

  useEffect(() => {
    if (sceneMode === front) return;
    const video =
      sceneMode === 'awake'
        ? idleVideoFailed
          ? null
          : idleVideoRef.current
        : sceneMode === 'falling'
          ? fallAsleepVideoFailed
            ? null
            : fallAsleepVideoRef.current
          : sceneMode === 'sleep'
            ? sleepVideoFailed
              ? null
              : sleepVideoRef.current
            : cheekyWake
              ? cheekyWakeVideoRef.current
              : wakeVideoRef.current;
    if (!video) {
      setReadyMode(sceneMode);
      return;
    }
    const reveal = () => setReadyMode(sceneMode);
    if (!video.paused && video.readyState >= 2) {
      reveal();
      return;
    }
    video.addEventListener('playing', reveal);
    const backup = window.setTimeout(reveal, 500);
    return () => {
      video.removeEventListener('playing', reveal);
      window.clearTimeout(backup);
    };
  }, [sceneMode, front, idleVideoFailed, fallAsleepVideoFailed, sleepVideoFailed, cheekyWake]);

  useEffect(() => {
    if (readyMode === sceneMode && sceneMode !== front) setFront(sceneMode);
  }, [readyMode, sceneMode, front]);

  const showMode = (mode: 'awake' | 'falling' | 'sleep' | 'wake', onTop = false) => {
    const show = mode === front || mode === readyMode;
    const top = onTop && mode === sceneMode && mode === readyMode;
    return `scene-media${show ? ' is-visible' : ''}${top ? ' is-front' : ''}`;
  };

  const phaseHint =
    phase === 'home'
      ? 'Hover / tap the clock to set a nap'
      : phase === 'idleOut' || phase === 'fallingAsleep'
        ? 'Settling in…'
        : phase === 'running'
          ? 'Shhh… soft focus time'
          : phase === 'paused'
            ? 'Paused · Space to resume'
            : phase === 'snooze'
              ? 'Snooze loading…'
              : 'Rise and shine…';

  const outlineCorners = calClicks.length === 4 ? cornersFromClicks(calClicks) : clockCorners;
  const nextCornerLabel =
    calClicks.length < 4 ? CORNER_ORDER[calClicks.length] : null;

  return (
    <div className="app">
      <div className="scene-viewport">
        <div
          ref={coverRef}
          className="scene-cover"
          style={{
            width: `min(100vw, calc(100dvh * ${SCENE_ASPECT}))`,
            height: `min(100dvh, calc(100vw / ${SCENE_ASPECT}))`,
          }}
        >
          <img
            className={showMode('awake')}
            src={character.scenes.awake}
            alt=""
            draggable={false}
          />
          {!idleVideoFailed && (
            <video
              ref={idleVideoRef}
              className={showMode('awake', true)}
              src={character.scenes.awakeIdle}
              loop
              muted
              playsInline
              preload="auto"
              poster={character.scenes.awake}
              onError={() => setIdleVideoFailed(true)}
            />
          )}

          {!fallAsleepVideoFailed && (
            <video
              ref={fallAsleepVideoRef}
              className={showMode('falling', true)}
              src={character.scenes.fallAsleep}
              muted
              playsInline
              preload="auto"
              onTimeUpdate={onFallAsleepTime}
              onEnded={finishFallingAsleep}
              onError={finishFallingAsleep}
            />
          )}

          <img
            className={showMode('sleep')}
            src={character.scenes.sleeping}
            alt=""
            draggable={false}
          />
          {!sleepVideoFailed && (
            <video
              ref={sleepVideoRef}
              className={showMode('sleep', true)}
              src={character.scenes.sleepLoop}
              loop
              muted
              playsInline
              preload="auto"
              poster={character.scenes.sleeping}
              onError={() => setSleepVideoFailed(true)}
            />
          )}

          <video
            ref={wakeVideoRef}
            className={cheekyWake ? 'scene-media' : showMode('wake', true)}
            src={character.scenes.wake}
            muted={false}
            playsInline
            preload="auto"
            onEnded={onWakeEnded}
            onError={onWakeEnded}
          />
          <video
            ref={cheekyWakeVideoRef}
            className={cheekyWake ? showMode('wake', true) : 'scene-media'}
            src={character.scenes.wakeCheeky}
            muted={false}
            playsInline
            preload="auto"
            onEnded={onWakeEnded}
            onError={onWakeEnded}
          />

          <PerspectiveClock
            corners={clockCorners}
            className={`clock-face ${phase === 'paused' ? 'is-paused' : ''} ${
              phase === 'running' || phase === 'fallingAsleep' ? 'is-running' : ''
            }`}
          >
            <span className="clock-face__text">{displayTime}</span>
          </PerspectiveClock>

          {!calibrating && (
            <button
              type="button"
              className="clock-hit"
              style={{
                left: clockHit.left,
                top: clockHit.top,
                width: clockHit.width,
                height: clockHit.height,
              }}
              aria-label="Open nap timer controls"
              aria-expanded={panelOpen}
              aria-controls="clock-panel"
              onMouseEnter={() => {
                if (!coarsePointer) openPanel();
              }}
              onMouseLeave={() => {
                if (!coarsePointer) scheduleClosePanel();
              }}
              onFocus={openPanel}
              onClick={onHitActivate}
            />
          )}

          {!calibrating && (
            <div
              id="clock-panel"
              className={`clock-panel ${panelOpen ? 'is-open' : ''}`}
              role="dialog"
              aria-label="Nap timer controls"
              onMouseEnter={() => {
                if (!coarsePointer) openPanel();
              }}
              onMouseLeave={() => {
                if (!coarsePointer) scheduleClosePanel();
              }}
            >
              <div className="clock-panel__head">
                <span className="clock-panel__title">{character.displayName} Nap</span>
                <div className="sparks" title="Sparks earned from completed naps">
                  <span className="sparks-icon" aria-hidden="true">
                    ✦
                  </span>
                  <span className="sparks-count">{sparks}</span>
                </div>
              </div>

              <p className="phase-hint">{phaseHint}</p>

              {(phase === 'home' ||
                phase === 'idleOut' ||
                phase === 'fallingAsleep' ||
                phase === 'paused' ||
                phase === 'running') && (
                <>
                  {phase === 'home' && (
                    <>
                      <div className="presets" role="group" aria-label="Duration presets">
                        {PRESETS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`preset-btn ${
                              selectedMin === m && customMin === '' ? 'is-active' : ''
                            }`}
                            onClick={() => onPreset(m)}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>

                      <div className="custom-row">
                        <label htmlFor="custom-min">Custom</label>
                        <input
                          id="custom-min"
                          type="number"
                          min={1}
                          max={180}
                          step={1}
                          inputMode="numeric"
                          placeholder="min"
                          value={customMin}
                          onChange={(e) => setCustomMin(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  <div className="actions">
                    {phase === 'home' && (
                      <>
                        <button type="button" className="btn btn-primary" onClick={onStartClick}>
                          Start
                        </button>
                      </>
                    )}
                    {(phase === 'fallingAsleep' || phase === 'idleOut') && (
                      <button type="button" className="btn btn-ghost" onClick={doCancel}>
                        Cancel
                      </button>
                    )}
                    {phase === 'running' && (
                      <>
                        <button type="button" className="btn btn-primary" onClick={pause}>
                          Pause
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={requestCancel}>
                          Cancel
                        </button>
                      </>
                    )}
                    {phase === 'paused' && (
                      <>
                        <button type="button" className="btn btn-primary" onClick={resume}>
                          Resume
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={requestCancel}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {phase === 'waking' && (
                <div className="actions">
                  {!snoozeUsed && (
                    <button type="button" className="btn btn-secondary" onClick={snooze}>
                      Snooze 5m
                    </button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={backHome}>
                    Done
                  </button>
                </div>
              )}

              {phase === 'snooze' && (
                <p className="snooze-note">One snooze — then she means it.</p>
              )}

              <div className="toggles">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={sleepSounds}
                    onChange={(e) => setSleepSounds(e.target.checked)}
                  />
                  <span>Sleep sounds</span>
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={cheekyWake}
                    onChange={(e) => setCheekyWake(e.target.checked)}
                  />
                  <span>Cheeky wake</span>
                </label>
              </div>

              {coarsePointer && (
                <button
                  type="button"
                  className="btn btn-ghost btn-close-panel"
                  onClick={closePanelNow}
                >
                  Close
                </button>
              )}
            </div>
          )}

          {calibrating && (
            <>
              <div
                className="calibrate-layer"
                onClick={onCalibrateClick}
                role="presentation"
              />
              {calClicks.map((pt, i) => (
                <span
                  key={`${pt[0]}-${pt[1]}-${i}`}
                  className="calibrate-dot"
                  style={{ left: `${pt[0]}%`, top: `${pt[1]}%` }}
                />
              ))}
              {(calClicks.length === 4 || calClicks.length === 0) && (
                <svg className="calibrate-quad" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polygon
                    points={`${outlineCorners.tl[0]},${outlineCorners.tl[1]} ${outlineCorners.tr[0]},${outlineCorners.tr[1]} ${outlineCorners.br[0]},${outlineCorners.br[1]} ${outlineCorners.bl[0]},${outlineCorners.bl[1]}`}
                    fill="rgba(80, 255, 140, 0.12)"
                    stroke="#5dff8a"
                    strokeWidth="0.35"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
            </>
          )}
        </div>
      </div>

      {calibrating ? (
        <>
          <div className="calibrate-banner" role="status">
            Click the 4 corners of the clock glass: top-left, top-right, bottom-right,
            bottom-left
            {nextCornerLabel ? ` · next: ${nextCornerLabel}` : ''}
            {calClicks.length > 0 ? ` (${calClicks.length}/4)` : ''}
          </div>
          {/* Keep bottom of screen clear for clicking the clock glass */}
          <div className="calibrate-panel">
            <div className="calibrate-panel__title">
              {calClicks.length < 4
                ? `Click glass corners (${calClicks.length}/4)`
                : 'Clock corners ready'}
            </div>
            {calClicks.length === 4 && <pre>{calJson}</pre>}
            <div className="actions">
              {calClicks.length === 4 && (
                <>
                  <button type="button" className="btn btn-primary" onClick={onCalibrateCopy}>
                    Copy
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onCalibrateSave}>
                    Save
                  </button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={onCalibrateRedo}>
                Redo
              </button>
              <button type="button" className="btn btn-danger" onClick={onCalibrateReset}>
                Reset
              </button>
            </div>
            {calStatus && <p className="calibrate-status">{calStatus}</p>}
          </div>
        </>
      ) : (
        <header className="chrome">
          <span className="chrome-hint">
            {coarsePointer ? 'Tap the clock' : 'Hover the clock'} · Space starts / pauses
          </span>
        </header>
      )}

      {showCancelConfirm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="cancel-title">Cancel nap?</h2>
            <p>Still more than 30 seconds left. {character.displayName} looked comfy…</p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep napping
              </button>
              <button type="button" className="btn btn-danger" onClick={doCancel}>
                Cancel anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
