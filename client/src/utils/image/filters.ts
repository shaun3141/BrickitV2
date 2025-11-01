/**
 * Complete filter implementations - 25 unique LEGO mosaic filters
 */

import type { FilterDefinition, ImageData2D } from '@/types/filter.types';
import { findClosestLegoColor, LEGO_COLORS, type LegoColor } from '@/utils/bricks/colors';
import {
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  getLuminance,
  floydSteinbergDither,
  orderedDither,
  generateBlueNoise,
  sobelEdgeDetection,
  kMeansClustering,
  bilateralFilter,
} from './helpers';

/**
 * Helper: Apply LEGO palette quantization
 */
function quantizeToLegoPalette(
  data: Uint8ClampedArray,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _useLab = false
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const color = findClosestLegoColor([data[i], data[i + 1], data[i + 2]]);
    output[i] = color.rgb[0];
    output[i + 1] = color.rgb[1];
    output[i + 2] = color.rgb[2];
  }
  
  return output;
}

// ============================================================================
// PALETTE & COLOR-PLAY FILTERS (1-7)
// ============================================================================

/**
 * Filter 1: Clean Quantize
 */
export const cleanQuantizeFilter: FilterDefinition = {
  metadata: {
    id: 'clean-quantize',
    name: 'Clean Quantize',
    category: 'palette',
    hashtag: '#CleanQuantize',
    description: 'Straight nearest-palette mapping for a true LEGO look',
    parameters: [
      {
        name: 'dithering',
        label: 'Dithering',
        type: 'select',
        default: 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
        ],
      },
      {
        name: 'useLab',
        label: 'Use Lab Color Space',
        type: 'boolean',
        default: true,
        description: 'More perceptual color matching',
      },
    ],
  },
  process: (imageData, params) => {
    const { dithering, useLab } = params;
    
    if (dithering === 'floyd-steinberg') {
      const output = floydSteinbergDither(imageData.data, imageData.width, imageData.height, useLab);
      return { ...imageData, data: output };
    }
    
    const output = quantizeToLegoPalette(imageData.data, useLab);
    return { ...imageData, data: output };
  },
};

/**
 * Filter 2: PosterPop
 */
