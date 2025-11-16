import type { MosaicSize } from '@/types/mosaic.types';

export const MOSAIC_SIZES: Record<MosaicSize, { width: number; label: string }> = {
  small: { width: 32, label: '32x32 (Small)' },
  medium: { width: 64, label: '64x64 (Medium)' },
  large: { width: 128, label: '128x128 (Large)' },
  xl: { width: 256, label: '256x256 (Extra Large)' },
};

