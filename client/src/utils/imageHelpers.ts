/**
 * Advanced image processing helpers for filter implementations
 */

import type { LegoColor } from './legoColors';
import { findClosestLegoColor } from './legoColors';

/**
 * RGB to Lab color space conversion (for perceptual color distance)
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // Normalize RGB to 0-1
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  // Convert to linear RGB
  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  // Convert to XYZ (D65 illuminant)
  const x = (rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375) * 100;
  const y = (rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750) * 100;
  const z = (rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041) * 100;

  // Normalize for D65 white point
  let xNorm = x / 95.047;
  let yNorm = y / 100.000;
  let zNorm = z / 108.883;

  // Convert to Lab
  xNorm = xNorm > 0.008856 ? Math.pow(xNorm, 1/3) : (7.787 * xNorm) + (16/116);
  yNorm = yNorm > 0.008856 ? Math.pow(yNorm, 1/3) : (7.787 * yNorm) + (16/116);
  zNorm = zNorm > 0.008856 ? Math.pow(zNorm, 1/3) : (7.787 * zNorm) + (16/116);

  const L = (116 * yNorm) - 16;
  const a = 500 * (xNorm - yNorm);
  const b_ = 200 * (yNorm - zNorm);

  return [L, a, b_];
}

/**
 * Lab to RGB color space conversion
 */
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;

  const x3 = Math.pow(x, 3);
  const y3 = Math.pow(y, 3);
  const z3 = Math.pow(z, 3);

  x = (x3 > 0.008856 ? x3 : (x - 16/116) / 7.787) * 95.047;
  y = (y3 > 0.008856 ? y3 : (y - 16/116) / 7.787) * 100.000;
  z = (z3 > 0.008856 ? z3 : (z - 16/116) / 7.787) * 108.883;

  x /= 100;
  y /= 100;
  z /= 100;

  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  let b_ = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
  b_ = b_ > 0.0031308 ? 1.055 * Math.pow(b_, 1/2.4) - 0.055 : 12.92 * b_;

  return [
    Math.max(0, Math.min(255, Math.round(r * 255))),
    Math.max(0, Math.min(255, Math.round(g * 255))),
    Math.max(0, Math.min(255, Math.round(b_ * 255)))
  ];
}

/**
 * RGB to HSV conversion
 */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  let s = max === 0 ? 0 : diff / max;
  let v = max;

  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / diff + 2) / 6; break;
      case b: h = ((r - g) / diff + 4) / 6; break;
    }
  }

  return [h * 360, s, v];
}

/**
 * HSV to RGB conversion
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = h / 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * RGB to HSL conversion
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / diff + 2) / 6; break;
      case b: h = ((r - g) / diff + 4) / 6; break;
    }
  }

  return [h * 360, s, l];
}

/**
 * HSL to RGB conversion
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculate luminance from RGB
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Floyd-Steinberg error diffusion dithering
 */
export function floydSteinbergDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  useLab: boolean = true
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const oldR = output[idx];
      const oldG = output[idx + 1];
      const oldB = output[idx + 2];
      
      // Find closest LEGO color
      const closestColor = findClosestLegoColor([oldR, oldG, oldB]);
      const [newR, newG, newB] = closestColor.rgb;
      
      output[idx] = newR;
      output[idx + 1] = newG;
      output[idx + 2] = newB;
      
      // Calculate error
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;
      
      // Distribute error to neighboring pixels
      const distributeError = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = (ny * width + nx) * 4;
          output[nIdx] = Math.max(0, Math.min(255, output[nIdx] + errR * factor));
          output[nIdx + 1] = Math.max(0, Math.min(255, output[nIdx + 1] + errG * factor));
          output[nIdx + 2] = Math.max(0, Math.min(255, output[nIdx + 2] + errB * factor));
        }
      };
      
      distributeError(1, 0, 7/16);
      distributeError(-1, 1, 3/16);
      distributeError(0, 1, 5/16);
      distributeError(1, 1, 1/16);
    }
  }
  
  return output;
}

/**
 * Bayer matrix for ordered dithering
 */
export function getBayerMatrix(size: 2 | 4 | 8): number[][] {
  if (size === 2) {
    return [
      [0, 2],
      [3, 1]
    ];
  } else if (size === 4) {
    return [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];
  } else { // 8x8
    return [
      [0, 32, 8, 40, 2, 34, 10, 42],
      [48, 16, 56, 24, 50, 18, 58, 26],
      [12, 44, 4, 36, 14, 46, 6, 38],
      [60, 28, 52, 20, 62, 30, 54, 22],
      [3, 35, 11, 43, 1, 33, 9, 41],
      [51, 19, 59, 27, 49, 17, 57, 25],
      [15, 47, 7, 39, 13, 45, 5, 37],
      [63, 31, 55, 23, 61, 29, 53, 21]
    ];
  }
}

/**
 * Ordered (Bayer) dithering
 */
export function orderedDither(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  matrixSize: 2 | 4 | 8 = 8
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);
  const matrix = getBayerMatrix(matrixSize);
  const threshold = (matrixSize * matrixSize);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const bayerValue = matrix[y % matrixSize][x % matrixSize] / threshold - 0.5;
      
      const r = Math.max(0, Math.min(255, output[idx] + bayerValue * 128));
      const g = Math.max(0, Math.min(255, output[idx + 1] + bayerValue * 128));
      const b = Math.max(0, Math.min(255, output[idx + 2] + bayerValue * 128));
      
      const closestColor = findClosestLegoColor([r, g, b]);
      output[idx] = closestColor.rgb[0];
      output[idx + 1] = closestColor.rgb[1];
      output[idx + 2] = closestColor.rgb[2];
    }
  }
  
  return output;
}

