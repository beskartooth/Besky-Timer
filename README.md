# Besky Nap Timer v2.2.0

Full-bleed bedroom nap timer starring **Besky**. The art *is* the app — hover (or tap) the clock to set a nap. Vite + React + TypeScript. No backend, no API keys.

## Run locally

```bash
cd /workspace/besky-nap-timer
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview   # optional: serve dist/
```

`npm run build` copies `public/` into `dist/` but **excludes** `public/scenes/archive/` and any `*-candidate*` files.

## What’s new in v2.2.0

- **Four-clip polished flow** — home idle → **fall-asleep** (setting alarm, ~6s once) → sleep countdown loop → wake
- New asset `besky-fall-asleep.mp4` (always muted). Idle / fall-asleep / sleep stay muted; wake still respects the mute toggle
- Scene aspect updated to **1168×784** (`SCENE_ASPECT = 1168 / 784`). Wake clip is 2144×1440 with the same ~1.49 ratio
- Cancel during fall-asleep returns home immediately (no confirm). Panel hint: “Settling in…”
- **Clock corners:** defaults were calibrated for 2560×1440. After this video swap, open `?calibrate=1` again if the LED plate looks off on the glass (PerspectiveClock uses % of the cover box, so aspect alone may be enough — still worth a visual check)

## What’s new in v2.1.1

- **Bottom-aligned scene** — `.scene-cover` pins to `bottom: 0` (not center) so the alarm clock at the bottom of the art stays in frame on wide viewports; `.scene-media` uses `object-position: center bottom`
- **Fixed `matrix3d` homography** — `matrix3dForQuad` now embeds the 3×3 H correctly for CSS (perspective in `w`)
- **Click-to-calibrate** — open with `?calibrate=1` (or `localStorage` key `besky-nap-timer-calibrate=1`): click the 4 glass corners (tl → tr → br → bl), live LED plate + green outline, Copy / Save / Reset. Saved corners live in `besky-nap-timer-clock-corners` and override defaults on startup

## What’s new in v2.1

- **Awake idle loop** — `besky-awake-idle.mp4` (muted blink/wait) on home / after wake; still `besky-awake.jpg` as fallback
- **Sleep loop** — `besky-sleep-loop.mp4` muted for running / paused / snooze (video pauses when the timer is paused)
- **Wake with audio** — `besky-wake.mp4` plays once with alarm + speech unless the mute toggle is on; then soft Web Audio chime is the fallback (no double alarm)
- **After wake → home** — on wake `ended` / error she returns to awake-idle (no freeze on the last wake frame). Snooze during wake still goes to sleep loop
- **Perspective clock** — LED MM:SS warped onto the alarm glass via 4-corner `matrix3d` (`CLOCK_CORNERS`)

## Phase / scene flow

| Phase | Scene media | Audio |
|-------|-------------|-------|
| **home** | `besky-awake-idle.mp4` loop (fallback: `besky-awake.jpg`) | always muted |
| **fallingAsleep** | `besky-fall-asleep.mp4` once | always muted; on end/error → **running** |
| **running / paused / snooze** | `besky-sleep-loop.mp4` loop (fallback: `besky-sleeping.jpg`) | always muted; pause video when paused |
| **waking** | `besky-wake.mp4` once | `muted =` user mute toggle |
| wake ended / error | → **home** (awake-idle again) | — |

Countdown `endAt` starts when Start / 15s Test is pressed (fall-asleep time counts against the nap). Snooze during (or right after) wake: → snooze → sleep loop. One snooze per nap.

## Features (carried over)

- Sparks + mute / cheeky-wake persisted in `localStorage` (`besky-nap-timer-v1`)
- **Space** starts / pauses when focus is not in an input
- Cancel confirms if more than 30s remain
- Hover / tap the clock — popover with presets **5 / 10 / 25 / 45**, custom minutes, **15s Test**, Start / Pause / Cancel, mute + cheeky-wake, Sparks
- Mobile-friendly; scene uses a cover-box + `object-fit: cover`

## Scene assets

All under `public/scenes/` (live files only; archive stays local and is not shipped in `dist`):

| File | Role |
|------|------|
| `besky-awake-idle.mp4` | Home / after-wake idle blink loop (muted) |
| `besky-awake.jpg` | Still fallback + idle poster |
| `besky-fall-asleep.mp4` | Start transition — setting alarm / settling in (muted, once) |
| `besky-sleep-loop.mp4` | Loop while timer runs / paused / snooze (muted) |
| `besky-sleeping.jpg` | Still fallback + sleep poster |
| `besky-wake.mp4` | Play once on complete (alarm + speech; respect mute) |

## Perspective clock overlay

Glass quad as **% of the scene media frame** (cover box; live media is 1168×784 / ~1.49). Defaults were calibrated on 2560×1440 art — after the v2.2.0 video swap, re-check with `?calibrate=1` if the LED plate looks off. Also recorded at `/workspace/besky-clock-fit/clock-corners.json`.

```ts
// src/lib/clock.ts (also re-exported from App)
export const CLOCK_CORNERS = {
  tl: [42.1, 83.54],
  tr: [57.37, 87.26],
  br: [57.11, 96.19],
  bl: [41.68, 91.72],
};
```

Percentages are mapped through the **cover-box** (same as other overlays): the cover box matches media aspect (`2560/1440`) and media uses `object-fit: cover`, so corner % of the media frame = % of the cover box.

`PerspectiveClock` fills a local LED plate via CSS `matrix3d` (homography from a unit rectangle → the four corners) so digits sit glued to the glass, including the slight angle.

`CLOCK_HIT` is an enlarged axis-aligned bbox around the quad + hand for hover/tap.

### Calibrate corners

For retargeting the glass quad without editing source:

1. Open `/?calibrate=1` (or set `localStorage.besky-nap-timer-calibrate = "1"`).
2. Click the four corners of the clock glass in order: **top-left → top-right → bottom-right → bottom-left**.
3. Copy the JSON or **Save to localStorage** (`besky-nap-timer-clock-corners`). Saved values override `DEFAULT_CLOCK_CORNERS` on next load.
4. **Reset defaults** clears the saved calibration.

Without calibrate mode, behavior is unchanged.

## Audio rules

- **Idle + sleep videos:** always `muted` (no hour-long breath audio)
- **Wake video:** `muted =` app mute toggle (silences wake soundtrack)
- **Web Audio chime:** do **not** double-play over the wake clip’s alarm when wake audio is on; if mute is on, play a soft Web Audio chime as fallback
- Mute toggle also silences the chime path when it would otherwise play

## Stack

- Vite 8 + React 19 + TypeScript
- Vanilla CSS (pastel glass popover)
- Web Audio API chime (cheeky wake biases louder / sharper when used as mute fallback)
- `localStorage` key: `besky-nap-timer-v1`
