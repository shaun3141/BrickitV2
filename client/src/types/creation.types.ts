import type { LegoColor } from '@/utils/bricks/colors';
import type { FilterOptions } from './mosaic.types';

export interface Creation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  pixel_data?: LegoColor[][]; // Reconstructed client-side from preview PNG (not in database)
  original_image_url?: string;
  preview_image_url?: string;
  rendered_image_url?: string;
  is_public: boolean;
  filter_options?: FilterOptions;
  created_at: string;
  updated_at: string;
  display_name?: string; // From user_profiles join, "Anonymous" if null
}

export interface SaveCreationData {
  title: string;
  description?: string;
  width: number;
  height: number;
  pixel_data: LegoColor[][];
  original_image_url?: string;
  preview_image_url?: string;
  rendered_image_url?: string;
  is_public: boolean;
  filter_options?: FilterOptions;
}

