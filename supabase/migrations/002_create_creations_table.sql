-- Create creations table for storing user mosaic creations
-- Migration: 002_create_creations_table.sql

-- Create creations table
CREATE TABLE IF NOT EXISTS public.creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  pixel_data JSONB NOT NULL, -- Stores LegoColor[][] array
  original_image_url TEXT, -- URL to image in Supabase Storage
  is_public BOOLEAN DEFAULT false NOT NULL,
  filter_options JSONB, -- Stores FilterOptions used to create the mosaic
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own creations
CREATE POLICY "Users can view their own creations"
  ON public.creations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can view public creations
CREATE POLICY "Anyone can view public creations"
  ON public.creations
  FOR SELECT
  USING (is_public = true);

-- Users can insert their own creations
CREATE POLICY "Users can insert their own creations"
  ON public.creations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own creations
CREATE POLICY "Users can update their own creations"
  ON public.creations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own creations
CREATE POLICY "Users can delete their own creations"
  ON public.creations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_creations_updated_at
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS creations_user_id_idx ON public.creations(user_id);
CREATE INDEX IF NOT EXISTS creations_is_public_idx ON public.creations(is_public);
CREATE INDEX IF NOT EXISTS creations_created_at_idx ON public.creations(created_at DESC);

-- Note: Supabase Storage bucket 'creation-images' should be created manually
-- or via Supabase Dashboard with the following settings:
-- - Name: creation-images
-- - Public: false
-- - File size limit: 10MB
-- - Allowed MIME types: image/*

