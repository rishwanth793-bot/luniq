/**
 * Computer Vision Feature Extraction
 * FAST/Harris Keypoint Detection + 128-d SIFT-like Oriented Gradient Descriptors
 */

import { computeSobelGradients } from './filters.ts';

export interface Keypoint {
  x: number;
  y: number;
  size: number;
  angle: number;
  response: number;
  octave: number;
}

export interface FeatureSet {
  keypoints: Keypoint[];
  descriptors: Float32Array[]; // Array of 128-dimensional float vectors
  processingTimeMs: number;
}

/**
 * Detect Harris corner keypoints with Non-Maximum Suppression (NMS)
 */
export function detectKeypoints(
  gray: Float32Array,
  width: number,
  height: number,
  maxKeypoints = 350,
  threshold = 12.0
): Keypoint[] {
  const { dx, dy, magnitude, orientation } = computeSobelGradients(gray, width, height);
  const responseMap = new Float32Array(width * height);
  const k = 0.04;
  const radius = 2;

  // Compute Harris matrix [A B; B C] for each pixel
  for (let y = radius + 2; y < height - radius - 2; y++) {
    for (let x = radius + 2; x < width - radius - 2; x++) {
      let a = 0;
      let b = 0;
      let c = 0;
      for (let dyk = -radius; dyk <= radius; dyk++) {
        for (let dxk = -radius; dxk <= radius; dxk++) {
          const idx = (y + dyk) * width + (x + dxk);
          const gx = dx[idx];
          const gy = dy[idx];
          a += gx * gx;
          b += gx * gy;
          c += gy * gy;
        }
      }
      const det = a * c - b * b;
      const trace = a + c;
      const harris = det - k * trace * trace;
      if (harris > threshold * 1000) {
        responseMap[y * width + x] = harris;
      }
    }
  }

  // Non-Maximum Suppression (NMS) in 7x7 window
  const nmsRadius = 3;
  const candidates: Keypoint[] = [];

  for (let y = nmsRadius + 3; y < height - nmsRadius - 3; y++) {
    for (let x = nmsRadius + 3; x < width - nmsRadius - 3; x++) {
      const centerVal = responseMap[y * width + x];
      if (centerVal <= 0) continue;

      let isMax = true;
      for (let dyk = -nmsRadius; dyk <= nmsRadius; dyk++) {
        for (let dxk = -nmsRadius; dxk <= nmsRadius; dxk++) {
          if (dyk === 0 && dxk === 0) continue;
          if (responseMap[(y + dyk) * width + (x + dxk)] >= centerVal) {
            isMax = false;
            break;
          }
        }
        if (!isMax) break;
      }

      if (isMax) {
        candidates.push({
          x,
          y,
          size: 8.0,
          angle: orientation[y * width + x],
          response: centerVal,
          octave: 0,
        });
      }
    }
  }

  // Sort by response descending and cap to maxKeypoints
  candidates.sort((a, b) => b.response - a.response);
  return candidates.slice(0, maxKeypoints);
}

/**
 * Extract 128-dimensional SIFT-like descriptors
 * 4x4 grid of spatial cells x 8 orientation bins
 */
export function extractSIFTDescriptors(
  gray: Float32Array,
  width: number,
  height: number,
  keypoints: Keypoint[]
): Float32Array[] {
  const { magnitude, orientation } = computeSobelGradients(gray, width, height);
  const descriptors: Float32Array[] = [];

  for (const kp of keypoints) {
    const desc = new Float32Array(128);
    const kpX = Math.round(kp.x);
    const kpY = Math.round(kp.y);
    const mainAngle = kp.angle;
    const cosA = Math.cos(-mainAngle);
    const sinA = Math.sin(-mainAngle);

    // 16x16 patch around keypoint divided into 4x4 subregions of 4x4 pixels each
    const patchRadius = 8;

    for (let py = -patchRadius; py < patchRadius; py++) {
      for (let px = -patchRadius; px < patchRadius; px++) {
        // Rotate coords relative to keypoint dominant orientation
        const rotX = px * cosA - py * sinA;
        const rotY = px * sinA + py * cosA;

        // Subregion index (0 to 3)
        const subX = Math.floor((rotX + patchRadius) / 4);
        const subY = Math.floor((rotY + patchRadius) / 4);

        if (subX < 0 || subX >= 4 || subY < 0 || subY >= 4) continue;

        const imgX = kpX + px;
        const imgY = kpY + py;

        if (imgX < 0 || imgX >= width || imgY < 0 || imgY >= height) continue;

        const mag = magnitude[imgY * width + imgX];
        let ori = orientation[imgY * width + imgX] - mainAngle;
        while (ori < 0) ori += 2 * Math.PI;
        while (ori >= 2 * Math.PI) ori -= 2 * Math.PI;

        // 8 orientation bins
        const bin = Math.min(7, Math.floor((ori / (2 * Math.PI)) * 8));
        const descIdx = (subY * 4 + subX) * 8 + bin;

        // Gaussian spatial weighting
        const distSq = px * px + py * py;
        const weight = Math.exp(-distSq / 32.0);

        desc[descIdx] += mag * weight;
      }
    }

    // L2 Normalization with illumination threshold clipping (0.2)
    let norm = 0;
    for (let i = 0; i < 128; i++) {
      norm += desc[i] * desc[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-6) {
      for (let i = 0; i < 128; i++) desc[i] /= norm;
      // Clip to 0.2 to reduce non-linear illumination effects
      norm = 0;
      for (let i = 0; i < 128; i++) {
        desc[i] = Math.min(0.2, desc[i]);
        norm += desc[i] * desc[i];
      }
      norm = Math.sqrt(norm);
      if (norm > 1e-6) {
        for (let i = 0; i < 128; i++) desc[i] /= norm;
      }
    }

    descriptors.push(desc);
  }

  return descriptors;
}
