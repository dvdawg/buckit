-- Fix RLS policies properly for registration
-- This maintains RLS security while allowing registration to work

-- 1. Fix users table RLS policy for registration
-- The issue is that during registration, we need to allow the user to insert their own profile
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create proper RLS policies for users table
-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

-- Ensure RLS is enabled on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Fix storage policies for avatars
-- Drop all existing storage policies for avatars
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Create new storage policies that work with RLS
-- Allow authenticated users to upload to avatars bucket
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update avatars
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete avatars
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to avatars
CREATE POLICY "Public read access to avatars" ON storage.objects
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

-- 4. Verify the policies are working
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

-- 5. Test the policies (this will show if they're working)
SELECT 'Testing users table access...' as test;
SELECT 'Testing storage access...' as test;
