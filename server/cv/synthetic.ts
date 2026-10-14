/**
 * High-Fidelity Synthetic Lunar Surface Generator
 * Procedural heightmap generation with craters, ejecta rays, regolith roughness,
 * physical solar shadow casting, and PNG encoding.
 */

import { PNG } from 'pngjs';
import { ImageDataBuffer, createEmptyImage } from './filters.ts';

/**
 * Procedural pseudo-random noise generator (seeded)
 */
class SeededRNG {
  private s: number;
  constructor(seed = 19690720) {
    this.s = seed;
  }
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) % 4294967296;
    return this.s / 4294967296;
  }
}

interface Crater {
  cx: number;
  cy: number;
  radius: number;
  depth: number;
  rimHeight: number;
  hasCentralPeak?: boolean;
}

/**
 * Generate underlying lunar digital elevation model (DEM)
 */
function generateLunarDEM(width: number, height: number): Float32Array {
  const dem = new Float32Array(width * height);
  const rng = new SeededRNG(42);

  // 1. Multi-octave background regolith roughness
  const octaves = [
    { scale: 0.008, weight: 18.0 },
    { scale: 0.02, weight: 8.0 },
    { scale: 0.05, weight: 4.0 },
    { scale: 0.12, weight: 1.5 },
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 40.0;
      for (const oct of octaves) {
        val +=
          Math.sin(x * oct.scale + 1.2) * Math.cos(y * oct.scale + 0.8) * oct.weight +
          Math.sin((x + y) * oct.scale * 0.7) * oct.weight * 0.5;
      }
      dem[y * width + x] = val;
    }
  }

  // 2. Complex craters
  const craters: Crater[] = [
    // Main central complex crater (e.g. Shackleton / Tycho analog)
    { cx: width * 0.5, cy: height * 0.5, radius: width * 0.28, depth: 45.0, rimHeight: 22.0, hasCentralPeak: true },
    // Prominent secondary craters
    { cx: width * 0.22, cy: height * 0.28, radius: width * 0.12, depth: 25.0, rimHeight: 12.0 },
    { cx: width * 0.78, cy: height * 0.32, radius: width * 0.14, depth: 28.0, rimHeight: 14.0 },
    { cx: width * 0.75, cy: height * 0.75, radius: width * 0.10, depth: 20.0, rimHeight: 10.0 },
    { cx: width * 0.25, cy: height * 0.78, radius: width * 0.09, depth: 18.0, rimHeight: 9.0 },
    { cx: width * 0.48, cy: height * 0.18, radius: width * 0.06, depth: 14.0, rimHeight: 7.0 },
  ];

  // Add 30 smaller impact craters
  for (let i = 0; i < 35; i++) {
    craters.push({
      cx: rng.next() * width,
      cy: rng.next() * height,
      radius: 4.0 + rng.next() * 12.0,
      depth: 6.0 + rng.next() * 10.0,
      rimHeight: 3.0 + rng.next() * 5.0,
    });
  }

  // Carve craters into DEM
  for (const cr of craters) {
    const minX = Math.max(0, Math.floor(cr.cx - cr.radius * 2.2));
    const maxX = Math.min(width - 1, Math.ceil(cr.cx + cr.radius * 2.2));
    const minY = Math.max(0, Math.floor(cr.cy - cr.radius * 2.2));
    const maxY = Math.min(height - 1, Math.ceil(cr.cy + cr.radius * 2.2));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cr.cx;
        const dy = y - cr.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const r = cr.radius;

        if (d < r) {
          // Inside crater bowl
          const normD = d / r;
          const bowl = -cr.depth * (1.0 - normD * normD);

          // Central peak if large complex crater
          let peak = 0;
          if (cr.hasCentralPeak && normD < 0.25) {
            const peakD = normD / 0.25;
            peak = cr.depth * 0.65 * (1.0 - peakD * peakD);
          }

          dem[y * width + x] += bowl + peak;
        } else if (d < r * 1.8) {
          // Raised crater rim and ejecta blanket
          const rimT = (d - r) / (r * 0.8);
          const rim = cr.rimHeight * Math.exp(-rimT * 2.5);
          dem[y * width + x] += rim;
        }
      }
    }
  }

  return dem;
}

/**
 * Render physical lunar illumination with solar raymarching and albedo
 */
