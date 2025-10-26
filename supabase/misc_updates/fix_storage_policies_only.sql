-- Fix storage policies specifically for avatar uploads
-- This addresses the "new row violates row-level security policy" error

-- 1. First, let's see what storage policies currently exist
SELECT 'Current storage policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 2. Drop ALL existing storage policies for avatars to start fresh
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 3. Create very simple, permissive storage policies for avatars
-- These policies only check if the user is authenticated and the bucket is avatars

-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Allow authenticated upload to avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update avatars
CREATE POLICY "Allow authenticated update to avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete avatars
CREATE POLICY "Allow authenticated delete from avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to avatars
CREATE POLICY "Allow public read from avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 4. Ensure the avatars bucket exists and is properly configured
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 5. Verify the new policies
SELECT 'New storage policies for avatars:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%avatars%';

SELECT 'Storage buckets:' as info;
SELECT * FROM storage.buckets WHERE id = 'avatars';
