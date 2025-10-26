-- Create essential RPC functions for bucket and item creation
-- Run this in your Supabase SQL Editor

-- Function to get current user's ID
CREATE OR REPLACE FUNCTION me_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT id FROM users WHERE auth_id = auth.uid();
$$;

-- Function to create a bucket
CREATE OR REPLACE FUNCTION create_bucket(
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_visibility TEXT DEFAULT 'private'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_id UUID;
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO buckets (owner_id, title, description, visibility, emoji, color)
    VALUES (user_id, p_title, p_description, p_visibility, '🪣', '#4ade80')
    RETURNING id INTO bucket_id;
    
    RETURN bucket_id;
END;
$$;

-- Function to create an item
CREATE OR REPLACE FUNCTION create_item(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_id UUID;
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    INSERT INTO items (bucket_id, owner_id, title, description, visibility, urgency_level)
    VALUES (p_bucket_id, user_id, p_title, p_description, 'private', 'no_rush')
    RETURNING id INTO item_id;
    
    RETURN item_id;
END;
$$;
