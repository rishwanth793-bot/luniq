/**
 * LUNIQ Prototype Local Quality Model
 * Evaluates image quality independently for each local grid tile
 */

import { GridCell, AnalysisConfiguration } from '../../src/types.ts';
import {
  ImageDataBuffer,
  toGrayscale,
  computeLaplacian,
  computeLaplacianVariance,
  computeRMSContrast,
  computeSobelGradients,
} from './filters.ts';
import { Keypoint } from './features.ts';

export function evaluateGridQuality(
  analysisId: string,
  observationId: string,
  observationCode: string,
  image: ImageDataBuffer,
  gridCount: 4 | 8 | 16,
  keypoints: Keypoint[],
  reprojectionError = 1.2,
  config?: AnalysisConfiguration['quality_weights']
): GridCell[] {
  const { width, height } = image;
  const gray = toGrayscale(image);
  const lap = computeLaplacian(gray, width, height);
  const { magnitude } = computeSobelGradients(gray, width, height);

  const cellW = width / gridCount;
  const cellH = height / gridCount;
  const cells: GridCell[] = [];

  const weights = config || {
    sharpness: 0.25,
    contrast: 0.20,
    texture: 0.15,
    feature_strength: 0.15,
    illumination: 0.15,
    registration: 0.10,
    shadow_penalty: 0.20,
    reprojection_penalty: 0.10,
  };

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const rx = Math.floor(c * cellW);
      const ry = Math.floor(r * cellH);
      const rw = Math.floor(cellW);
      const rh = Math.floor(cellH);

      // 1. Sharpness (Laplacian Variance)
      const rawLapVar = computeLaplacianVariance(lap, width, rx, ry, rw, rh);
      const sharpness = Math.min(1.0, rawLapVar / 350.0);

      // 2. Contrast (RMS Contrast)
      const rawContrast = computeRMSContrast(gray, width, rx, ry, rw, rh);
      const contrast = Math.min(1.0, rawContrast / 60.0);

      // 3. Texture (Gradient energy)
      let magSum = 0;
      let pixelCount = 0;
      let shadowCount = 0;
      let satCount = 0;

      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const idx = y * width + x;
          magSum += magnitude[idx];
          const val = gray[idx];
          if (val < 26) shadowCount++;
          if (val > 240) satCount++;
          pixelCount++;
        }
      }

      const meanMag = pixelCount > 0 ? magSum / pixelCount : 0;
      const texture = Math.min(1.0, meanMag / 50.0);

      // Shadow and Saturation
      const shadowCoverage = pixelCount > 0 ? shadowCount / pixelCount : 0;
      const saturationRatio = pixelCount > 0 ? satCount / pixelCount : 0;

      // 4. Feature Strength
      const kpsInCell = keypoints.filter(
        (kp) => kp.x >= rx && kp.x < rx + rw && kp.y >= ry && kp.y < ry + rh
      );
      const featureStrength = Math.min(1.0, kpsInCell.length / 8.0);

      // 5. Illumination Quality (penalize extreme shadows and saturated glints)
      const illuminationQuality = Math.max(0, 1.0 - shadowCoverage * 0.8 - saturationRatio * 0.5);

      // 6. Registration Confidence
      const registrationConfidence = Math.max(0, Math.min(1.0, 1.0 - reprojectionError / 5.0));

      // Composite Quality Score
      let score =
        weights.sharpness * sharpness +
        weights.contrast * contrast +
        weights.texture * texture +
        weights.feature_strength * featureStrength +
        weights.illumination * illuminationQuality +
        weights.registration * registrationConfidence -
        weights.shadow_penalty * shadowCoverage -
        weights.reprojection_penalty * (reprojectionError / 10.0);

      score = Math.max(0.01, Math.min(0.99, score));

      cells.push({
        id: `grid_${analysisId}_${observationCode}_${r}_${c}`,
        analysis_id: analysisId,
        observation_id: observationId,
        observation_code: observationCode,
        row_index: r,
        column_index: c,
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        quality_score: Number(score.toFixed(3)),
        sharpness: Number(sharpness.toFixed(3)),
        contrast: Number(contrast.toFixed(3)),
        texture: Number(texture.toFixed(3)),
        feature_strength: Number(featureStrength.toFixed(3)),
        illumination_quality: Number(illuminationQuality.toFixed(3)),
        shadow_coverage: Number(shadowCoverage.toFixed(3)),
        registration_confidence: Number(registrationConfidence.toFixed(3)),
        reprojection_error: Number(reprojectionError.toFixed(3)),
        selected: false,
        source_observation_id: observationId,
      });
    }
  }

  return cells;
}
