# Making a commission

The buyer gets a hosted link only. They do not get this source folder. The source stays with Besky.

To build one:

1. Copy `src/character.ts` and edit that copy (do not rename or move the video files already in `public/scenes`).
2. Set `displayName`.
3. Point these scene keys at the new clips (paths relative to the site root, usually under `public/`):
   - `awakeIdle` — awake idle loop
   - `fallAsleep` — fall asleep, plays once
   - `sleepLoop` — sleep loop
   - `wake` — wake (this clip is the alarm and always plays). `sleepLoop` can have audio; the Sleep sounds toggle plays it, off by default. Awake idle and fall-asleep stay muted.
   Cheeky wake swaps in `wakeCheeky` (a second wake clip with its own alarm) and does not change the clock color.
   Also set the stills if the new art should show when a video fails to load: `awake` (idle poster) and `sleeping` (sleep poster).
4. Run `npm run build`.
5. Upload only the `dist` folder.

Leave the timer behavior alone: presets (5/10/25/45), custom minutes, sleep sounds, cheeky wake, sparks, snooze, and clock calibration.
