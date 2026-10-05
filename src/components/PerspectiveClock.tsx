import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { matrix3dForQuad, type QuadCorners } from '../lib/perspective';

/** Local LED plate size before perspective warp (aspect ≈ glass). */
const LOCAL_W = 220;
const LOCAL_H = 100;

type Props = {
  corners: QuadCorners;
  /** Parent is the scene-cover; corners are % of that box (= media frame under cover). */
  className?: string;
  children: ReactNode;
};

/**
 * Red LED MM:SS plate warped onto the alarm clock glass via matrix3d.
 * Corner percentages are of the scene cover box (object-fit: cover media rect).
 */
export function PerspectiveClock({ corners, className, children }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('none');

  useLayoutEffect(() => {
    const el = elRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    const update = () => {
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      if (pw <= 0 || ph <= 0) return;
      const px: QuadCorners = {
        tl: [(corners.tl[0] / 100) * pw, (corners.tl[1] / 100) * ph],
        tr: [(corners.tr[0] / 100) * pw, (corners.tr[1] / 100) * ph],
        br: [(corners.br[0] / 100) * pw, (corners.br[1] / 100) * ph],
        bl: [(corners.bl[0] / 100) * pw, (corners.bl[1] / 100) * ph],
      };
      try {
        setTransform(matrix3dForQuad(LOCAL_W, LOCAL_H, px));
      } catch {
        setTransform('none');
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [corners]);

  return (
    <div
      ref={elRef}
      className={className}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: LOCAL_W,
        height: LOCAL_H,
        transform,
        transformOrigin: '0 0',
        willChange: 'transform',
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </div>
  );
}
