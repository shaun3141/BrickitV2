-- Make pixel_data nullable since we're storing preview images instead
-- Migration: 012_make_pixel_data_nullable.sql

ALTER TABLE creations 
ALTER COLUMN pixel_data DROP NOT NULL;

-- Add comment explaining why it's nullable
COMMENT ON COLUMN creations.pixel_data IS 'Legacy field - now nullable as we store preview images instead. Can be used later for edit functionality if needed.';

