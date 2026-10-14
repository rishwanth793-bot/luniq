/**
 * Classical Computer Vision Filters
 * Fast, pure TypeScript algorithms for image processing
 */

export interface ImageDataBuffer {
  width: number;
  height: number;
  data: Uint8Array; // RGBA 4 bytes per pixel
}

export function createEmptyImage(width: number, height: number): ImageDataBuffer {
  return {
    width,
    height,
    data: new Uint8Array(width * height * 4),
  };
}

export function toGrayscale(img: ImageDataBuffer): Float32Array {
  const { width, height, data } = img;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    // Standard photometric luminance weights
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return gray;
}

export function grayscaleToImageData(gray: Float32Array, width: number, height: number): ImageDataBuffer {
  const img = createEmptyImage(width, height);
  for (let i = 0; i < width * height; i++) {
    const val = Math.min(255, Math.max(0, Math.round(gray[i])));
    const idx = i * 4;
    img.data[idx] = val;
    img.data[idx + 1] = val;
    img.data[idx + 2] = val;
    img.data[idx + 3] = 255;
  }
  return img;
}

/**
 * 2D Gaussian Blur (Separable 5x5 kernel)
 */
export function gaussianBlur(gray: Float32Array, width: number, height: number, sigma = 1.2): Float32Array {
  const kernel = [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
  const half = 2;
  const temp = new Float32Array(width * height);
  const result = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -half; k <= half; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k));
        sum += gray[y * width + px] * kernel[k + half];
      }
      temp[y * width + x] = sum;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -half; k <= half; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k));
        sum += temp[py * width + x] * kernel[k + half];
      }
      result[y * width + x] = sum;
    }
  }

  return result;
}

/**
 * Sobel Gradients
 */
export function computeSobelGradients(gray: Float32Array, width: number, height: number): {
  dx: Float32Array;
  dy: Float32Array;
  magnitude: Float32Array;
  orientation: Float32Array;
} {
  const dx = new Float32Array(width * height);
  const dy = new Float32Array(width * height);
  const magnitude = new Float32Array(width * height);
  const orientation = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Sobel horizontal
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] -
        2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];

      // Sobel vertical
      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      dx[idx] = gx;
      dy[idx] = gy;
      const mag = Math.sqrt(gx * gx + gy * gy);
      magnitude[idx] = mag;
      orientation[idx] = Math.atan2(gy, gx);
    }
  }

  return { dx, dy, magnitude, orientation };
}

/**
 * Laplacian Operator (for sharpness estimation)
 */
export function computeLaplacian(gray: Float32Array, width: number, height: number): Float32Array {
  const lap = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      const val =
        gray[(y - 1) * width + x] +
        gray[(y + 1) * width + x] +
        gray[y * width + (x - 1)] +
        gray[y * width + (x + 1)] -
        4 * center;
      lap[y * width + x] = val;
    }
  }
  return lap;
}

/**
 * Variance of Laplacian in a bounding box
 * High variance = sharp edges; low variance = blurry
 */
export function computeLaplacianVariance(
  lap: Float32Array,
  width: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): number {
  let sum = 0;
  let count = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      sum += lap[y * width + x];
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;

  let sqDiff = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const diff = lap[y * width + x] - mean;
      sqDiff += diff * diff;
    }
  }
  return sqDiff / count;
}

/**
 * RMS Contrast in a bounding box
 */
export function computeRMSContrast(
  gray: Float32Array,
  width: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): number {
  let sum = 0;
  let count = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      sum += gray[y * width + x];
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;

  let sqDiff = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const diff = gray[y * width + x] - mean;
      sqDiff += diff * diff;
    }
  }
  return Math.sqrt(sqDiff / count);
}

/**
 * CLAHE (Contrast-Limited Adaptive Histogram Equalization)
 */
export function applyCLAHE(
  gray: Float32Array,
  width: number,
  height: number,
  gridCount = 8,
  clipLimit = 2.5
): Float32Array {
  const result = new Float32Array(width * height);
  const tileW = width / gridCount;
  const tileH = height / gridCount;

  // Compute histograms for each tile
  const histograms: Float32Array[] = [];
  for (let gy = 0; gy < gridCount; gy++) {
    for (let gx = 0; gx < gridCount; gx++) {
      const hist = new Float32Array(256);
      const x0 = Math.floor(gx * tileW);
      const x1 = Math.floor((gx + 1) * tileW);
      const y0 = Math.floor(gy * tileH);
      const y1 = Math.floor((gy + 1) * tileH);
      const numPixels = (x1 - x0) * (y1 - y0);

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const bin = Math.min(255, Math.max(0, Math.round(gray[y * width + x])));
          hist[bin]++;
        }
      }

      // Clip histogram
      const clipVal = (clipLimit * numPixels) / 256;
      let excess = 0;
      for (let b = 0; b < 256; b++) {
        if (hist[b] > clipVal) {
          excess += hist[b] - clipVal;
          hist[b] = clipVal;
        }
      }
      const redist = excess / 256;
      for (let b = 0; b < 256; b++) {
        hist[b] += redist;
      }

      // Compute CDF
      let cdf = 0;
      for (let b = 0; b < 256; b++) {
        cdf += hist[b];
        hist[b] = (cdf / numPixels) * 255;
      }

      histograms.push(hist);
    }
  }

  // Bilinear interpolation across tile centers
  for (let y = 0; y < height; y++) {
    const gy = Math.min(gridCount - 1, Math.max(0, (y - tileH / 2) / tileH));
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(gridCount - 1, gy0 + 1);
    const wy = gy - gy0;

    for (let x = 0; x < width; x++) {
      const gx = Math.min(gridCount - 1, Math.max(0, (x - tileW / 2) / tileW));
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(gridCount - 1, gx0 + 1);
      const wx = gx - gx0;

      const val = Math.min(255, Math.max(0, Math.round(gray[y * width + x])));

      const c00 = histograms[gy0 * gridCount + gx0][val];
      const c10 = histograms[gy0 * gridCount + gx1][val];
      const c01 = histograms[gy1 * gridCount + gx0][val];
      const c11 = histograms[gy1 * gridCount + gx1][val];

      const top = (1 - wx) * c00 + wx * c10;
      const bot = (1 - wx) * c01 + wx * c11;
      result[y * width + x] = (1 - wy) * top + wy * bot;
    }
  }

  return result;
}
