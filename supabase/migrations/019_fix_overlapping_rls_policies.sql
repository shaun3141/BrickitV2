-- Fix overlapping RLS policies on creations table
-- Migration: 019_fix_overlapping_rls_policies.sql
--
-- Issue: Two SELECT policies existed with overlapping conditions:
-- 1. "Anyone can view gallery creations" (sharing_status = 'gallery')
-- 2. "Anyone can view link-sharable creations" (sharing_status IN ('link', 'gallery'))
--
-- The second policy already includes gallery creations, making the first redundant.
-- This can trigger Supabase security warnings about overlapping policies.

-- Drop the redundant "Anyone can view gallery creations" policy
DROP POLICY IF EXISTS "Anyone can view gallery creations" ON public.creations;

-- Keep "Anyone can view link-sharable creations" policy
-- This single policy correctly allows:
-- - Gallery creations (sharing_status = 'gallery') to be viewed anywhere
-- - Link-sharable creations (sharing_status = 'link') to be viewed via direct link
--
-- Note: Application logic should filter gallery listings to only show 'gallery' status.
-- The RLS policy controls database access; the app controls what's displayed in the gallery UI.

