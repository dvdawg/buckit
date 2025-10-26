-- Fix collaborator bucket display issue
-- This migration ensures that collaborator buckets are properly displayed on profile pages and bucket lists

-- 1. Ensure bucket_collaborators table has all required fields
-- Add missing fields if they don't exist
DO $$ 
BEGIN
    -- Add accepted_at field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'accepted_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
    
    -- Add invited_by field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'invited_by') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add invited_at field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'invited_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN invited_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add created_at field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add id field if it doesn't exist (for primary key)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'id') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

-- 2. Update existing collaborator records to have accepted_at set
-- This ensures that existing collaborators are properly recognized
UPDATE bucket_collaborators 
SET accepted_at = COALESCE(accepted_at, created_at, NOW())
WHERE accepted_at IS NULL;

-- 3. Ensure the get_user_buckets_by_id function is correct and includes collaborator buckets
DROP FUNCTION IF EXISTS get_user_buckets_by_id(UUID);

CREATE OR REPLACE FUNCTION get_user_buckets_by_id(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    visibility TEXT,
    challenge_count INTEGER,
    completion_percentage NUMERIC,
    created_at TIMESTAMPTZ,
    owner_id UUID,
    is_collaborator BOOLEAN,
    can_edit BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        b.id,
        b.title,
        b.description,
        b.cover_url,
        b.emoji,
        b.color,
        b.visibility,
        b.challenge_count,
        b.completion_percentage,
        b.created_at,
        b.owner_id,
        -- Check if the specified user is a collaborator (not the owner)
        (b.owner_id != p_user_id AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )) as is_collaborator,
        -- Check if the specified user can edit (owner or collaborator)
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )) as can_edit
    FROM buckets b
    WHERE (
        -- User's own buckets
        b.owner_id = p_user_id
        -- Or buckets where user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )
    )
    AND (
        -- User can see their own buckets
        p_user_id = p_user_id  -- Always true for own buckets
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;

-- 4. Create a function to add collaborators that properly sets accepted_at
CREATE OR REPLACE FUNCTION add_bucket_collaborator(
    p_bucket_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_owner_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if current user owns the bucket
    SELECT owner_id INTO bucket_owner_id
    FROM buckets
    WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != current_user_id THEN
        RAISE EXCEPTION 'Only bucket owners can add collaborators';
    END IF;
    
    -- Check if user is trying to add themselves
    IF p_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as a collaborator';
    END IF;
    
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert or update collaborator record with accepted_at set
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, invited_at, accepted_at)
    VALUES (p_bucket_id, p_user_id, current_user_id, NOW(), NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = current_user_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- 5. Create a function to get bucket collaborators
CREATE OR REPLACE FUNCTION get_bucket_collaborators(p_bucket_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    full_name TEXT,
    handle TEXT,
    avatar_url TEXT,
    role TEXT,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        bc.id,
        bc.user_id,
        u.full_name,
        u.handle,
        u.avatar_url,
        bc.role,
        bc.invited_at,
        bc.accepted_at
    FROM bucket_collaborators bc
    JOIN users u ON bc.user_id = u.id
    WHERE bc.bucket_id = p_bucket_id
    AND (
        -- Bucket owner can see all collaborators
        EXISTS (
            SELECT 1 FROM buckets b 
            WHERE b.id = p_bucket_id 
            AND b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
        )
        -- Or user is a collaborator themselves
        OR bc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    )
    ORDER BY bc.created_at ASC;
$$;

-- 6. Create a function to remove collaborators
CREATE OR REPLACE FUNCTION remove_bucket_collaborator(
    p_bucket_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_owner_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if current user owns the bucket
    SELECT owner_id INTO bucket_owner_id
    FROM buckets
    WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != current_user_id THEN
        RAISE EXCEPTION 'Only bucket owners can remove collaborators';
    END IF;
    
    -- Remove collaborator
    DELETE FROM bucket_collaborators
    WHERE bucket_id = p_bucket_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

-- 7. Create a debug function to test collaborator functionality
CREATE OR REPLACE FUNCTION debug_collaborator_buckets(p_user_id UUID)
RETURNS TABLE (
    bucket_id UUID,
    bucket_title TEXT,
    owner_id UUID,
    owner_name TEXT,
    is_owner BOOLEAN,
    is_collaborator BOOLEAN,
    collaborator_accepted_at TIMESTAMPTZ,
    can_edit BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        b.id as bucket_id,
        b.title as bucket_title,
        b.owner_id,
        u.full_name as owner_name,
        (b.owner_id = p_user_id) as is_owner,
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
        bc.accepted_at as collaborator_accepted_at,
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc2
            WHERE bc2.bucket_id = b.id
            AND bc2.user_id = p_user_id
            AND bc2.accepted_at IS NOT NULL
        )) as can_edit
    FROM buckets b
    JOIN users u ON b.owner_id = u.id
    LEFT JOIN bucket_collaborators bc ON bc.bucket_id = b.id AND bc.user_id = p_user_id
    WHERE (
        -- User's own buckets
        b.owner_id = p_user_id
        -- Or buckets where user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc3
            WHERE bc3.bucket_id = b.id
            AND bc3.user_id = p_user_id
            AND bc3.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;
