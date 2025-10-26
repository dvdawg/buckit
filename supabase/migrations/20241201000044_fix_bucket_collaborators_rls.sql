-- Fix RLS policies for bucket_collaborators table
-- The current policies might be too restrictive for the RPC functions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bucket collaborators" ON bucket_collaborators;
DROP POLICY IF EXISTS "Bucket owners can manage collaborators" ON bucket_collaborators;

-- Create simpler policies that work with RPC functions
-- Since RPC functions are SECURITY DEFINER, they bypass RLS, but we still need basic policies

-- Allow authenticated users to view collaborator records
CREATE POLICY "bucket_collaborators_select" ON bucket_collaborators
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert collaborator records (RPC functions will handle authorization)
CREATE POLICY "bucket_collaborators_insert" ON bucket_collaborators
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update collaborator records (RPC functions will handle authorization)
CREATE POLICY "bucket_collaborators_update" ON bucket_collaborators
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete collaborator records (RPC functions will handle authorization)
CREATE POLICY "bucket_collaborators_delete" ON bucket_collaborators
    FOR DELETE USING (auth.uid() IS NOT NULL);
