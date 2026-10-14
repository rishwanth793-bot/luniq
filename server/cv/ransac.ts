/**
 * Robust Transformation Estimation & Warping
 * RANSAC Homography / Affine + Bilinear Warping + Reprojection Error Analysis
 */

import { MatchPair } from '../../src/types.ts';
import { ImageDataBuffer, createEmptyImage } from './filters.ts';

/**
 * Solve 3x3 Homography from 4 point correspondences using Direct Linear Transformation (DLT)
 * with SVD / Gaussian Elimination
 */
function are3PointsCollinear(p1: [number, number], p2: [number, number], p3: [number, number]): boolean {
  // Area of triangle via 2D cross product: (x2-x1)*(y3-y1) - (y2-y1)*(x3-x1)
  const area2 = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
  return Math.abs(area2) < 1e-4;
}

function hasCollinearTriplet(pts: [number, number][]): boolean {
  if (are3PointsCollinear(pts[0], pts[1], pts[2])) return true;
  if (are3PointsCollinear(pts[0], pts[1], pts[3])) return true;
  if (are3PointsCollinear(pts[0], pts[2], pts[3])) return true;
  if (are3PointsCollinear(pts[1], pts[2], pts[3])) return true;
  return false;
}

export function estimateHomography4Points(
  srcPts: [number, number][],
  dstPts: [number, number][]
): number[][] | null {
  if (srcPts.length < 4 || dstPts.length < 4) return null;

  // Reject degenerate configurations where 3 or more points are collinear
  if (hasCollinearTriplet(srcPts) || hasCollinearTriplet(dstPts)) {
    return null;
  }

  // Build 8x9 linear system Ah = 0
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = srcPts[i];
    const [u, v] = dstPts[i];
    // Eq 1: -x, -y, -1, 0, 0, 0, u*x, u*y, u
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    // Eq 2: 0, 0, 0, -x, -y, -1, v*x, v*y, v
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }

  // Gaussian elimination with partial pivoting to find kernel vector
  const m = 8;
  const n = 9;

  for (let col = 0; col < m; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(A[row][col]) > maxVal) {
        maxVal = Math.abs(A[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-9) return null; // Rank deficient / singular configuration

    // Swap
    const temp = A[col];
    A[col] = A[maxRow];
    A[maxRow] = temp;

    // Eliminate
    const pivot = A[col][col];
    for (let k = col; k < n; k++) A[col][k] /= pivot;

    for (let row = 0; row < m; row++) {
      if (row !== col) {
        const factor = A[row][col];
        for (let k = col; k < n; k++) {
          A[row][k] -= factor * A[col][k];
        }
      }
    }
  }

  // Back-substitute with h[8] = 1.0
  const h = new Float64Array(9);
  h[8] = 1.0;
  for (let i = 7; i >= 0; i--) {
    h[i] = -A[i][8];
  }

  // Check condition / NaN
  for (let i = 0; i < 9; i++) {
    if (isNaN(h[i]) || !isFinite(h[i])) return null;
  }

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]],
  ];
}

/**
 * Apply Homography to a 2D point
 */
export function applyHomography(H: number[][], x: number, y: number): [number, number] {
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(w) < 1e-9 || isNaN(w)) return [x, y];
  const px = (H[0][0] * x + H[0][1] * y + H[0][2]) / w;
  const py = (H[1][0] * x + H[1][1] * y + H[1][2]) / w;
  if (isNaN(px) || isNaN(py) || !isFinite(px) || !isFinite(py)) return [x, y];
  return [px, py];
}

/**
 * Invert 3x3 matrix
 */
