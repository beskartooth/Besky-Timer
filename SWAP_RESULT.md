# SWAP_RESULT — Besky Nap Timer video swap (2026-09-23)

## Outcome
**Build: OK** (`npm run build` → `tsc -b && vite build` succeeded; version **2.2.0**).

## Files replaced / added (`public/scenes/`)
- `besky-awake-idle.mp4` — 5,088,800 bytes
- `besky-fall-asleep.mp4` — 2,085,361 bytes
- `besky-sleep-loop.mp4` — 5,027,166 bytes
- `besky-wake.mp4` — 19,885,269 bytes
- `besky-awake.jpg` — 137,547 bytes
- `besky-sleeping.jpg` — 147,127 bytes

Prior live mp4s moved to `public/scenes/archive/` as:
- `besky-awake-idle-20260923-1650.mp4`
- `besky-sleep-loop-20260923-1650.mp4`
- `besky-wake-20260923-1650.mp4`

## Aspect
- Idle / fall-asleep / sleep-loop: **1168×784** (`SCENE_ASPECT = 1168/784` ≈ 1.4898)
- Wake: **2144×1440** (same ~1.49 ratio; cover-box uses 1168/784)
- Posters: `besky-awake.jpg` from awake-idle frame 0; `besky-sleeping.jpg` from sleep-loop @ ~1s

## Code notes (`src/App.tsx`)
- `ASSETS.fallAsleep`, phase `'fallingAsleep'`, sceneMode `'falling'`
- Start / 15s Test → `fallingAsleep` first; `endAt` set so countdown includes the ~6s transition (tick runs during fall-asleep)
- Fall-asleep plays once **muted**; `onEnded` / `onError` → `running` if still fallingAsleep
- Cancel / `doCancel` / `backHome` during fall-asleep → home + pause fall video (Cancel with no confirm)
- Panel during fall-asleep: Cancel only + hint “Settling in…” (Start / presets hidden)
- Mute rules unchanged: idle / fall / sleep always muted; wake respects mute toggle
- `DEFAULT_CLOCK_CORNERS` left as-is; README notes possible `?calibrate=1` re-check after aspect swap

## dist/scenes
Shipped: MEDIA_LOG.txt, besky-awake-idle.mp4, besky-awake.jpg, besky-fall-asleep.mp4, besky-sleep-loop.mp4, besky-sleeping.jpg, besky-wake.mp4
Archive in dist: **no (good)**

## Not done
- No GitHub push (gh not logged in)
- No long-lived dev/preview server