/**
 * Generate blue noise texture (simplified version)
 */
export function generateBlueNoise(size: number, seed: number = 42): number[][] {
  // Simple pseudo-random blue noise approximation
  const noise: number[][] = [];
  let rng = seed;
  
  for (let y = 0; y < size; y++) {
    noise[y] = [];
    for (let x = 0; x < size; x++) {
      // Simple LCG random number generator
      rng = (rng * 1664525 + 1013904223) % 4294967296;
      noise[y][x] = (rng / 4294967296) * 2 - 1;
    }
  }
  
  return noise;
}

/**
 * Apply Gaussian blur
 */
export function gaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const kernel = createGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, totalWeight = 0;
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - halfKernel));
          const py = Math.min(height - 1, Math.max(0, y + ky - halfKernel));
          const idx = (py * width + px) * 4;
          const weight = kernel[ky][kx];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          totalWeight += weight;
        }
      }
      
      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / totalWeight;
      output[outIdx + 1] = g / totalWeight;
      output[outIdx + 2] = b / totalWeight;
      output[outIdx + 3] = data[outIdx + 3];
    }
  }
  
  return output;
}

/**
 * Create Gaussian kernel
 */
function createGaussianKernel(radius: number): number[][] {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  const sigma = radius / 3;
  let sum = 0;
  
  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dy = y - radius;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[y][x] = value;
      sum += value;
    }
  }
  
  // Normalize
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }
  
  return kernel;
}

/**
 * Sobel edge detection
 */
export function sobelEdgeDetection(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { magnitude: number[][]; direction: number[][] } {
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  const magnitude: number[][] = [];
  const direction: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    magnitude[y] = [];
    direction[y] = [];
    
    for (let x = 0; x < width; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const idx = (py * width + px) * 4;
          
          // Use luminance
          const lum = getLuminance(data[idx], data[idx + 1], data[idx + 2]);
          
          gx += lum * sobelX[ky + 1][kx + 1];
          gy += lum * sobelY[ky + 1][kx + 1];
        }
      }
      
      magnitude[y][x] = Math.sqrt(gx * gx + gy * gy);
      direction[y][x] = Math.atan2(gy, gx);
    }
  }
  
  return { magnitude, direction };
}

/**
 * K-means clustering for color quantization
 */
export function kMeansClustering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  k: number,
  maxIterations: number = 10
): [number, number, number][] {
  const pixels: [number, number, number][] = [];
  
  // Collect all pixels
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  
  // Initialize centroids randomly
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pixels.length);
    centroids.push([...pixels[idx]]);
  }
  
  // Iterate
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: number[][] = Array.from({ length: k }, () => []);
    
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity;
      let minIdx = 0;
      
      for (let j = 0; j < k; j++) {
        const dist = colorDistance(pixels[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = j;
        }
      }
      
      clusters[minIdx].push(i);
    }
    
    // Update centroids
    for (let j = 0; j < k; j++) {
      if (clusters[j].length > 0) {
        let r = 0, g = 0, b = 0;
        for (const idx of clusters[j]) {
          r += pixels[idx][0];
          g += pixels[idx][1];
          b += pixels[idx][2];
        }
        centroids[j] = [
          r / clusters[j].length,
          g / clusters[j].length,
          b / clusters[j].length
        ];
      }
    }
  }
  
  return centroids;
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

/**
 * Bilateral filter (edge-preserving smoothing)
 */
export function bilateralFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  spatialSigma: number = 3,
  rangeSigma: number = 30
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const radius = Math.ceil(spatialSigma * 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 4;
      const centerR = data[centerIdx];
      const centerG = data[centerIdx + 1];
      const centerB = data[centerIdx + 2];
      
      let r = 0, g = 0, b = 0, totalWeight = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const idx = (ny * width + nx) * 4;
          
          // Spatial weight
          const spatialDist = dx * dx + dy * dy;
          const spatialWeight = Math.exp(-spatialDist / (2 * spatialSigma * spatialSigma));
          
          // Range weight
          const colorDist = Math.pow(data[idx] - centerR, 2) +
                           Math.pow(data[idx + 1] - centerG, 2) +
                           Math.pow(data[idx + 2] - centerB, 2);
          const rangeWeight = Math.exp(-colorDist / (2 * rangeSigma * rangeSigma));
          
          const weight = spatialWeight * rangeWeight;
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          totalWeight += weight;
        }
      }
      
      output[centerIdx] = r / totalWeight;
      output[centerIdx + 1] = g / totalWeight;
      output[centerIdx + 2] = b / totalWeight;
      output[centerIdx + 3] = data[centerIdx + 3];
    }
  }
  
  return output;
}

/**
 * Convert ImageData to our 2D format
 */
export function imageDataTo2D(imageData: ImageData): { width: number; height: number; data: Uint8ClampedArray } {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data)
  };
}

/**
 * Convert our 2D format to ImageData
 */
export function imageData2DToImageData(data2D: { width: number; height: number; data: Uint8ClampedArray }): ImageData {
  return new ImageData(new Uint8ClampedArray(data2D.data), data2D.width, data2D.height);
}

