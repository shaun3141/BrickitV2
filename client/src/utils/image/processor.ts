import { findClosestLegoColor } from '@/utils/bricks/colors';
import type { LegoColor } from '@/utils/bricks/colors';
import { applyFilter } from './filters';
import type { FilterConfig } from '@/types/filter.types';

export interface MosaicData {
  width: number;
  height: number;
  pixels: LegoColor[][];
  originalImage: string;
  filteredImage?: string;
}

export interface FilterOptions {
  brightness?: number;     // -50 to 50, adjusts overall brightness
  contrast?: number;       // -50 to 50, adjusts contrast
  saturation?: number;     // -100 to 100, adjusts color saturation
  selectedFilter?: FilterConfig; // New: selected artistic filter
}

export interface ProcessingOptions {
  targetWidth: number;
  targetHeight?: number;
  maintainAspectRatio: boolean;
  filters?: FilterOptions;
}

/**
 * Loads an image from a File object
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculates target dimensions while maintaining aspect ratio
 * Ensures dimensions are multiples of 16 and max studs per side is 512
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  maintainAspectRatio: boolean = true
): { width: number; height: number } {
  // Cap targetWidth to max 512 studs
  const maxStuds = 512;
  const cappedWidth = Math.min(targetWidth, maxStuds);
  
  if (!maintainAspectRatio) {
    // Round to nearest multiple of 16
    const width = Math.round(cappedWidth / 16) * 16;
    return { width, height: width };
  }

  const aspectRatio = originalWidth / originalHeight;
  
  // Calculate initial dimensions maintaining aspect ratio
  let width = cappedWidth;
  let height = Math.round(width / aspectRatio);
  
  // Round both dimensions to nearest multiple of 16
  width = Math.round(width / 16) * 16;
  height = Math.round(height / 16) * 16;
  
  // Ensure longest side doesn't exceed 512
  const longestSide = Math.max(width, height);
  if (longestSide > maxStuds) {
    const scale = maxStuds / longestSide;
    width = Math.round(width * scale / 16) * 16;
    height = Math.round(height * scale / 16) * 16;
  }

  return { width, height };
}

/**
 * Converts RGB to HSL color space
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
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

  return [h, s, l];
}

/**
 * Converts HSL to RGB color space
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
 * Applies brightness adjustment (-50 to +50)
 */
function applyBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustment: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Convert adjustment to multiplier (0 = -50%, 100 = +50%)
  const factor = adjustment * 2.55; // Maps -50/+50 to -127.5/+127.5

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + factor));       // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + factor)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + factor)); // B
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Applies contrast adjustment (-50 to +50)
 */
function applyContrast(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustment: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Convert adjustment to contrast factor
  // -50 = 0.5x contrast, 0 = 1x contrast, +50 = 2x contrast
  const factor = (adjustment + 100) / 100;
  const intercept = 128 * (1 - factor);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));       // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept)); // B
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Applies saturation adjustment (-100 to +100)
 */
