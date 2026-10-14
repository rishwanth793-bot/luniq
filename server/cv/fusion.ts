/**
 * Illumination Normalization & Seamless Multi-Observation Fusion
 * Local gain/offset matching + distance-feathered blending + source map generation
 */

import { SourceSelection } from '../../src/types.ts';
import { ImageDataBuffer, createEmptyImage, toGrayscale } from './filters.ts';

// Color map for source visualization
export const SOURCE_COLORS: Record<string, [number, number, number]> = {
  A: [0, 220, 255],   // Cyan
  B: [16, 217, 137],  // Emerald
  C: [251, 146, 60],  // Amber/Orange
  D: [192, 132, 252], // Violet/Fuchsia
  E: [244, 114, 182], // Pink
  F: [250, 204, 21],  // Yellow
  G: [96, 165, 250],  // Sky Blue
};

/**
 * Normalize illumination between warped target and reference image
 * using local mean and standard deviation gain/offset matching
 */
export function normalizeIllumination(
  target: ImageDataBuffer,
  reference: ImageDataBuffer
): ImageDataBuffer {
  const { width, height, data: td } = target;
  const { data: rd } = reference;
  const normalized = createEmptyImage(width, height);

  // Compute global mean and std of non-shadow pixels in reference and target
  let rSum = 0, rCount = 0, rSq = 0;
  let tSum = 0, tCount = 0, tSq = 0;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const rVal = rd[idx];
    const tVal = td[idx];

    if (rVal > 25 && rVal < 240) {
      rSum += rVal;
      rSq += rVal * rVal;
      rCount++;
    }
    if (tVal > 25 && tVal < 240) {
      tSum += tVal;
      tSq += tVal * tVal;
      tCount++;
    }
  }

  const rMean = rCount > 0 ? rSum / rCount : 128;
  const rStd = rCount > 0 ? Math.sqrt(Math.max(1, rSq / rCount - rMean * rMean)) : 40;

  const tMean = tCount > 0 ? tSum / tCount : 128;
  const tStd = tCount > 0 ? Math.sqrt(Math.max(1, tSq / tCount - tMean * tMean)) : 40;

  const gain = Math.min(1.5, Math.max(0.6, rStd / tStd));
  const offset = rMean - gain * tMean;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    for (let c = 0; c < 3; c++) {
      const orig = td[idx + c];
      const matched = gain * orig + offset;
      normalized.data[idx + c] = Math.min(255, Math.max(0, Math.round(matched)));
    }
    normalized.data[idx + 3] = 255;
  }

  return normalized;
}

/**
 * Fuses observations according to local source selections with distance feathering
 */
export function fuseObservations(
  observations: Record<string, ImageDataBuffer>, // code -> aligned & normalized image
  selections: SourceSelection[],
  gridCount: 4 | 8 | 16,
  width: number,
  height: number
): {
  fusedImage: ImageDataBuffer;
  sourceMapImage: ImageDataBuffer;
  sourceDistribution: Record<string, number>;
  meanQuality: number;
} {
  const fusedImage = createEmptyImage(width, height);
  const sourceMapImage = createEmptyImage(width, height);

  const cellW = width / gridCount;
  const cellH = height / gridCount;

  // Build grid code lookup matrix
  const gridMatrix: string[][] = [];
  let totalScore = 0;
  const sourceCount: Record<string, number> = {};

  const defaultCode = Object.keys(observations)[0] || 'A';
  const fallbackImg = observations[defaultCode] || Object.values(observations)[0];

  for (let r = 0; r < gridCount; r++) {
    gridMatrix[r] = [];
    for (let c = 0; c < gridCount; c++) {
      const sel = selections.find((s) => s.row_index === r && s.column_index === c);
      const code = sel ? sel.selected_code : defaultCode;
      gridMatrix[r][c] = code;
      if (sel) totalScore += sel.selection_score;
      sourceCount[code] = (sourceCount[code] || 0) + 1;
    }
  }

  const totalCells = gridCount * gridCount;
  const meanQuality = Number((totalScore / Math.max(1, totalCells)).toFixed(3));
  const sourceDistribution: Record<string, number> = {};
  for (const code of Object.keys(sourceCount)) {
    sourceDistribution[code] = Number(((sourceCount[code] / totalCells) * 100).toFixed(1));
  }

  // Feather blend margin in pixels
  const featherDist = 6;

  for (let y = 0; y < height; y++) {
    const r = Math.min(gridCount - 1, Math.max(0, Math.floor(y / cellH)));
    const localY = y - r * cellH;

    for (let x = 0; x < width; x++) {
      const c = Math.min(gridCount - 1, Math.max(0, Math.floor(x / cellW)));
      const localX = x - c * cellW;

      const primaryCode = gridMatrix[r][c];
      const primaryImg = observations[primaryCode] || fallbackImg;
      const outIdx = (y * width + x) * 4;

      if (!primaryImg) continue;

      // Check distance to cell boundary for feathering
      const distLeft = localX;
      const distRight = cellW - localX;
      const distTop = localY;
      const distBottom = cellH - localY;
      const minDist = Math.min(distLeft, distRight, distTop, distBottom);

      // Render Source Contribution Map
      const color = SOURCE_COLORS[primaryCode] || [140, 140, 140];
      // Darken grid borders slightly
      const isBorder = distLeft < 2 || distRight < 2 || distTop < 2 || distBottom < 2;
      const baseGray = primaryImg.data[outIdx]; // blend with underlying terrain
      sourceMapImage.data[outIdx] = isBorder ? 20 : Math.round(color[0] * 0.7 + baseGray * 0.3);
      sourceMapImage.data[outIdx + 1] = isBorder ? 20 : Math.round(color[1] * 0.7 + baseGray * 0.3);
      sourceMapImage.data[outIdx + 2] = isBorder ? 20 : Math.round(color[2] * 0.7 + baseGray * 0.3);
      sourceMapImage.data[outIdx + 3] = 255;

      // Render Fused Reconstruction Image
      if (minDist < featherDist && (r > 0 || r < gridCount - 1 || c > 0 || c < gridCount - 1)) {
        // Weighted blend with neighbor
        let neighborCode = primaryCode;
        if (minDist === distLeft && c > 0) neighborCode = gridMatrix[r][c - 1];
        else if (minDist === distRight && c < gridCount - 1) neighborCode = gridMatrix[r][c + 1];
        else if (minDist === distTop && r > 0) neighborCode = gridMatrix[r - 1][c];
        else if (minDist === distBottom && r < gridCount - 1) neighborCode = gridMatrix[r + 1][c];

        const neighborImg = observations[neighborCode] || primaryImg;
        // Smooth Hermite interpolation factor: 0.5 at edge, 1.0 at interior
        const t = minDist / featherDist;
        const alpha = 0.5 + 0.5 * (3 * t * t - 2 * t * t * t);

        for (let ch = 0; ch < 3; ch++) {
          const valP = primaryImg.data[outIdx + ch];
          const valN = neighborImg.data[outIdx + ch];
          fusedImage.data[outIdx + ch] = Math.round(alpha * valP + (1 - alpha) * valN);
        }
        fusedImage.data[outIdx + 3] = 255;
      } else {
        // Pure primary observation
        fusedImage.data[outIdx] = primaryImg.data[outIdx];
        fusedImage.data[outIdx + 1] = primaryImg.data[outIdx + 1];
        fusedImage.data[outIdx + 2] = primaryImg.data[outIdx + 2];
        fusedImage.data[outIdx + 3] = 255;
      }
    }
  }

  return {
    fusedImage,
    sourceMapImage,
    sourceDistribution,
    meanQuality,
  };
}
