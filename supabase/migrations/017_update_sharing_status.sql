-- Update sharing settings from boolean is_public to sharing_status enum
-- Migration: 017_update_sharing_status.sql

-- Add sharing_status column with CHECK constraint
ALTER TABLE public.creations
ADD COLUMN sharing_status TEXT;

-- Migrate existing data: is_public = true → sharing_status = 'gallery', is_public = false → sharing_status = 'private'
UPDATE public.creations
SET sharing_status = CASE 
  WHEN is_public = true THEN 'gallery'
  ELSE 'private'
END;

-- Set NOT NULL constraint and default value
ALTER TABLE public.creations
ALTER COLUMN sharing_status SET DEFAULT 'private',
ALTER COLUMN sharing_status SET NOT NULL;

-- Add CHECK constraint to ensure only valid values
ALTER TABLE public.creations
ADD CONSTRAINT sharing_status_check CHECK (sharing_status IN ('private', 'link', 'gallery'));

-- Update RLS policies
-- Drop old "Anyone can view public creations" policy (must be done before dropping column)
DROP POLICY IF EXISTS "Anyone can view public creations" ON public.creations;

-- Drop old index
DROP INDEX IF EXISTS creations_is_public_idx;

-- Drop the old is_public column (now that policy is dropped)
ALTER TABLE public.creations
DROP COLUMN is_public;

-- Create new index on sharing_status
CREATE INDEX IF NOT EXISTS creations_sharing_status_idx ON public.creations(sharing_status);

-- Create new policy for gallery creations (visible in gallery)
CREATE POLICY "Anyone can view gallery creations"
  ON public.creations
  FOR SELECT
  USING (sharing_status = 'gallery');

-- Create new policy for link-sharable creations (accessible via direct link but not in gallery)
CREATE POLICY "Anyone can view link-sharable creations"
  ON public.creations
  FOR SELECT
  USING (sharing_status IN ('link', 'gallery'));

-- Note: "Users can view their own creations" policy remains unchanged
-- It allows owners to view their creations regardless of sharing_status

