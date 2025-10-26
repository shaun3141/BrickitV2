import type { BrickType } from './bricks';
import type { LegoColor } from '@/utils/legoColors';
import type { FilterOptions, MosaicData } from '@/utils/imageProcessor';

// Re-export MosaicData for convenience
export type { MosaicData };

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

// Creation types for saving/loading mosaics
export interface Creation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  pixel_data: LegoColor[][]; // Stored as JSONB in database
  original_image_url?: string;
  preview_image_url?: string;
  is_public: boolean;
  filter_options?: FilterOptions;
  created_at: string;
  updated_at: string;
}

export interface SaveCreationData {
  title: string;
  description?: string;
  width: number;
  height: number;
  pixel_data: LegoColor[][];
  original_image_url?: string;
  preview_image_url?: string;
  is_public: boolean;
  filter_options?: FilterOptions;
}