export function invert3x3(M: number[][]): number[][] | null {
  const [a, b, c] = M[0];
  const [d, e, f] = M[1];
  const [g, h, i] = M[2];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;

  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    [A * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [B * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [C * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

/**
 * RANSAC Homography Estimation
 */
export function runRANSAC(
  matches: MatchPair[],
  maxIterations = 600,
  threshold = 3.5
): {
  H: number[][];
  inliers: MatchPair[];
  inlierRatio: number;
  meanReprojectionError: number;
  medianReprojectionError: number;
  maxReprojectionError: number;
} {
  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  if (matches.length < 4) {
    return {
      H: identity,
      inliers: matches,
      inlierRatio: 0,
      meanReprojectionError: 0,
      medianReprojectionError: 0,
      maxReprojectionError: 0,
    };
  }

  let bestH = identity;
  let bestInlierCount = 0;
  let bestInliers: MatchPair[] = [];
  let bestErrors: number[] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    // Pick 4 unique random match pairs
    const indices: number[] = [];
    while (indices.length < 4) {
      const idx = Math.floor(Math.random() * matches.length);
      if (!indices.includes(idx)) indices.push(idx);
    }

    const srcSample = indices.map((i) => matches[i].src_pt);
    const dstSample = indices.map((i) => matches[i].dst_pt);

    const H = estimateHomography4Points(srcSample, dstSample);
    if (!H) continue;

    // Test all points
    const currentInliers: MatchPair[] = [];
    const currentErrors: number[] = [];

    for (const m of matches) {
      const [projX, projY] = applyHomography(H, m.src_pt[0], m.src_pt[1]);
      const dx = projX - m.dst_pt[0];
      const dy = projY - m.dst_pt[1];
      const error = Math.sqrt(dx * dx + dy * dy);

      if (error < threshold) {
        currentInliers.push({ ...m, inlier: true });
        currentErrors.push(error);
      }
    }

    if (currentInliers.length > bestInlierCount) {
      bestInlierCount = currentInliers.length;
      bestInliers = currentInliers;
      bestErrors = currentErrors;
      bestH = H;
    }
  }

  // If we found a good subset, re-estimate using all inliers or keep best
  const inlierRatio = matches.length > 0 ? bestInlierCount / matches.length : 0;
  bestErrors.sort((a, b) => a - b);

  const meanError =
    bestErrors.length > 0 ? bestErrors.reduce((a, b) => a + b, 0) / bestErrors.length : 0;
  const medianError =
    bestErrors.length > 0 ? bestErrors[Math.floor(bestErrors.length / 2)] : 0;
  const maxError = bestErrors.length > 0 ? bestErrors[bestErrors.length - 1] : 0;

  // Mark all original matches with inlier flag
  const markedMatches = matches.map((m) => {
    const [projX, projY] = applyHomography(bestH, m.src_pt[0], m.src_pt[1]);
    const dx = projX - m.dst_pt[0];
    const dy = projY - m.dst_pt[1];
    const error = Math.sqrt(dx * dx + dy * dy);
    return {
      ...m,
      inlier: error < threshold,
    };
  });

  return {
    H: bestH,
    inliers: markedMatches,
    inlierRatio,
    meanReprojectionError: Number(meanError.toFixed(3)),
    medianReprojectionError: Number(medianError.toFixed(3)),
    maxReprojectionError: Number(maxError.toFixed(3)),
  };
}

/**
 * Warp target image into reference coordinate system using backward bilinear sampling
 */
export function warpImageHomography(
  target: ImageDataBuffer,
  H: number[][], // transforms src (reference) coords into dst (target) coords
  outWidth: number,
  outHeight: number
): ImageDataBuffer {
  const result = createEmptyImage(outWidth, outHeight);
  const { width: tw, height: th, data: td } = target;

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      // Find where reference point (x, y) maps in target image
      const [tx, ty] = applyHomography(H, x, y);

      if (!isNaN(tx) && !isNaN(ty) && tx >= 0 && tx < tw - 1 && ty >= 0 && ty < th - 1) {
        // Bilinear interpolation
        const x0 = Math.floor(tx);
        const x1 = x0 + 1;
        const y0 = Math.floor(ty);
        const y1 = y0 + 1;

        const wx = tx - x0;
        const wy = ty - y0;

        const idx00 = (y0 * tw + x0) * 4;
        const idx10 = (y0 * tw + x1) * 4;
        const idx01 = (y1 * tw + x0) * 4;
        const idx11 = (y1 * tw + x1) * 4;

        const outIdx = (y * outWidth + x) * 4;

        for (let c = 0; c < 3; c++) {
          const top = (1 - wx) * td[idx00 + c] + wx * td[idx10 + c];
          const bot = (1 - wx) * td[idx01 + c] + wx * td[idx11 + c];
          result.data[outIdx + c] = Math.round((1 - wy) * top + wy * bot);
        }
        result.data[outIdx + 3] = 255;
      } else {
        // Outside bounds: transparent or neutral dark
        const outIdx = (y * outWidth + x) * 4;
        result.data[outIdx] = 10;
        result.data[outIdx + 1] = 12;
        result.data[outIdx + 2] = 16;
        result.data[outIdx + 3] = 255;
      }
    }
  }

  return result;
}

/**
 * Generate visual difference image
 */
export function computeDifferenceImage(
  ref: ImageDataBuffer,
  warped: ImageDataBuffer
): ImageDataBuffer {
  const { width, height } = ref;
  const diff = createEmptyImage(width, height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const rRef = ref.data[idx];
    const rWarp = warped.data[idx];
    const delta = Math.abs(rRef - rWarp);

    // Heatmap coloring for difference: 0 = dark blue, medium = yellow, high = bright red
    diff.data[idx] = Math.min(255, delta * 3);
    diff.data[idx + 1] = Math.min(255, Math.max(0, 255 - delta * 2));
    diff.data[idx + 2] = Math.min(255, 128 - Math.abs(delta - 64) * 2);
    diff.data[idx + 3] = 255;
  }

  return diff;
}
