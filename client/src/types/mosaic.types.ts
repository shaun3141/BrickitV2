import type { LegoColor } from '@/utils/bricks/colors';
import type { BrickPlacement } from './brick.types';

export type MosaicSize = 'small' | 'medium' | 'large' | 'xl';

export interface MosaicData {
  width: number;
  height: number;
  pixels: LegoColor[][];
  originalImage: string;
  filteredImage?: string;
}

export interface OptimizedMosaic {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
}

export interface ProcessingOptions {
  targetWidth: number;
  targetHeight?: number;
  maintainAspectRatio: boolean;
  filters?: FilterOptions;
}

export interface FilterOptions {
  brightness?: number;     // -50 to 50, adjusts overall brightness
  contrast?: number;       // -50 to 50, adjusts contrast
  saturation?: number;     // -100 to 100, adjusts color saturation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedFilter?: any;    // FilterConfig from filter.types
}

