/** Talk to the nap-timer service worker (schedule / cancel background alarm). */

export type SwScheduleMsg = { type: 'schedule'; endAt: number };
export type SwCancelMsg = { type: 'cancel' };

function post(msg: SwScheduleMsg | SwCancelMsg): void {
  if (!('serviceWorker' in navigator)) return;
  const ready = navigator.serviceWorker.ready;
  void ready
    .then((reg) => {
      reg.active?.postMessage(msg);
      // Also ping the controlling worker if different (rare during update).
      navigator.serviceWorker.controller?.postMessage(msg);
    })
    .catch(() => {});
}

export function swSchedule(endAt: number): void {
  post({ type: 'schedule', endAt });
}

export function swCancel(): void {
  post({ type: 'cancel' });
}