export function renderLunarObservation(
  width: number,
  height: number,
  sunAzimuthDeg: number,
  sunElevationDeg: number,
  rotationDeg = 0,
  scale = 1.0,
  dx = 0,
  dy = 0
): ImageDataBuffer {
  const dem = generateLunarDEM(width, height);
  const image = createEmptyImage(width, height);

  const azRad = (sunAzimuthDeg * Math.PI) / 180;
  const elRad = (sunElevationDeg * Math.PI) / 180;

  // Sun unit vector
  const sunX = Math.cos(azRad) * Math.cos(elRad);
  const sunY = -Math.sin(azRad) * Math.cos(elRad);
  const sunZ = Math.sin(elRad);

  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  // Compute normals and physical ray-traced shadows
  const shadowSteps = 35;
  const stepLength = 2.0;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // Apply acquisition geometry transforms (scale, rotation, offset)
      const cx = px - width / 2;
      const cy = py - height / 2;

      const unrotX = (cx * cosR + cy * sinR) / scale + width / 2 - dx;
      const unrotY = (-cx * sinR + cy * cosR) / scale + height / 2 - dy;

      const ix = Math.min(width - 2, Math.max(1, Math.round(unrotX)));
      const iy = Math.min(height - 2, Math.max(1, Math.round(unrotY)));

      // Surface elevation and normal gradients
      const h0 = dem[iy * width + ix];
      const hL = dem[iy * width + (ix - 1)];
      const hR = dem[iy * width + (ix + 1)];
      const hU = dem[(iy - 1) * width + ix];
      const hD = dem[(iy + 1) * width + ix];

      const dhdx = (hR - hL) * 0.5;
      const dhdy = (hD - hU) * 0.5;

      // Surface normal vector N
      let nx = -dhdx;
      let ny = -dhdy;
      let nz = 1.0;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      // Lambertian diffuse: N . L
      const nDotL = nx * sunX + ny * sunY + nz * sunZ;
      let diffuse = Math.max(0, nDotL);

      // Lunar Hapke/Lommel-Seeliger photometric limb darkening term
      const photometric = diffuse / (diffuse + Math.max(0.1, nz));

      // Shadow ray casting
      let inShadow = false;
      let shadowFactor = 1.0;

      if (diffuse > 0.02) {
        let rayX = ix;
        let rayY = iy;
        let rayZ = h0 + 0.8;

        for (let s = 1; s <= shadowSteps; s++) {
          rayX += sunX * stepLength;
          rayY += sunY * stepLength;
          rayZ += sunZ * stepLength * 1.5;

          const sx = Math.round(rayX);
          const sy = Math.round(rayY);

          if (sx < 0 || sx >= width || sy < 0 || sy >= height) break;

          const terrH = dem[sy * width + sx];
          if (rayZ < terrH) {
            inShadow = true;
            shadowFactor = 0.08; // deep lunar shadow
            break;
          }
        }
      } else {
        shadowFactor = 0.08;
      }

      // Lunar albedo variation (highlands regolith 0.12 vs mare 0.07 + bright ejecta rays)
      const distFromCenter = Math.sqrt((ix - width * 0.5) ** 2 + (iy - height * 0.5) ** 2);
      let albedo = 0.75 + Math.sin(ix * 0.03) * 0.05 + Math.cos(iy * 0.03) * 0.05;

      // Radial ejecta rays from central crater
      const angle = Math.atan2(iy - height * 0.5, ix - width * 0.5);
      const rayPattern = Math.abs(Math.sin(angle * 6.0)) ** 4 * Math.exp(-distFromCenter / (width * 0.5));
      albedo += rayPattern * 0.35;

      // Final intensity (ambient + direct)
      const ambient = 0.07;
      const totalLight = (ambient + photometric * shadowFactor * 1.25) * albedo;
      const intensity = Math.min(255, Math.max(12, Math.round(totalLight * 190.0)));

      const outIdx = (py * width + px) * 4;
      image.data[outIdx] = intensity;
      image.data[outIdx + 1] = intensity;
      image.data[outIdx + 2] = intensity;
      image.data[outIdx + 3] = 255;
    }
  }

  return image;
}

/**
 * Convert ImageDataBuffer to Base64 PNG data URL
 */
export function imageBufferToDataURL(img: ImageDataBuffer): string {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data);
  const buffer = PNG.sync.write(png);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Convert Base64 or Buffer to ImageDataBuffer
 */
export function pngBufferToImageData(buffer: Buffer): ImageDataBuffer {
  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    data: new Uint8Array(png.data),
  };
}
