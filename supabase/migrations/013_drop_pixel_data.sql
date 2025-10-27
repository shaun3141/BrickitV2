-- Drop pixel_data column - we store preview images instead
-- Migration: 013_drop_pixel_data.sql

ALTER TABLE creations 
DROP COLUMN IF EXISTS pixel_data;

