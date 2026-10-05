/** Desktop notifications for nap alarm when the tab is backgrounded. */

const ALARM_TAG = 'besky-nap-alarm';

export function ensureNotifyPermission(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;
  void Notification.requestPermission().catch(() => {});
}

export function notifyAlarm(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const opts: NotificationOptions = {
      body: 'Time to wake up!',
      tag: ALARM_TAG,
      icon: './favicon.svg',
      // Keep the toast until the user interacts (Chromium).
      requireInteraction: true,
    };
    const n = new Notification('Besky Nap Timer', opts);
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    // Notification constructor can throw if permission flipped mid-flight
  }
}
