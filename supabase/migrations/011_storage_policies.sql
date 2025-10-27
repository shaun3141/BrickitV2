-- Storage bucket and policies for creation images
-- Migration: 011_storage_policies.sql
-- This replaces the broken migrations 006-010

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('creation-images', 'creation-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop ALL existing policies to start fresh
-- (cleaning up any policies from previous broken migrations)
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to creation-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in creation-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete in creation-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read from creation-images" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated uploads access" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated updates access" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated deletes access" ON storage.objects;
DROP POLICY IF EXISTS "Give public read access" ON storage.objects;

-- Create simple, secure policies
-- Users can only upload files to their own folder (userId/*)
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'creation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Everyone (authenticated or not) can view files
-- This allows public sharing of creations
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'creation-images');

