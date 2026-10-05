type Props = {
  progress: number; // 0..1 remaining fraction
  size?: number;
};

export function ProgressRing({ progress, size = 220 }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);

  return (
    <svg
      className="progress-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth={stroke}
      />
      <circle
        className="progress-ring__arc"
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#beskyGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="beskyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5a3c0" />
          <stop offset="100%" stopColor="#7eb8e8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
