-- Final comprehensive fix for registration issues
-- This script addresses both storage upload and user creation problems

-- 1. Create a secure function to handle user profile creation
CREATE OR REPLACE FUNCTION create_user_profile(
  p_auth_id UUID,
  p_full_name TEXT,
  p_handle TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Insert the user profile
  INSERT INTO users (auth_id, full_name, handle, avatar_url)
  VALUES (p_auth_id, p_full_name, p_handle, p_avatar_url)
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- 2. Fix users table RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Fix storage policies - completely reset and create simple ones
-- Drop ALL existing storage policies for avatars
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
DROP POLICY IF EXISTS "Allow authenticated upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from avatars" ON storage.objects;

-- Create the simplest possible storage policies
CREATE POLICY "avatars_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars');

CREATE POLICY "avatars_select" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 4. Ensure the avatars bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 5. Verify everything is working
SELECT 'User profile function created' as status;
SELECT 'Users table policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

SELECT 'Storage policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT 'Storage bucket:' as info;
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'avatars';
