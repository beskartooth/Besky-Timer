let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Soft pastel chime — used as mute-fallback when wake video audio is off. Cheeky = louder + sharper. */
export function playChime(opts: { mute?: boolean; cheeky?: boolean } = {}): void {
  if (opts.mute) return;
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') void ac.resume();

    const now = ac.currentTime;
    const cheeky = Boolean(opts.cheeky);
    const gainPeak = cheeky ? 0.35 : 0.18;
    const freqs = cheeky ? [523.25, 659.25, 783.99] : [392.0, 523.25]; // C5/E5/G5 vs G4/C5

    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = cheeky ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      const t0 = now + i * (cheeky ? 0.12 : 0.22);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (cheeky ? 0.45 : 0.7));
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + (cheeky ? 0.5 : 0.8));
    });
  } catch {
    // Web Audio unavailable — silent fail
  }
}
