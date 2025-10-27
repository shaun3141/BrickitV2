-- Add rendered_image_url field to creations table
-- Migration: 014_add_rendered_image_url.sql

ALTER TABLE public.creations
ADD COLUMN IF NOT EXISTS rendered_image_url TEXT;

COMMENT ON COLUMN public.creations.rendered_image_url IS 'URL to rendered image with studs but without grid overlay';
