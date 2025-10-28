-- Add foreign key constraint from creations.user_id to user_profiles.id
-- This allows PostgREST to automatically join these tables
-- Migration: 016_add_creations_user_profiles_constraint.sql

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creations_user_profile_fkey'
  ) THEN
    ALTER TABLE public.creations
    ADD CONSTRAINT creations_user_profile_fkey
    FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

