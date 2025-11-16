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
// PALETTE & COLOR-PLAY FILTERS (1-4)
// ============================================================================

/**
 * Filter 1: Duotone Builder
 */
export const duotoneFilter: FilterDefinition = {
  metadata: {
    id: 'duotone',
    name: 'Duotone Builder',
    category: 'palette',
    hashtag: '#Duotone',
    description: 'Two-color challenge build',
    parameters: [
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
        name: 'colorA',
        label: 'Dark Color',
        type: 'select',
        default: 'Black',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'colorB',
        label: 'Light Color',
        type: 'select',
        default: 'White',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { colorA, colorB, threshold } = params;
    const colorAObj = LEGO_COLORS.find(c => c.name === colorA);
    const colorBObj = LEGO_COLORS.find(c => c.name === colorB);
    
    if (!colorAObj || !colorBObj) {
      throw new Error(`Color not found: ${!colorAObj ? colorA : colorB}`);
    }
    
    const output = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const lum = getLuminance(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      
      const useColorB = lum > threshold;
      const color = useColorB ? colorBObj : colorAObj;
      output[i] = color.rgb[0];
      output[i + 1] = color.rgb[1];
      output[i + 2] = color.rgb[2];
    }
    
    return { ...imageData, data: output };
  },
};

/**
 * Filter 2: Tricolor Flag
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
        default: 'Black',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'midColor',
        label: 'Mid Color',
        type: 'select',
        default: 'Dark Bluish Gray',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
      {
        name: 'lightColor',
        label: 'Light Color',
        type: 'select',
        default: 'White',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { darkColor, midColor, lightColor } = params;
    const darkObj = LEGO_COLORS.find(c => c.name === darkColor);
    const midObj = LEGO_COLORS.find(c => c.name === midColor);
    const lightObj = LEGO_COLORS.find(c => c.name === lightColor);
    
    if (!darkObj || !midObj || !lightObj) {
      const missing = !darkObj ? darkColor : !midObj ? midColor : lightColor;
      throw new Error(`Color not found: ${missing}`);
    }
    
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
 * Filter 3: Palette Mood Swap
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
 * Filter 4: Selective Splash
 */
export const selectiveSplashFilter: FilterDefinition = {
  metadata: {
    id: 'selective-splash',
    name: 'Selective Splash',
    category: 'palette',
    hashtag: '#SelectiveSplash',
    description: 'Keep one color family vivid; others go grayscale. Likely slow to apply.',
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

// ============================================================================
// DITHER & TEXTURE FILTERS (8-9)
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

// ============================================================================
// GEOMETRY & TILING FILTERS (11)
// ============================================================================

/**
 * Filter 11: Isometric Shade
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

// ============================================================================
// EDGE-AWARE & CARTOON FILTERS (16)
// ============================================================================

/**
 * Filter 16: Edge-Only Sketch
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
        default: 'White',
        options: LEGO_COLORS.map(c => ({ value: c.name, label: c.name })),
      },
    ],
  },
  process: (imageData, params) => {
    const { edgeStrength, bgColor } = params;
    const bgColorObj = LEGO_COLORS.find(c => c.name === bgColor);
    const darkColor = LEGO_COLORS.find(c => c.name === "Black");
    
    if (!bgColorObj || !darkColor) {
      throw new Error(`Color not found: ${!bgColorObj ? bgColor : 'Black'}`);
    }
    
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

// ============================================================================
// CONTENT-AWARE / SMART FILTERS (22)
// ============================================================================

/**
 * Filter 22: Color Blocks
 */
export const emojiAccentFilter: FilterDefinition = {
  metadata: {
    id: 'emoji-accent',
    name: 'Color Blocks',
    category: 'content',
    hashtag: '#ColorBlocks',
    description: 'Simplify image into flat color blocks with limited palette',
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

// ============================================================================
// FILTER REGISTRY
// ============================================================================

export const ALL_FILTERS: FilterDefinition[] = [
  // Palette & Color-Play (1-4)
  duotoneFilter,
  tricolorFilter,
  moodSwapFilter,
  selectiveSplashFilter,
  
  // Dither & Texture (8-9)
  classicFSDitherFilter,
  orderedCheckerFilter,
  
  // Geometry & Tiling (11)
  isometricShadeFilter,
  
  // Edge-Aware & Cartoon (16)
  edgeSketchFilter,
  
  // Pattern & Pop-Art (19)
  popArtFilter,
  
  // Content-Aware (22)
  emojiAccentFilter,
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