function applySaturation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustment: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Convert adjustment to saturation multiplier
  // -100 = 0x (grayscale), 0 = 1x (normal), +100 = 2x (very saturated)
  const factor = (adjustment + 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const newS = Math.max(0, Math.min(1, s * factor));
    const [r, g, b] = hslToRgb(h, newS, l);
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Samples a single pixel color from the center of a region
 * This preserves exact colors instead of creating blended intermediate colors
 */
function sampleCenterPixel(
  imageData: ImageData,
  regionX: number,
  regionY: number,
  regionWidth: number,
  regionHeight: number
): [number, number, number] {
  // Sample from the center of the region
  const centerX = Math.floor(regionX + regionWidth / 2);
  const centerY = Math.floor(regionY + regionHeight / 2);
  
  // Ensure we're within bounds
  const x = Math.min(Math.max(0, centerX), imageData.width - 1);
  const y = Math.min(Math.max(0, centerY), imageData.height - 1);
  
  const i = (y * imageData.width + x) * 4;
  
  return [
    imageData.data[i],
    imageData.data[i + 1],
    imageData.data[i + 2],
  ];
}

/**
 * Processes an image into a LEGO mosaic
 */
export async function processImage(
  file: File,
  options: ProcessingOptions
): Promise<MosaicData> {
  const img = await loadImage(file);
  
  // Calculate target dimensions
  const dimensions = calculateDimensions(
    img.width,
    img.height,
    options.targetWidth,
    options.maintainAspectRatio
  );

  const { width: mosaicWidth, height: mosaicHeight } = options.targetHeight
    ? { width: options.targetWidth, height: options.targetHeight }
    : dimensions;

  // Create canvas for the original image
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw the original image
  ctx.drawImage(img, 0, 0);

  // Apply basic filters if specified (order matters: brightness -> contrast -> saturation)
  if (options.filters) {
    if (options.filters.brightness && options.filters.brightness !== 0) {
      applyBrightness(ctx, canvas.width, canvas.height, options.filters.brightness);
    }
    if (options.filters.contrast && options.filters.contrast !== 0) {
      applyContrast(ctx, canvas.width, canvas.height, options.filters.contrast);
    }
    if (options.filters.saturation && options.filters.saturation !== 0) {
      applySaturation(ctx, canvas.width, canvas.height, options.filters.saturation);
    }
  }

  // Convert original image to data URL for display (after basic filters)
  const originalImage = canvas.toDataURL('image/png');

  // Apply artistic filter to full-resolution image if selected
  let filteredImage: string | undefined;
  if (options.filters?.selectedFilter) {
    // Get full-resolution image data
    const fullResImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Apply artistic filter at full resolution
    const filteredData = applyFilter(
      { width: canvas.width, height: canvas.height, data: fullResImageData.data },
      options.filters.selectedFilter.filterId,
      options.filters.selectedFilter.params
    );
    
    // Convert filtered data to canvas for display
    const filteredCanvas = document.createElement('canvas');
    filteredCanvas.width = canvas.width;
    filteredCanvas.height = canvas.height;
    const filteredCtx = filteredCanvas.getContext('2d');
    if (filteredCtx) {
      const displayImageData = new ImageData(new Uint8ClampedArray(filteredData.data), canvas.width, canvas.height);
      filteredCtx.putImageData(displayImageData, 0, 0);
      filteredImage = filteredCanvas.toDataURL('image/png');
    }
  }

  // Get the full-resolution image data (with basic filters already applied)
  let fullResImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply artistic filter to full-resolution data if selected
  if (options.filters?.selectedFilter) {
    const filteredData = applyFilter(
      { width: canvas.width, height: canvas.height, data: fullResImageData.data },
      options.filters.selectedFilter.filterId,
      options.filters.selectedFilter.params
    );
    
    fullResImageData = new ImageData(new Uint8ClampedArray(filteredData.data), canvas.width, canvas.height);
  }

  // Create the mosaic pixel grid by sampling from the full-resolution image
  const pixels: LegoColor[][] = [];
  
  // Calculate the size of each mosaic "brick" in the original image
  const brickWidth = canvas.width / mosaicWidth;
  const brickHeight = canvas.height / mosaicHeight;

  for (let row = 0; row < mosaicHeight; row++) {
    const pixelRow: LegoColor[] = [];
    
    for (let col = 0; col < mosaicWidth; col++) {
      // Calculate the region in the original image that this mosaic brick represents
      const regionX = col * brickWidth;
      const regionY = row * brickHeight;
      
      // Sample a single pixel from the center of this region (no averaging!)
      const color = sampleCenterPixel(
        fullResImageData,
        regionX,
        regionY,
        brickWidth,
        brickHeight
      );
      
      // Find the closest LEGO color
      const legoColor = findClosestLegoColor(color);
      
      pixelRow.push(legoColor);
    }
    
    pixels.push(pixelRow);
  }

  return {
    width: mosaicWidth,
    height: mosaicHeight,
    pixels,
    originalImage,
    filteredImage,
  };
}

/**
 * Generates a data URL of the mosaic for preview
 */
export function generateMosaicPreview(
  mosaicData: MosaicData,
  pixelSize: number = 20
): string {
  const canvas = document.createElement('canvas');
  canvas.width = mosaicData.width * pixelSize;
  canvas.height = mosaicData.height * pixelSize;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw each pixel as a colored square
  for (let row = 0; row < mosaicData.height; row++) {
    for (let col = 0; col < mosaicData.width; col++) {
      const color = mosaicData.pixels[row][col];
      ctx.fillStyle = color.hex;
      ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Counts the number of bricks needed for each color (1x1 only)
 */
export function generatePartsList(mosaicData: MosaicData): Map<string, { color: LegoColor; count: number }> {
  const partsList = new Map<string, { color: LegoColor; count: number }>();

  for (const row of mosaicData.pixels) {
    for (const color of row) {
      const existing = partsList.get(color.name);
      if (existing) {
        existing.count++;
      } else {
        partsList.set(color.name, { color, count: 1 });
      }
    }
  }

  return partsList;
}

/**
 * Generates an optimized parts list from brick placements
 */
export interface OptimizedPart {
  brickTypeId: string;
  brickTypeName: string;
  brickWidth: number;
  brickHeight: number;
  colorId: string;
  colorName: string;
  color: LegoColor;
  hex: string;
  count: number;
}

export function generateOptimizedPartsList(
  placements: import('@/types').BrickPlacement[]
): OptimizedPart[] {
  const partsMap = new Map<string, OptimizedPart>();

  for (const placement of placements) {
    const key = `${placement.brickType.id}-${placement.color.name}`;
    
    const existing = partsMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      partsMap.set(key, {
        brickTypeId: placement.brickType.id,
        brickTypeName: placement.brickType.displayName,
        brickWidth: placement.brickType.width,
        brickHeight: placement.brickType.height,
        colorId: placement.color.name,
        colorName: placement.color.name,
        color: placement.color,
        hex: placement.color.hex,
        count: 1,
      });
    }
  }

  return Array.from(partsMap.values()).sort((a, b) => b.count - a.count);
}

