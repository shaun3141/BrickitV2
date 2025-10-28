-- Add foreign key relationship from creations.user_id to user_profiles.id
-- This enables Supabase PostgREST to join the tables automatically
-- Migration: 015_add_creations_user_profiles_fk.sql

-- First, ensure all creations have corresponding user_profiles
-- If not, create them with NULL display_name
INSERT INTO public.user_profiles (id, display_name)
SELECT DISTINCT user_id, NULL
FROM public.creations
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles WHERE user_profiles.id = creations.user_id
)
ON CONFLICT (id) DO NOTHING;

-- Now add a foreign key constraint from creations.user_id to user_profiles.id
-- Note: user_id already has a FK to auth.users, but we can add another FK to user_profiles
-- since user_profiles.id = auth.users.id (they're the same values)
ALTER TABLE public.creations
ADD CONSTRAINT creations_user_profile_fkey
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

