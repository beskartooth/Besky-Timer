import type { CSSProperties } from 'react';

export type BeskyPose = 'idle' | 'nap' | 'wake' | 'snooze';

type Props = {
  pose: BeskyPose;
  showZ?: boolean;
  className?: string;
};

/**
 * Placeholder SVG Besky — charcoal fur, white ear tips, purple eyes,
 * messy ponytail + gold band, light muzzle/chest, pink crop + blue shorts.
 * Structured with labeled groups for later art swaps.
 */
export function Besky({ pose, showZ = false, className }: Props) {
  const poseClass =
    pose === 'nap' ? 'besky--nap' : pose === 'wake' ? 'besky--wake' : pose === 'snooze' ? 'besky--snooze' : 'besky--idle';

  return (
    <div className={`besky-wrap ${poseClass} ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 200 240" className="besky-svg" role="img">
        <title>Besky</title>

        {/* Soft ground shadow */}
        <ellipse cx="100" cy="228" rx="48" ry="8" fill="rgba(74,74,78,0.12)" className="besky-shadow" />

        <g className="besky-body-root">
          {/* ===== TAIL ===== */}
          <g className="besky-tail" style={tailStyle(pose)}>
            <path
              d="M58 150 Q30 140 28 118 Q26 100 42 108 Q52 114 58 130"
              fill="#4a4a4e"
            />
            <path d="M32 112 Q28 104 36 106" fill="#e8e8ec" opacity="0.9" />
          </g>

          {/* ===== LEGS / SHORTS ===== */}
          <g className="besky-legs">
            {pose === 'nap' ? (
              <>
                <ellipse cx="78" cy="198" rx="22" ry="14" fill="#7eb8e8" transform="rotate(-18 78 198)" />
                <ellipse cx="118" cy="200" rx="20" ry="13" fill="#7eb8e8" transform="rotate(12 118 200)" />
                <ellipse cx="68" cy="206" rx="10" ry="7" fill="#4a4a4e" />
                <ellipse cx="130" cy="206" rx="10" ry="7" fill="#4a4a4e" />
              </>
            ) : pose === 'wake' ? (
              <>
                <rect x="78" y="168" width="18" height="42" rx="9" fill="#7eb8e8" />
                <rect x="104" y="168" width="18" height="42" rx="9" fill="#7eb8e8" />
                <ellipse cx="87" cy="212" rx="11" ry="7" fill="#4a4a4e" />
                <ellipse cx="113" cy="212" rx="11" ry="7" fill="#4a4a4e" />
              </>
            ) : (
              <>
                <rect x="80" y="170" width="16" height="40" rx="8" fill="#7eb8e8" />
                <rect x="104" y="170" width="16" height="40" rx="8" fill="#7eb8e8" />
                <ellipse cx="88" cy="212" rx="10" ry="6" fill="#4a4a4e" />
                <ellipse cx="112" cy="212" rx="10" ry="6" fill="#4a4a4e" />
              </>
            )}
          </g>

          {/* ===== TORSO ===== */}
          <g className="besky-torso">
            <ellipse cx="100" cy="145" rx="38" ry="42" fill="#4a4a4e" />
            {/* belly / chest light grey */}
            <ellipse cx="100" cy="152" rx="22" ry="28" fill="#c8c8cc" />
            {/* pink crop top */}
            <path
              d="M68 128 Q100 118 132 128 L128 148 Q100 156 72 148 Z"
              fill="#f5a3c0"
            />
            <ellipse cx="100" cy="128" rx="20" ry="6" fill="#f7b8ce" opacity="0.5" />
          </g>

          {/* ===== ARMS ===== */}
          <g className="besky-arms">
            {pose === 'nap' ? (
              <>
                <ellipse cx="64" cy="155" rx="12" ry="22" fill="#4a4a4e" transform="rotate(40 64 155)" />
                <ellipse cx="136" cy="158" rx="12" ry="20" fill="#4a4a4e" transform="rotate(-50 136 158)" />
              </>
            ) : pose === 'wake' ? (
              <>
                <ellipse cx="58" cy="110" rx="11" ry="28" fill="#4a4a4e" transform="rotate(-35 58 110)" className="besky-arm-stretch-l" />
                <ellipse cx="142" cy="110" rx="11" ry="28" fill="#4a4a4e" transform="rotate(35 142 110)" className="besky-arm-stretch-r" />
                <circle cx="48" cy="88" r="9" fill="#4a4a4e" />
                <circle cx="152" cy="88" r="9" fill="#4a4a4e" />
              </>
            ) : (
              <>
                <ellipse cx="62" cy="148" rx="11" ry="26" fill="#4a4a4e" transform="rotate(12 62 148)" />
                <ellipse cx="138" cy="148" rx="11" ry="26" fill="#4a4a4e" transform="rotate(-12 138 148)" />
                <circle cx="58" cy="172" r="9" fill="#4a4a4e" />
                <circle cx="142" cy="172" r="9" fill="#4a4a4e" />
              </>
            )}
          </g>

          {/* ===== HEAD ===== */}
          <g className="besky-head" style={headStyle(pose)}>
            {/* Ears */}
            <g className="besky-ear besky-ear-l">
              <ellipse cx="62" cy="48" rx="16" ry="28" fill="#4a4a4e" transform="rotate(-18 62 48)" />
              <ellipse cx="64" cy="42" rx="8" ry="14" fill="#e8e8ec" transform="rotate(-18 64 42)" />
            </g>
            <g className="besky-ear besky-ear-r">
              <ellipse cx="138" cy="48" rx="16" ry="28" fill="#4a4a4e" transform="rotate(18 138 48)" />
              <ellipse cx="136" cy="42" rx="8" ry="14" fill="#e8e8ec" transform="rotate(18 136 42)" />
            </g>

            {/* Ponytail */}
            <g className="besky-ponytail">
              <path
                d="M100 28 Q118 8 138 22 Q152 36 142 70 Q132 96 118 88 Q108 82 112 60 Q114 42 100 36"
                fill="#3a3a3e"
              />
              <path
                d="M108 30 Q130 18 140 40 Q146 58 132 72"
                fill="#4a4a4e"
                opacity="0.7"
              />
              {/* gold hair band */}
              <ellipse cx="112" cy="38" rx="10" ry="5" fill="#e8c547" transform="rotate(-20 112 38)" />
              <ellipse cx="112" cy="37" rx="7" ry="2.5" fill="#f5d76e" transform="rotate(-20 112 37)" opacity="0.7" />
            </g>

            {/* Face */}
            <ellipse cx="100" cy="78" rx="42" ry="40" fill="#4a4a4e" />
            {/* muzzle */}
            <ellipse cx="100" cy="92" rx="20" ry="16" fill="#c8c8cc" />

            {/* Eyes */}
            {pose === 'nap' ? (
              <>
                <path d="M78 76 Q88 82 98 76" stroke="#2a2a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M102 76 Q112 82 122 76" stroke="#2a2a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : pose === 'snooze' ? (
              <>
                {/* side-eye */}
                <ellipse cx="86" cy="76" rx="9" ry="10" fill="#fff" />
                <ellipse cx="114" cy="76" rx="9" ry="10" fill="#fff" />
                <circle cx="90" cy="77" r="5" fill="#7b4db8" />
                <circle cx="118" cy="77" r="5" fill="#7b4db8" />
                <circle cx="91.5" cy="75" r="1.8" fill="#fff" />
                <circle cx="119.5" cy="75" r="1.8" fill="#fff" />
                <path d="M76 68 Q86 64 96 68" stroke="#2a2a2e" strokeWidth="1.5" fill="none" opacity="0.4" />
              </>
            ) : (
              <>
                <g className="besky-eyes">
                  <ellipse cx="86" cy="76" rx="9" ry="11" fill="#fff" className="besky-eye-white" />
                  <ellipse cx="114" cy="76" rx="9" ry="11" fill="#fff" className="besky-eye-white" />
                  <circle cx="86" cy="77" r="5.5" fill="#7b4db8" className="besky-pupil" />
                  <circle cx="114" cy="77" r="5.5" fill="#7b4db8" className="besky-pupil" />
                  <circle cx="88" cy="74.5" r="2" fill="#fff" />
                  <circle cx="116" cy="74.5" r="2" fill="#fff" />
                </g>
              </>
            )}

            {/* Nose */}
            <ellipse cx="100" cy="90" rx="5" ry="3.5" fill="#2a2a2e" />
            <ellipse cx="99" cy="89" rx="1.5" ry="1" fill="#5a5a5e" opacity="0.5" />

            {/* Mouth */}
            {pose === 'wake' ? (
              <path d="M92 100 Q100 108 108 100" stroke="#2a2a2e" strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : pose === 'snooze' ? (
              <path d="M94 102 Q100 98 106 102" stroke="#2a2a2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            ) : pose === 'nap' ? (
              <ellipse cx="100" cy="102" rx="4" ry="2.5" fill="#3a3a3e" opacity="0.5" />
            ) : (
              <path d="M94 100 Q100 106 106 100" stroke="#2a2a2e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            )}

            {/* Blush */}
            <ellipse cx="72" cy="90" rx="7" ry="4" fill="#f5a3c0" opacity="0.45" />
            <ellipse cx="128" cy="90" rx="7" ry="4" fill="#f5a3c0" opacity="0.45" />
          </g>
        </g>

        {/* Zzz bubble */}
        {showZ && pose === 'nap' && (
          <g className="besky-zzz">
            <text x="148" y="70" fontSize="18" fill="#7b4db8" fontFamily="Nunito, sans-serif" fontWeight="700" opacity="0.7">z</text>
            <text x="160" y="52" fontSize="14" fill="#7b4db8" fontFamily="Nunito, sans-serif" fontWeight="700" opacity="0.5">z</text>
            <text x="168" y="36" fontSize="11" fill="#7b4db8" fontFamily="Nunito, sans-serif" fontWeight="700" opacity="0.35">z</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function headStyle(pose: BeskyPose): CSSProperties | undefined {
  if (pose === 'nap') return { transform: 'translate(8px, 12px) rotate(18deg)', transformOrigin: '100px 100px' };
  if (pose === 'wake') return { transform: 'translateY(-6px)', transformOrigin: '100px 100px' };
  return undefined;
}

function tailStyle(pose: BeskyPose): CSSProperties | undefined {
  if (pose === 'nap') return { transform: 'translate(10px, 8px) rotate(-10deg)', transformOrigin: '58px 140px' };
  return undefined;
}
