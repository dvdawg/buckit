-- Fix friendships RLS policies to allow friend requests

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view their friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON friendships;
DROP POLICY IF EXISTS "friendships_auth_check" ON friendships;

-- Create a simple policy that allows authenticated users to manage friendships
CREATE POLICY "friendships_auth_check" ON friendships
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Also ensure the me_user_id function is working correctly
CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the current auth user ID
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get the corresponding user ID from the users table
    SELECT id INTO user_id FROM users WHERE auth_id = user_id;
    
    RETURN user_id;
END;
$$;

-- Create a more robust accept_friend_request function with better error handling
CREATE OR REPLACE FUNCTION accept_friend_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    friendship_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if the friendship exists
    SELECT EXISTS(
        SELECT 1 FROM friendships 
        WHERE user_id = p_user_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    -- Update the friendship status
    UPDATE friendships 
    SET status = 'accepted'
    WHERE user_id = p_user_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    RETURN TRUE;
END;
$$;

-- Create a more robust reject_friend_request function with better error handling
CREATE OR REPLACE FUNCTION reject_friend_request(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    friendship_exists BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if the friendship exists
    SELECT EXISTS(
        SELECT 1 FROM friendships 
        WHERE user_id = p_user_id 
        AND friend_id = current_user_id 
        AND status = 'pending'
    ) INTO friendship_exists;
    
    IF NOT friendship_exists THEN
        RAISE EXCEPTION 'Friend request not found or already processed';
    END IF;
    
    -- Update the friendship status
    UPDATE friendships 
    SET status = 'declined'
    WHERE user_id = p_user_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
    
    RETURN TRUE;
END;
$$;
