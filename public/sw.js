/* Besky Nap Timer — background alarm service worker.
 * Persists endAt, polls periodically, and uses Notification Triggers when available.
 */
const CACHE_NAME = 'besky-nap-schedule-v1';
const SCHEDULE_URL = 'https://besky-nap-timer.local/schedule.json';
const ALARM_TAG = 'besky-nap-alarm';
const POLL_MS = 25000;

/** @type {number|null} */
let endAt = null;
/** @type {number|null} */
let pollId = null;

async function readSchedule() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(SCHEDULE_URL);
    if (!res) return null;
    const data = await res.json();
    return typeof data.endAt === 'number' ? data.endAt : null;
  } catch {
    return null;
  }
}

async function writeSchedule(ts) {
  try {
    const cache = await caches.open(CACHE_NAME);
    if (ts == null) {
      await cache.delete(SCHEDULE_URL);
      return;
    }
    const body = JSON.stringify({ endAt: ts });
    await cache.put(
      SCHEDULE_URL,
      new Response(body, {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch {
    /* ignore */
  }
}

function supportsTimestampTrigger() {
  return typeof TimestampTrigger !== 'undefined' || 'TimestampTrigger' in self;
}

async function showAlarmNotification() {
  const opts = {
    body: 'Time to wake up!',
    tag: ALARM_TAG,
    icon: './favicon.svg',
    requireInteraction: true,
    renotify: true,
  };
  try {
    await self.registration.showNotification('Besky Nap Timer', opts);
  } catch {
    /* ignore */
  }
}

async function clearSchedule() {
  endAt = null;
  await writeSchedule(null);
  stopPoll();
}

async function checkDue() {
  const stored = endAt ?? (await readSchedule());
  if (stored == null) return;
  endAt = stored;
  if (Date.now() >= stored) {
    await showAlarmNotification();
    await clearSchedule();
  }
}

function stopPoll() {
  if (pollId != null) {
    clearInterval(pollId);
    pollId = null;
  }
}

function startPoll() {
  stopPoll();
  pollId = setInterval(() => {
    void checkDue();
  }, POLL_MS);
}

async function schedule(ts) {
  endAt = ts;
  await writeSchedule(ts);
  // Prefer Notification Triggers when the browser supports them (Chromium origin trial / experimental).
  if (supportsTimestampTrigger() && typeof TimestampTrigger === 'function') {
    try {
      await self.registration.showNotification('Besky Nap Timer', {
        body: 'Time to wake up!',
        tag: ALARM_TAG,
        icon: './favicon.svg',
        requireInteraction: true,
        showTrigger: new TimestampTrigger(ts),
      });
    } catch {
      // Fall through to polling
    }
  }
  startPoll();
  void checkDue();
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      endAt = await readSchedule();
      if (endAt != null) startPoll();
      await checkDue();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      endAt = await readSchedule();
      if (endAt != null) startPoll();
      await checkDue();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'schedule' && typeof data.endAt === 'number') {
    event.waitUntil(schedule(data.endAt));
  } else if (data.type === 'cancel') {
    event.waitUntil(clearSchedule());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        // Relative to SW scope (GitHub Pages project path).
        await self.clients.openWindow('./');
      }
    })(),
  );
});

// Restore schedule + poll after SW boots even without install/activate race.
void (async () => {
  endAt = await readSchedule();
  if (endAt != null) {
    startPoll();
    await checkDue();
  }
})();
