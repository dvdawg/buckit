-- Apply Registration Fixes
-- Run this script in your Supabase SQL Editor to fix registration issues

-- 1. Fix users table RLS policy for registration
-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create a more permissive insert policy for registration
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Ensure the users table has RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Fix avatar storage policies to allow uploads during registration
-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create more permissive policies for avatars
-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update avatars
CREATE POLICY "Users can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete avatars
CREATE POLICY "Users can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Keep the public read policy (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 3. Ensure the avatars bucket exists and is properly configured
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

-- 4. Verify the fixes
SELECT 'Users table RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

SELECT 'Storage policies for avatars:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT 'Storage buckets:' as info;
SELECT * FROM storage.buckets WHERE id = 'avatars';
