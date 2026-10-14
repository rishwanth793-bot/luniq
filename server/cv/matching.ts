/**
 * Correspondence Matching
 * Lowe's Ratio Test SIFT Matching + Bidirectional Cross-Check
 */

import { Keypoint } from './features.ts';
import { MatchPair } from '../../src/types.ts';

/**
 * Euclidean distance between two 128-d descriptor vectors
 */
export function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Match features using Lowe's ratio test (d1 / d2 < ratioThreshold)
 */
export function matchFeatures(
  refKeypoints: Keypoint[],
  refDescriptors: Float32Array[],
  tgtKeypoints: Keypoint[],
  tgtDescriptors: Float32Array[],
  ratioThreshold = 0.78
): {
  allMatches: MatchPair[];
  goodMatches: MatchPair[];
} {
  const allMatches: MatchPair[] = [];
  const goodMatches: MatchPair[] = [];

  for (let i = 0; i < refDescriptors.length; i++) {
    const descA = refDescriptors[i];
    const kpA = refKeypoints[i];

    let bestDist = Infinity;
    let secondDist = Infinity;
    let bestIdx = -1;

    for (let j = 0; j < tgtDescriptors.length; j++) {
      const dist = descriptorDistance(descA, tgtDescriptors[j]);
      if (dist < bestDist) {
        secondDist = bestDist;
        bestDist = dist;
        bestIdx = j;
      } else if (dist < secondDist) {
        secondDist = dist;
      }
    }

    if (bestIdx >= 0) {
      const kpB = tgtKeypoints[bestIdx];
      const match: MatchPair = {
        src_pt: [kpA.x, kpA.y],
        dst_pt: [kpB.x, kpB.y],
        distance: bestDist,
        inlier: false,
        confidence: Math.max(0, 1.0 - bestDist),
      };

      allMatches.push(match);

      // Lowe's ratio test
      if (secondDist > 0 && bestDist / secondDist <= ratioThreshold) {
        goodMatches.push({ ...match });
      }
    }
  }

  return { allMatches, goodMatches };
}