export const posterPopFilter: FilterDefinition = {
  metadata: {
    id: 'poster-pop',
    name: 'PosterPop',
    category: 'palette',
    hashtag: '#PosterPop',
    description: 'Posterize before palette mapping for bold, comic-book colors',
    parameters: [
      {
        name: 'clusters',
        label: 'Color Clusters',
        type: 'number',
        min: 4,
        max: 12,
        step: 1,
        default: 8,
      },
      {
        name: 'smoothing',
        label: 'Edge Smoothing',
        type: 'boolean',
        default: false,
      },
    ],
  },
  process: (imageData, params) => {
    const { clusters, smoothing } = params;
    let data = new Uint8ClampedArray(imageData.data);
    
    // Optional edge-preserving smoothing
    if (smoothing) {
      const filtered = bilateralFilter(data, imageData.width, imageData.height, 2, 30);
      data = new Uint8ClampedArray(filtered);
    }
    
    // K-means to reduce to N colors
    const centroids = kMeansClustering(data, imageData.width, imageData.height, clusters);
    
    // Map each pixel to nearest centroid, then to LEGO palette
    const output = new Uint8ClampedArray(data);
    for (let i = 0; i < data.length; i += 4) {
      const pixel: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
      
      // Find nearest centroid
      let minDist = Infinity;
      let nearest = centroids[0];
      for (const centroid of centroids) {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = centroid;
        }
      }
      
      // Map to LEGO palette
      const legoColor = findClosestLegoColor([
        Math.round(nearest[0]),
        Math.round(nearest[1]),
        Math.round(nearest[2])
      ]);
      
      output[i] = legoColor.rgb[0];
      output[i + 1] = legoColor.rgb[1];
      output[i + 2] = legoColor.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 3: Duotone Builder
 */
export const duotoneFilter: FilterDefinition = {
  metadata: {
    id: 'duotone',
    name: 'Duotone Builder',
    category: 'palette',
    hashtag: '#Duotone',
    description: 'Two-color challenge build with halftone option',
    parameters: [
      {
        name: 'colorA',
        label: 'Dark Color',
        type: 'select',
        default: 26,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'colorB',
        label: 'Light Color',
        type: 'select',
        default: 1,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'threshold',
        label: 'Threshold',
        type: 'number',
        min: 0,
        max: 255,
        step: 5,
        default: 128,
      },
      {
        name: 'halftone',
        label: 'Halftone Dithering',
        type: 'boolean',
        default: false,
      },
    ],
  },
  process: (imageData, params) => {
    const { colorA, colorB, threshold, halftone } = params;
    const colorAObj = LEGO_COLORS.find(c => c.name === colorA)!;
    const colorBObj = LEGO_COLORS.find(c => c.name === colorB)!;
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const lum = getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      
      let useColorB = lum > threshold;
      
      if (halftone) {
        const x = (i / 4) % imageData.width;
        const y = Math.floor((i / 4) / imageData.width);
        const bayerValue = ((x % 4) + (y % 4) * 4) / 16;
        useColorB = (lum / 255) > bayerValue;
      }
      
      const color = useColorB ? colorBObj : colorAObj;
      output[i] = color.rgb[0];
      output[i + 1] = color.rgb[1];
      output[i + 2] = color.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 4: Tricolor Flag
 */
export const tricolorFilter: FilterDefinition = {
  metadata: {
    id: 'tricolor',
    name: 'Tricolor Flag',
    category: 'palette',
    hashtag: '#TricolorFlag',
    description: 'Map lights/mids/darks to three chosen colors',
    parameters: [
      {
        name: 'darkColor',
        label: 'Dark Color',
        type: 'select',
        default: 26,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'midColor',
        label: 'Mid Color',
        type: 'select',
        default: 21,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'lightColor',
        label: 'Light Color',
        type: 'select',
        default: 1,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { darkColor, midColor, lightColor } = params;
    const darkObj = LEGO_COLORS.find(c => c.name === darkColor)!;
    const midObj = LEGO_COLORS.find(c => c.name === midColor)!;
    const lightObj = LEGO_COLORS.find(c => c.name === lightColor)!;
    
    // Calculate luminance quantiles
    const luminances: number[] = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
      luminances.push(getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]));
    }
    luminances.sort((a, b) => a - b);
    const q33 = luminances[Math.floor(luminances.length * 0.33)];
    const q66 = luminances[Math.floor(luminances.length * 0.66)];
    
    const output = new Uint8ClampedArray(imageData.data);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const lum = getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      
      let color;
      if (lum < q33) color = darkObj;
      else if (lum < q66) color = midObj;
      else color = lightObj;
      
      output[i] = color.rgb[0];
      output[i + 1] = color.rgb[1];
      output[i + 2] = color.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 5: Palette Mood Swap
 */
export const moodSwapFilter: FilterDefinition = {
  metadata: {
    id: 'mood-swap',
    name: 'Palette Mood Swap',
    category: 'palette',
    hashtag: '#PaletteMoodSwap',
    description: 'Global color remap for different moods',
    parameters: [
      {
        name: 'mood',
        label: 'Mood',
        type: 'select',
        default: 'warm',
        options: [
          { value: 'warm', label: 'Warm Sunset' },
          { value: 'cool', label: 'Cool Ocean' },
          { value: 'neon', label: 'Neon Pop' },
          { value: 'vintage', label: 'Vintage Sepia' },
        ],
      },
      {
        name: 'strength',
        label: 'Strength',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.7,
      },
    ],
  },
  process: (imageData, params) => {
    const { mood, strength } = params;
    
    const moodTransforms: Record<string, (r: number, g: number, b: number) => [number, number, number]> = {
      warm: (r, g, b) => {
        const [h, s, l] = rgbToHsl(r, g, b);
        const newH = (h + 15) % 360;
        return hslToRgb(newH, Math.min(1, s * 1.2), l);
      },
      cool: (r, g, b) => {
        const [h, s, l] = rgbToHsl(r, g, b);
        const newH = (h + 180) % 360;
        return hslToRgb(newH, s * 0.8, l);
      },
      neon: (r, g, b) => {
        const [h, s, v] = rgbToHsv(r, g, b);
        return hsvToRgb(h, Math.min(1, s * 1.5), Math.min(1, v * 1.2));
      },
      vintage: (r, g, b) => {
        const sepia = [
          r * 0.393 + g * 0.769 + b * 0.189,
          r * 0.349 + g * 0.686 + b * 0.168,
          r * 0.272 + g * 0.534 + b * 0.131,
        ];
        return sepia.map(v => Math.min(255, v)) as [number, number, number];
      },
    };
    
    const transform = moodTransforms[mood];
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const original: [number, number, number] = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
      const transformed = transform(original[0], original[1], original[2]);
      
      // Blend with original based on strength
      const blended: [number, number, number] = [
        original[0] * (1 - strength) + transformed[0] * strength,
        original[1] * (1 - strength) + transformed[1] * strength,
        original[2] * (1 - strength) + transformed[2] * strength,
      ];
      
      const legoColor = findClosestLegoColor(blended);
      output[i] = legoColor.rgb[0];
      output[i + 1] = legoColor.rgb[1];
      output[i + 2] = legoColor.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 6: Selective Splash
 */
export const selectiveSplashFilter: FilterDefinition = {
  metadata: {
    id: 'selective-splash',
    name: 'Selective Splash',
    category: 'palette',
    hashtag: '#SelectiveSplash',
    description: 'Keep one hue family vivid; others go grayscale',
    parameters: [
      {
        name: 'hueCenter',
        label: 'Target Hue',
        type: 'number',
        min: 0,
        max: 360,
        step: 10,
        default: 0,
        description: 'Red=0, Yellow=60, Green=120, Cyan=180, Blue=240, Magenta=300',
      },
      {
        name: 'hueWidth',
        label: 'Hue Range',
        type: 'number',
        min: 10,
        max: 90,
        step: 5,
        default: 30,
      },
      {
        name: 'desatLevel',
        label: 'Desaturation',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.1,
        default: 0.9,
      },
    ],
  },
  process: (imageData, params) => {
    const { hueCenter, hueWidth, desatLevel } = params;
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const [h, s, l] = rgbToHsl(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      
      // Calculate hue distance (circular)
      let hueDist = Math.abs(h - hueCenter);
      if (hueDist > 180) hueDist = 360 - hueDist;
      
      const inRange = hueDist <= hueWidth;
      const newS = inRange ? s : s * (1 - desatLevel);
      const newL = inRange ? Math.min(1, l * 1.1) : l;
      
      const [r, g, b] = hslToRgb(h, newS, newL);
      const legoColor = findClosestLegoColor([r, g, b]);
      
      output[i] = legoColor.rgb[0];
      output[i + 1] = legoColor.rgb[1];
      output[i + 2] = legoColor.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 7: Vintage Brick
 */
export const vintageBrickFilter: FilterDefinition = {
  metadata: {
    id: 'vintage-brick',
    name: 'Vintage Brick',
    category: 'palette',
    hashtag: '#VintageBrick',
    description: 'Slight fade and warm paper tone for retro posters',
    parameters: [
      {
        name: 'fade',
        label: 'Fade %',
        type: 'number',
        min: 0,
        max: 50,
        step: 5,
        default: 20,
      },
      {
        name: 'warmth',
        label: 'Warmth',
        type: 'number',
        min: 0,
        max: 50,
        step: 5,
        default: 25,
      },
    ],
  },
  process: (imageData, params) => {
    const { fade, warmth } = params;
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      let r = imageData.data[i];
      let g = imageData.data[i + 1];
      let b = imageData.data[i + 2];
      
      // Apply fade (lift blacks, lower whites)
      const fadeFactor = fade / 100;
      r = r * (1 - fadeFactor * 0.3) + 128 * fadeFactor;
      g = g * (1 - fadeFactor * 0.3) + 128 * fadeFactor;
      b = b * (1 - fadeFactor * 0.3) + 128 * fadeFactor;
      
      // Apply warmth (more red/yellow)
      const warmFactor = warmth / 100;
      r = Math.min(255, r + warmFactor * 30);
      g = Math.min(255, g + warmFactor * 15);
      b = Math.max(0, b - warmFactor * 10);
      
      const legoColor = findClosestLegoColor([r, g, b]);
      output[i] = legoColor.rgb[0];
      output[i + 1] = legoColor.rgb[1];
      output[i + 2] = legoColor.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// DITHER & TEXTURE FILTERS (8-10)
// ============================================================================

/**
 * Filter 8: Classic FS Dither
 */
export const classicFSDitherFilter: FilterDefinition = {
  metadata: {
    id: 'fs-dither',
    name: 'Classic FS Dither',
    category: 'dither',
    hashtag: '#ClassicFSDither',
    description: 'Floyd-Steinberg error diffusion for crunchy detail',
    parameters: [
      {
        name: 'useLab',
        label: 'Use Lab Color Space',
        type: 'boolean',
        default: true,
      },
    ],
  },
  process: (imageData, params) => {
    const { useLab } = params;
    const output = floydSteinbergDither(imageData.data, imageData.width, imageData.height, useLab);
    return { ...imageData, data: output };
  },
};

/**
 * Filter 9: Ordered Checker
 */
export const orderedCheckerFilter: FilterDefinition = {
  metadata: {
    id: 'ordered-checker',
    name: 'Ordered Checker',
    category: 'dither',
    hashtag: '#OrderedChecker',
    description: 'Bayer ordered dithering for patterned surfaces',
    parameters: [
      {
        name: 'matrixSize',
        label: 'Matrix Size',
        type: 'select',
        default: 8,
        options: [
          { value: 2, label: '2x2' },
          { value: 4, label: '4x4' },
          { value: 8, label: '8x8' },
        ],
      },
    ],
  },
  process: (imageData, params) => {
    const { matrixSize } = params;
    const output = orderedDither(imageData.data, imageData.width, imageData.height, matrixSize);
    return { ...imageData, data: output };
  },
};

/**
 * Filter 10: Blue-Noise Microdither
 */
export const blueNoiseDitherFilter: FilterDefinition = {
  metadata: {
    id: 'blue-noise-dither',
    name: 'Blue-Noise Microdither',
    category: 'dither',
    hashtag: '#BlueNoiseMicrodither',
    description: 'Noise-shaped dithering to reduce banding',
    parameters: [
      {
        name: 'gain',
        label: 'Noise Gain',
        type: 'number',
        min: 0,
        max: 100,
        step: 10,
        default: 30,
      },
      {
        name: 'seed',
        label: 'Random Seed',
        type: 'number',
        min: 0,
        max: 1000,
        step: 1,
        default: 42,
      },
    ],
  },
  process: (imageData, params) => {
    const { gain, seed } = params;
    const noise = generateBlueNoise(64, seed);
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const noiseValue = noise[y % 64][x % 64] * gain;
        
        const r = Math.max(0, Math.min(255, imageData.data[i] + noiseValue));
        const g = Math.max(0, Math.min(255, imageData.data[i + 1] + noiseValue));
        const b = Math.max(0, Math.min(255, imageData.data[i + 2] + noiseValue));
        
        const legoColor = findClosestLegoColor([r, g, b]);
        output[i] = legoColor.rgb[0];
        output[i + 1] = legoColor.rgb[1];
        output[i + 2] = legoColor.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// GEOMETRY & TILING FILTERS (11-15)
// ============================================================================

/**
 * Filter 11: Superpixel Bricks
 */
export const superpixelFilter: FilterDefinition = {
  metadata: {
    id: 'superpixel',
    name: 'Superpixel Bricks',
    category: 'geometry',
    hashtag: '#SuperpixelBricks',
    description: 'Big chunky bricks per region for painterly tiles',
    parameters: [
      {
        name: 'regionCount',
        label: 'Region Count',
        type: 'number',
        min: 50,
        max: 400,
        step: 50,
        default: 200,
      },
    ],
  },
  process: (imageData, params) => {
    const { regionCount } = params;
    
    // Simple superpixel: divide into grid
    const gridSize = Math.sqrt((imageData.width * imageData.height) / regionCount);
    const cols = Math.ceil(imageData.width / gridSize);
    const rows = Math.ceil(imageData.height / gridSize);
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x0 = Math.floor(col * gridSize);
        const y0 = Math.floor(row * gridSize);
        const x1 = Math.min(imageData.width, Math.floor((col + 1) * gridSize));
        const y1 = Math.min(imageData.height, Math.floor((row + 1) * gridSize));
        
        // Calculate average color in this region
        let r = 0, g = 0, b = 0, count = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * imageData.width + x) * 4;
            r += imageData.data[i];
            g += imageData.data[i + 1];
            b += imageData.data[i + 2];
            count++;
          }
        }
        
        const avgColor = findClosestLegoColor([r / count, g / count, b / count]);
        
        // Fill region with this color
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * imageData.width + x) * 4;
            output[i] = avgColor.rgb[0];
            output[i + 1] = avgColor.rgb[1];
            output[i + 2] = avgColor.rgb[2];
          }
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 12: Voronoi Plates
 */
export const voronoiFilter: FilterDefinition = {
  metadata: {
    id: 'voronoi',
    name: 'Voronoi Plates',
    category: 'geometry',
    hashtag: '#VoronoiPlates',
    description: 'Irregular cells like mosaic glass',
    parameters: [
      {
        name: 'seedDensity',
        label: 'Seed Density',
        type: 'number',
        min: 50,
        max: 400,
        step: 50,
        default: 150,
      },
    ],
  },
  process: (imageData, params) => {
    const { seedDensity } = params;
    
    // Generate random seed points
    const seeds: { x: number; y: number; color: LegoColor }[] = [];
    for (let i = 0; i < seedDensity; i++) {
      const x = Math.floor(Math.random() * imageData.width);
      const y = Math.floor(Math.random() * imageData.height);
      const idx = (y * imageData.width + x) * 4;
      const color = findClosestLegoColor([
        imageData.data[idx],
        imageData.data[idx + 1],
        imageData.data[idx + 2]
      ]);
      seeds.push({ x, y, color });
    }
    
    const output = new Uint8ClampedArray(imageData.data);
    
    // For each pixel, find nearest seed
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        let minDist = Infinity;
        let nearestSeed = seeds[0];
        
        for (const seed of seeds) {
          const dist = Math.sqrt(Math.pow(x - seed.x, 2) + Math.pow(y - seed.y, 2));
          if (dist < minDist) {
            minDist = dist;
            nearestSeed = seed;
          }
        }
        
        const i = (y * imageData.width + x) * 4;
        output[i] = nearestSeed.color.rgb[0];
        output[i + 1] = nearestSeed.color.rgb[1];
        output[i + 2] = nearestSeed.color.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 13: Quads & Quarters
 */
export const quadtreeFilter: FilterDefinition = {
  metadata: {
    id: 'quadtree',
    name: 'Quads & Quarters',
    category: 'geometry',
    hashtag: '#QuadsAndQuarters',
    description: 'Recursive quadtree segmentation by color variance',
    parameters: [
      {
        name: 'threshold',
        label: 'Variance Threshold',
        type: 'number',
        min: 100,
        max: 5000,
        step: 100,
        default: 1000,
      },
      {
        name: 'minSize',
        label: 'Min Block Size',
        type: 'number',
        min: 2,
        max: 16,
        step: 2,
        default: 4,
      },
    ],
  },
  process: (imageData, params) => {
    const { threshold, minSize } = params;
    const output = new Uint8ClampedArray(imageData.data);
    
    function calculateVariance(x: number, y: number, w: number, h: number): number {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (x + dx >= imageData.width || y + dy >= imageData.height) continue;
          const i = ((y + dy) * imageData.width + (x + dx)) * 4;
          sumR += imageData.data[i];
          sumG += imageData.data[i + 1];
          sumB += imageData.data[i + 2];
          count++;
        }
      }
      
      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;
      
      let variance = 0;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (x + dx >= imageData.width || y + dy >= imageData.height) continue;
          const i = ((y + dy) * imageData.width + (x + dx)) * 4;
          variance += Math.pow(imageData.data[i] - avgR, 2);
          variance += Math.pow(imageData.data[i + 1] - avgG, 2);
          variance += Math.pow(imageData.data[i + 2] - avgB, 2);
        }
      }
      
      return variance / count;
    }
    
    function fillBlock(x: number, y: number, w: number, h: number) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (x + dx >= imageData.width || y + dy >= imageData.height) continue;
          const i = ((y + dy) * imageData.width + (x + dx)) * 4;
          sumR += imageData.data[i];
          sumG += imageData.data[i + 1];
          sumB += imageData.data[i + 2];
          count++;
        }
      }
      
      const color = findClosestLegoColor([sumR / count, sumG / count, sumB / count]);
      
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (x + dx >= imageData.width || y + dy >= imageData.height) continue;
          const i = ((y + dy) * imageData.width + (x + dx)) * 4;
          output[i] = color.rgb[0];
          output[i + 1] = color.rgb[1];
          output[i + 2] = color.rgb[2];
        }
      }
    }
    
    function subdivide(x: number, y: number, w: number, h: number) {
      if (w <= minSize || h <= minSize) {
        fillBlock(x, y, w, h);
        return;
      }
      
      const variance = calculateVariance(x, y, w, h);
      
      if (variance < threshold) {
        fillBlock(x, y, w, h);
      } else {
        const hw = Math.floor(w / 2);
        const hh = Math.floor(h / 2);
        subdivide(x, y, hw, hh);
        subdivide(x + hw, y, w - hw, hh);
        subdivide(x, y + hh, hw, h - hh);
        subdivide(x + hw, y + hh, w - hw, h - hh);
      }
    }
    
    subdivide(0, 0, imageData.width, imageData.height);
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 14: Isometric Shade
 */
export const isometricShadeFilter: FilterDefinition = {
  metadata: {
    id: 'isometric-shade',
    name: 'Isometric Shade',
    category: 'geometry',
    hashtag: '#IsometricShade',
    description: 'Fake 3D lighting to accent shapes',
    parameters: [
      {
        name: 'lightAngle',
        label: 'Light Angle',
        type: 'number',
        min: 0,
        max: 360,
        step: 15,
        default: 45,
      },
      {
        name: 'strength',
        label: 'Shade Strength',
        type: 'number',
        min: 0,
        max: 100,
        step: 10,
        default: 50,
      },
    ],
  },
  process: (imageData, params) => {
    const { lightAngle, strength } = params;
    
    // Calculate edge normals using Sobel
    const { direction } = sobelEdgeDetection(imageData.data, imageData.width, imageData.height);
    
    const lightRad = (lightAngle * Math.PI) / 180;
    const lightX = Math.cos(lightRad);
    const lightY = Math.sin(lightRad);
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        
        // Calculate lighting based on edge direction
        const edgeDir = direction[y][x];
        const normalX = -Math.sin(edgeDir);
        const normalY = Math.cos(edgeDir);
        
        const dot = normalX * lightX + normalY * lightY;
        const shadeFactor = 1 + (dot * strength / 100);
        
        const r = Math.max(0, Math.min(255, imageData.data[i] * shadeFactor));
        const g = Math.max(0, Math.min(255, imageData.data[i + 1] * shadeFactor));
        const b = Math.max(0, Math.min(255, imageData.data[i + 2] * shadeFactor));
        
        const legoColor = findClosestLegoColor([r, g, b]);
        output[i] = legoColor.rgb[0];
        output[i + 1] = legoColor.rgb[1];
        output[i + 2] = legoColor.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 15: Diagonal Stitch
 */
export const diagonalStitchFilter: FilterDefinition = {
  metadata: {
    id: 'diagonal-stitch',
    name: 'Diagonal Stitch',
    category: 'geometry',
    hashtag: '#DiagonalStitch',
    description: 'Enforce 45° banding for stylized diagonals',
    parameters: [
      {
        name: 'bandWidth',
        label: 'Band Width',
        type: 'number',
        min: 2,
        max: 16,
        step: 2,
        default: 6,
      },
    ],
  },
  process: (imageData, params) => {
    const { bandWidth } = params;
    const output = new Uint8ClampedArray(imageData.data);
    
    // Create diagonal bands
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const bandIndex = Math.floor((x + y) / bandWidth);
        
        // Average color within this diagonal band
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        
        for (let dy = 0; dy < imageData.height; dy++) {
          for (let dx = 0; dx < imageData.width; dx++) {
            if (Math.floor((dx + dy) / bandWidth) === bandIndex) {
              const i = (dy * imageData.width + dx) * 4;
              sumR += imageData.data[i];
              sumG += imageData.data[i + 1];
              sumB += imageData.data[i + 2];
              count++;
            }
          }
        }
        
        const color = findClosestLegoColor([sumR / count, sumG / count, sumB / count]);
        const i = (y * imageData.width + x) * 4;
        output[i] = color.rgb[0];
        output[i + 1] = color.rgb[1];
        output[i + 2] = color.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// EDGE-AWARE & CARTOON FILTERS (16-18)
// ============================================================================

/**
 * Filter 16: Toon Outlines
 */
export const toonOutlinesFilter: FilterDefinition = {
  metadata: {
    id: 'toon-outlines',
    name: 'Toon Outlines',
    category: 'edge',
    hashtag: '#ToonOutlines',
    description: 'Black outlines on edges for comics vibe',
    parameters: [
      {
        name: 'threshold',
        label: 'Edge Threshold',
        type: 'number',
        min: 10,
        max: 100,
        step: 5,
        default: 40,
      },
      {
        name: 'outlineColor',
        label: 'Outline Color',
        type: 'select',
        default: 26,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { threshold, outlineColor } = params;
    const outlineColorObj = LEGO_COLORS.find(c => c.name === outlineColor)!;
    
    const { magnitude } = sobelEdgeDetection(imageData.data, imageData.width, imageData.height);
    const output = quantizeToLegoPalette(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        if (magnitude[y][x] > threshold) {
          const i = (y * imageData.width + x) * 4;
          output[i] = outlineColorObj.rgb[0];
          output[i + 1] = outlineColorObj.rgb[1];
          output[i + 2] = outlineColorObj.rgb[2];
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 17: Cell-Shade
 */
export const cellShadeFilter: FilterDefinition = {
  metadata: {
    id: 'cell-shade',
    name: 'Cell-Shade',
    category: 'edge',
    hashtag: '#CellShade',
    description: '3-tone per local region (shadow/mid/highlight)',
    parameters: [
      {
        name: 'windowSize',
        label: 'Window Size',
        type: 'number',
        min: 3,
        max: 15,
        step: 2,
        default: 7,
      },
    ],
  },
  process: (imageData) => {
    
    // Apply bilateral filter for smoothing
    const smoothed = bilateralFilter(imageData.data, imageData.width, imageData.height, 3, 50);
    
    const output = new Uint8ClampedArray(smoothed);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const lum = getLuminance(smoothed[i], smoothed[i + 1], smoothed[i + 2]);
        
        // Tri-level quantization
        let level;
        if (lum < 85) level = 0.5;
        else if (lum < 170) level = 1.0;
        else level = 1.3;
        
        const r = Math.min(255, smoothed[i] * level);
        const g = Math.min(255, smoothed[i + 1] * level);
        const b = Math.min(255, smoothed[i + 2] * level);
        
        const legoColor = findClosestLegoColor([r, g, b]);
        output[i] = legoColor.rgb[0];
        output[i + 1] = legoColor.rgb[1];
        output[i + 2] = legoColor.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 18: Edge-Only Sketch
 */
export const edgeSketchFilter: FilterDefinition = {
  metadata: {
    id: 'edge-sketch',
    name: 'Edge-Only Sketch',
    category: 'edge',
    hashtag: '#EdgeOnlySketch',
    description: 'Line-art mosaic with coloring-book style',
    parameters: [
      {
        name: 'edgeStrength',
        label: 'Edge Strength',
        type: 'number',
        min: 10,
        max: 100,
        step: 5,
        default: 40,
      },
      {
        name: 'bgColor',
        label: 'Background Color',
        type: 'select',
        default: 1,
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { edgeStrength, bgColor } = params;
    const bgColorObj = LEGO_COLORS.find(c => c.name === bgColor)!;
    const darkColor = LEGO_COLORS.find(c => c.name === "Black")!;
    
    const { magnitude } = sobelEdgeDetection(imageData.data, imageData.width, imageData.height);
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const isEdge = magnitude[y][x] > edgeStrength;
        const color = isEdge ? darkColor : bgColorObj;
        
        output[i] = color.rgb[0];
        output[i + 1] = color.rgb[1];
        output[i + 2] = color.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// PATTERN & POP-ART FILTERS (19-21)
// ============================================================================

/**
 * Filter 19: Pop-Art Quadrants
 */
export const popArtFilter: FilterDefinition = {
  metadata: {
    id: 'pop-art',
    name: 'Pop-Art Quadrants',
    category: 'pattern',
    hashtag: '#PopArtQuadrants',
    description: '2×2 grid of the same picture with different palettes (Warhol-style)',
    parameters: [],
  },
  process: (imageData) => {
    // Split into 4 quadrants and apply different mood transforms
    const hw = Math.floor(imageData.width / 2);
    const hh = Math.floor(imageData.height / 2);
    
    const moods = [
      { hueShift: 0, satMult: 1.2 },
      { hueShift: 120, satMult: 1.3 },
      { hueShift: 240, satMult: 1.1 },
      { hueShift: 60, satMult: 1.4 },
    ];
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const quadrant = (y < hh ? 0 : 2) + (x < hw ? 0 : 1);
        const mood = moods[quadrant];
        
        const i = (y * imageData.width + x) * 4;
        const [h, s, l] = rgbToHsl(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
        const newH = (h + mood.hueShift) % 360;
        const newS = Math.min(1, s * mood.satMult);
        const [r, g, b] = hslToRgb(newH, newS, l);
        
        const legoColor = findClosestLegoColor([r, g, b]);
        output[i] = legoColor.rgb[0];
        output[i + 1] = legoColor.rgb[1];
        output[i + 2] = legoColor.rgb[2];
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 20: Halftone Dots
 */
export const halftoneFilter: FilterDefinition = {
  metadata: {
    id: 'halftone',
    name: 'Halftone Dots',
    category: 'pattern',
    hashtag: '#HalftoneDots',
    description: 'Simulate print dots with stud density',
    parameters: [
      {
        name: 'cellSize',
        label: 'Cell Size',
        type: 'number',
        min: 2,
        max: 8,
        step: 1,
        default: 4,
      },
      {
        name: 'gamma',
        label: 'Dot Gamma',
        type: 'number',
        min: 0.5,
        max: 2,
        step: 0.1,
        default: 1.2,
      },
    ],
  },
  process: (imageData, params) => {
    const { cellSize, gamma } = params;
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let cellY = 0; cellY < Math.ceil(imageData.height / cellSize); cellY++) {
      for (let cellX = 0; cellX < Math.ceil(imageData.width / cellSize); cellX++) {
        // Calculate average luminance in this cell
        let sumLum = 0, count = 0;
        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const x = cellX * cellSize + dx;
            const y = cellY * cellSize + dy;
            if (x >= imageData.width || y >= imageData.height) continue;
            
            const i = (y * imageData.width + x) * 4;
            sumLum += getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
            count++;
          }
        }
        
        const avgLum = sumLum / count;
        const normalizedLum = Math.pow(avgLum / 255, gamma);
        
        // Determine dot size (center pixels get filled based on luminance)
        for (let dy = 0; dy < cellSize; dy++) {
          for (let dx = 0; dx < cellSize; dx++) {
            const x = cellX * cellSize + dx;
            const y = cellY * cellSize + dy;
            if (x >= imageData.width || y >= imageData.height) continue;
            
            const i = (y * imageData.width + x) * 4;
            
            // Distance from cell center
            const centerDist = Math.sqrt(
              Math.pow(dx - cellSize / 2, 2) + Math.pow(dy - cellSize / 2, 2)
            );
            const maxDist = cellSize * 0.7;
            const shouldFill = centerDist / maxDist < normalizedLum;
            
            if (shouldFill) {
              const legoColor = findClosestLegoColor([
                imageData.data[i],
                imageData.data[i + 1],
                imageData.data[i + 2]
              ]);
              output[i] = legoColor.rgb[0];
              output[i + 1] = legoColor.rgb[1];
              output[i + 2] = legoColor.rgb[2];
            } else {
              const lightColor = LEGO_COLORS.find(c => c.name === "White")!;
              output[i] = lightColor.rgb[0];
              output[i + 1] = lightColor.rgb[1];
              output[i + 2] = lightColor.rgb[2];
            }
          }
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 21: Crosshatch Tiles
 */
export const crosshatchFilter: FilterDefinition = {
  metadata: {
    id: 'crosshatch',
    name: 'Crosshatch Tiles',
    category: 'pattern',
    hashtag: '#CrosshatchTiles',
    description: 'Two directional bands for hand-drawn vibe',
    parameters: [
      {
        name: 'lineWidth',
        label: 'Line Width',
        type: 'number',
        min: 1,
        max: 4,
        step: 1,
        default: 2,
      },
    ],
  },
  process: (imageData, params) => {
    const { lineWidth } = params;
    sobelEdgeDetection(imageData.data, imageData.width, imageData.height);
    const output = quantizeToLegoPalette(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const lum = getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
        
        // Draw diagonal lines based on luminance
        const isDiag1 = (x + y) % (lineWidth * 3) < lineWidth;
        const isDiag2 = (x - y) % (lineWidth * 3) < lineWidth;
        
        if (lum < 128 && (isDiag1 || isDiag2)) {
          const darkColor = LEGO_COLORS.find(c => c.name === "Black")!;
          output[i] = darkColor.rgb[0];
          output[i + 1] = darkColor.rgb[1];
          output[i + 2] = darkColor.rgb[2];
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// CONTENT-AWARE / SMART FILTERS (22-25)
// ============================================================================

/**
 * Filter 22: Portrait Booster
 * Note: Simplified version without actual face detection
 */
export const portraitBoosterFilter: FilterDefinition = {
  metadata: {
    id: 'portrait-booster',
    name: 'Portrait Booster',
    category: 'content',
    hashtag: '#PortraitBooster',
    description: 'Skin smoothing and feature enhancement for better portraits',
    parameters: [
      {
        name: 'smoothStrength',
        label: 'Smooth Strength',
        type: 'number',
        min: 0,
        max: 10,
        step: 1,
        default: 5,
      },
    ],
  },
  process: (imageData, params) => {
    const { smoothStrength } = params;
    
    // Apply bilateral filter for skin smoothing
    const smoothed = bilateralFilter(
      imageData.data,
      imageData.width,
      imageData.height,
      smoothStrength,
      30
    );
    
    const output = quantizeToLegoPalette(smoothed);
    return { ...imageData, data: output };
  },
};

/**
 * Filter 23: Foreground Focus
 */
export const foregroundFocusFilter: FilterDefinition = {
  metadata: {
    id: 'foreground-focus',
    name: 'Foreground Focus',
    category: 'content',
    hashtag: '#ForegroundFocus',
    description: 'Subject gets detail; background gets posterized',
    parameters: [
      {
        name: 'bgFlatten',
        label: 'Background Flatten',
        type: 'number',
        min: 3,
        max: 8,
        step: 1,
        default: 5,
      },
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process: (imageData, _params) => {
    
    // Simple saliency: center region is foreground
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const i = (y * imageData.width + x) * 4;
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        const isForeground = dist / maxDist < 0.4;
        
        if (isForeground) {
          // Keep detail with dithering
          const dithered = floydSteinbergDither(
            imageData.data.slice(i, i + 4),
            1,
            1,
            true
          );
          output[i] = dithered[0];
          output[i + 1] = dithered[1];
          output[i + 2] = dithered[2];
        } else {
          // Posterize background
          const legoColor = findClosestLegoColor([
            imageData.data[i],
            imageData.data[i + 1],
            imageData.data[i + 2]
          ]);
          output[i] = legoColor.rgb[0];
          output[i + 1] = legoColor.rgb[1];
          output[i + 2] = legoColor.rgb[2];
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 24: Emoji Accent
 */
export const emojiAccentFilter: FilterDefinition = {
  metadata: {
    id: 'emoji-accent',
    name: 'Emoji Accent',
    category: 'content',
    hashtag: '#EmojiAccent',
    description: 'Map zones to flat emoji-like color blocks',
    parameters: [
      {
        name: 'blobSize',
        label: 'Blob Size',
        type: 'number',
        min: 4,
        max: 16,
        step: 2,
        default: 8,
      },
      {
        name: 'colorLimit',
        label: 'Color Limit',
        type: 'number',
        min: 3,
        max: 8,
        step: 1,
        default: 5,
      },
    ],
  },
  process: (imageData, params) => {
    const { blobSize, colorLimit } = params;
    
    // K-means to get limited palette
    const centroids = kMeansClustering(imageData.data, imageData.width, imageData.height, colorLimit);
    
    const output = new Uint8ClampedArray(imageData.data);
    
    // Average in blob regions
    for (let by = 0; by < Math.ceil(imageData.height / blobSize); by++) {
      for (let bx = 0; bx < Math.ceil(imageData.width / blobSize); bx++) {
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        
        for (let dy = 0; dy < blobSize; dy++) {
          for (let dx = 0; dx < blobSize; dx++) {
            const x = bx * blobSize + dx;
            const y = by * blobSize + dy;
            if (x >= imageData.width || y >= imageData.height) continue;
            
            const i = (y * imageData.width + x) * 4;
            sumR += imageData.data[i];
            sumG += imageData.data[i + 1];
            sumB += imageData.data[i + 2];
            count++;
          }
        }
        
        const avgColor: [number, number, number] = [sumR / count, sumG / count, sumB / count];
        
        // Find nearest centroid
        let minDist = Infinity;
        let nearest = centroids[0];
        for (const c of centroids) {
          const dist = Math.sqrt(
            Math.pow(avgColor[0] - c[0], 2) +
            Math.pow(avgColor[1] - c[1], 2) +
            Math.pow(avgColor[2] - c[2], 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        }
        
        const legoColor = findClosestLegoColor([
          Math.round(nearest[0]),
          Math.round(nearest[1]),
          Math.round(nearest[2])
        ]);
        
        // Fill blob
        for (let dy = 0; dy < blobSize; dy++) {
          for (let dx = 0; dx < blobSize; dx++) {
            const x = bx * blobSize + dx;
            const y = by * blobSize + dy;
            if (x >= imageData.width || y >= imageData.height) continue;
            
            const i = (y * imageData.width + x) * 4;
            output[i] = legoColor.rgb[0];
            output[i + 1] = legoColor.rgb[1];
            output[i + 2] = legoColor.rgb[2];
          }
        }
      }
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 25: Stencil Cut
 */
export const stencilCutFilter: FilterDefinition = {
  metadata: {
    id: 'stencil-cut',
    name: 'Stencil Cut',
    category: 'content',
    hashtag: '#StencilCut',
    description: 'High-contrast stencils with limited colors',
    parameters: [
      {
        name: 'colors',
        label: 'Color Count',
        type: 'number',
        min: 2,
        max: 4,
        step: 1,
        default: 2,
      },
      {
        name: 'contrast',
        label: 'Contrast',
        type: 'number',
        min: 0,
        max: 100,
        step: 10,
        default: 50,
      },
    ],
  },
  process: (imageData, params) => {
    const { colors, contrast } = params;
    
    // Enhance contrast
    const contrastFactor = (contrast + 100) / 100;
    const enhanced = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < enhanced.length; i += 4) {
      enhanced[i] = Math.max(0, Math.min(255, (enhanced[i] - 128) * contrastFactor + 128));
      enhanced[i + 1] = Math.max(0, Math.min(255, (enhanced[i + 1] - 128) * contrastFactor + 128));
      enhanced[i + 2] = Math.max(0, Math.min(255, (enhanced[i + 2] - 128) * contrastFactor + 128));
    }
    
    // Posterize to N colors
    const centroids = kMeansClustering(enhanced, imageData.width, imageData.height, colors);
    
    const output = new Uint8ClampedArray(enhanced);
    
    for (let i = 0; i < enhanced.length; i += 4) {
      const pixel: [number, number, number] = [enhanced[i], enhanced[i + 1], enhanced[i + 2]];
      
      let minDist = Infinity;
      let nearest = centroids[0];
      for (const c of centroids) {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - c[0], 2) +
          Math.pow(pixel[1] - c[1], 2) +
          Math.pow(pixel[2] - c[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      
      const legoColor = findClosestLegoColor([
        Math.round(nearest[0]),
        Math.round(nearest[1]),
        Math.round(nearest[2])
      ]);
      
      output[i] = legoColor.rgb[0];
      output[i + 1] = legoColor.rgb[1];
      output[i + 2] = legoColor.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

// ============================================================================
// FILTER REGISTRY
// ============================================================================

export const ALL_FILTERS: FilterDefinition[] = [
  // Palette & Color-Play (1-7)
  cleanQuantizeFilter,
  posterPopFilter,
  duotoneFilter,
  tricolorFilter,
  moodSwapFilter,
  selectiveSplashFilter,
  vintageBrickFilter,
  
  // Dither & Texture (8-10)
  classicFSDitherFilter,
  orderedCheckerFilter,
  blueNoiseDitherFilter,
  
  // Geometry & Tiling (11-15)
  superpixelFilter,
  voronoiFilter,
  quadtreeFilter,
  isometricShadeFilter,
  diagonalStitchFilter,
  
  // Edge-Aware & Cartoon (16-18)
  toonOutlinesFilter,
  cellShadeFilter,
  edgeSketchFilter,
  
  // Pattern & Pop-Art (19-21)
  popArtFilter,
  halftoneFilter,
  crosshatchFilter,
  
  // Content-Aware (22-25)
  portraitBoosterFilter,
  foregroundFocusFilter,
  emojiAccentFilter,
  stencilCutFilter,
];

/**
 * Get filter by ID
 */
export function getFilterById(id: string): FilterDefinition | undefined {
  return ALL_FILTERS.find(f => f.metadata.id === id);
}

/**
 * Get filters by category
 */
export function getFiltersByCategory(category: string): FilterDefinition[] {
  return ALL_FILTERS.filter(f => f.metadata.category === category);
}

/**
 * Apply a filter to image data
 */
export function applyFilter(
  imageData: ImageData2D,
  filterId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>
): ImageData2D {
  const filter = getFilterById(filterId);
  if (!filter) {
    throw new Error(`Filter not found: ${filterId}`);
  }
  
  // Merge with defaults
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullParams: Record<string, any> = {};
  for (const param of filter.metadata.parameters) {
    fullParams[param.name] = params[param.name] ?? param.default;
  }
  
  return filter.process(imageData, fullParams);
}

