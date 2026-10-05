/**
 * Map a local axis-aligned rectangle onto four destination corners via
 * CSS matrix3d (planar homography). Corners order: tl → tr → br → bl.
 */

export type Point2 = readonly [number, number];

export type QuadCorners = {
  tl: Point2;
  tr: Point2;
  br: Point2;
  bl: Point2;
};

/** Solve 8×8 linear system Ax = b (Gaussian elimination with partial pivot). */
function solve8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) {
      throw new Error('Singular homography');
    }
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * Homography H (row-major 3×3, h33 = 1) mapping src → dst for 4 point pairs.
 * Returns [a,b,c, d,e,f, g,h,i] for H = [[a,b,c],[d,e,f],[g,h,i]].
 */
export function homography(src: Point2[], dst: Point2[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve8(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * CSS matrix3d string that maps local rect (0,0)–(w,0)–(w,h)–(0,h)
 * onto `corners` (same parent coordinate space). Use with transform-origin: 0 0.
 *
 * Column-major 4×4 embedding of planar homography H (perspective in w):
 *   | a  b  0  c |
 *   | d  e  0  f |
 *   | 0  0  1  0 |
 *   | g  h  0  i |
 */
export function matrix3dForQuad(w: number, h: number, corners: QuadCorners): string {
  const src: Point2[] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const dst: Point2[] = [corners.tl, corners.tr, corners.br, corners.bl];
  const H = homography(src, dst);
  const [a, b, c, d, e, f, g, hh, i] = H;
  return `matrix3d(${a},${d},0,${g}, ${b},${e},0,${hh}, 0,0,1,0, ${c},${f},0,${i})`;
}

/** Axis-aligned bbox of a quad, optionally padded (same units as corners). */
export function quadBounds(
  corners: QuadCorners,
  pad = { left: 0, top: 0, right: 0, bottom: 0 },
): { left: number; top: number; width: number; height: number } {
  const xs = [corners.tl[0], corners.tr[0], corners.br[0], corners.bl[0]];
  const ys = [corners.tl[1], corners.tr[1], corners.br[1], corners.bl[1]];
  const left = Math.min(...xs) - pad.left;
  const top = Math.min(...ys) - pad.top;
  const right = Math.max(...xs) + pad.right;
  const bottom = Math.max(...ys) + pad.bottom;
  return { left, top, width: right - left, height: bottom - top };
}
