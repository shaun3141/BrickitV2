import type { BrickType } from './bricks';
import type { LegoColor } from '@/utils/legoColors';

export type MosaicSize = 'small' | 'medium' | 'large' | 'xl';

export const MOSAIC_SIZES: Record<MosaicSize, { width: number; label: string }> = {
  small: { width: 32, label: '32x32 (Small)' },
  medium: { width: 64, label: '64x64 (Medium)' },
  large: { width: 128, label: '128x128 (Large)' },
  xl: { width: 256, label: '256x256 (X-Large)' },
};

export interface BrickPlacement {
  id: string; // Unique identifier for this placement
  x: number; // Column position in grid
  y: number; // Row position in grid
  brickType: BrickType;
  color: LegoColor;
}

export interface OptimizedMosaic {
  mosaicData: any; // Will be MosaicData from imageProcessor
  placements: BrickPlacement[];
}

