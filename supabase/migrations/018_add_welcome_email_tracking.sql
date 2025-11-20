-- Migration: Add welcome email tracking to user_profiles
-- This prevents duplicate welcome emails from being sent when users sign in multiple times

-- Add welcome_email_sent column to track if welcome email has been sent
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS user_profiles_welcome_email_sent_idx 
ON public.user_profiles(welcome_email_sent) 
WHERE welcome_email_sent = FALSE;

-- Backfill existing users: assume they've already received welcome email
-- (since this is a new feature, existing users shouldn't get duplicate emails)
UPDATE public.user_profiles
SET welcome_email_sent = TRUE
WHERE welcome_email_sent = FALSE;

