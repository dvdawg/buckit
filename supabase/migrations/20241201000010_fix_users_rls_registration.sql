-- Fix users table RLS policy for registration
-- The issue is that during registration, we need to allow users to insert their own profile
-- but the current policy might be too restrictive

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create a more permissive insert policy for registration
-- This allows authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Also ensure the users table has RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
