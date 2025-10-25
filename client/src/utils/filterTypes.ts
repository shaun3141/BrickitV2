import type { LegoColor } from './legoColors';

/**
 * Filter parameter types
 */
export interface FilterParameter {
  name: string;
  label: string;
  type: 'number' | 'boolean' | 'select' | 'color';
  min?: number;
  max?: number;
  step?: number;
  default: any;
  options?: { value: any; label: string }[];
  description?: string;
}

/**
 * Filter metadata
 */
export interface FilterMetadata {
  id: string;
  name: string;
  category: 'palette' | 'dither' | 'geometry' | 'edge' | 'pattern' | 'content' | 'basic';
  description: string;
  parameters: FilterParameter[];
  hashtag?: string;
}

/**
 * Filter configuration with user-set parameters
 */
export interface FilterConfig {
  filterId: string;
  params: Record<string, any>;
}

/**
 * Processed image data that filters operate on
 */
export interface ImageData2D {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/**
 * Filter function signature
 */
export type FilterFunction = (
  imageData: ImageData2D,
  params: Record<string, any>
) => ImageData2D;

/**
 * Complete filter definition
 */
export interface FilterDefinition {
  metadata: FilterMetadata;
  process: FilterFunction;
}

/**
 * Result of applying filters before LEGO quantization
 */
export interface FilteredImageResult {
  imageData: ImageData2D;
  dataUrl: string;
}

