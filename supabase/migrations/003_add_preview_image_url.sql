-- Add preview_image_url column to creations table
-- Migration: 003_add_preview_image_url.sql

ALTER TABLE public.creations 
ADD COLUMN IF NOT EXISTS preview_image_url TEXT;

-- Add comment to column for documentation
COMMENT ON COLUMN public.creations.preview_image_url IS 'URL to stored preview image in Supabase Storage';

