/**
 * Core TypeScript types for the BrickIt server
 */

export interface CreationData {
  title: string;
  description?: string;
  width: number;
  height: number;
  original_image_url?: string;
  preview_image_url?: string;
  rendered_image_url?: string;
  is_public: boolean;
  filter_options?: Record<string, any>;
}

export interface Creation extends CreationData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  display_name?: string; // From user_profiles join, "Anonymous" if null
}

export interface ApiError {
  error: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  details?: any;
}

