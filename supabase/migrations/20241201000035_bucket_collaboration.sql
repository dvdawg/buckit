-- Drop existing bucket_collaborators table if it exists
DROP TABLE IF EXISTS bucket_collaborators CASCADE;

-- Create bucket_collaborators table to track who can collaborate on buckets
CREATE TABLE bucket_collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bucket_id UUID NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('collaborator', 'admin')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bucket_id, user_id)
);

-- Add RLS policies for bucket_collaborators
ALTER TABLE bucket_collaborators ENABLE ROW LEVEL SECURITY;

-- Users can view collaborators for buckets they own or are collaborating on
CREATE POLICY "Users can view bucket collaborators" ON bucket_collaborators
    FOR SELECT USING (
        -- Owner can see all collaborators
        EXISTS (
            SELECT 1 FROM buckets b 
            WHERE b.id = bucket_collaborators.bucket_id 
            AND b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
        -- Or user is a collaborator themselves
        OR user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    );

-- Only bucket owners can add/remove collaborators
CREATE POLICY "Bucket owners can manage collaborators" ON bucket_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM buckets b 
            WHERE b.id = bucket_collaborators.bucket_id 
            AND b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        )
    );

-- Update get_bucket_by_id function to include collaborators
DROP FUNCTION IF EXISTS get_bucket_by_id(UUID);
CREATE FUNCTION get_bucket_by_id(p_bucket_id UUID)
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
    is_collaborative BOOLEAN,
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
        b.is_collaborative,
        b.created_at,
        b.owner_id,
        -- Check if current user is a collaborator
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
        -- Check if current user can edit (owner or collaborator)
        (b.owner_id = me_user_id() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        )) as can_edit
    FROM buckets b
    WHERE b.id = p_bucket_id
    AND (
        -- User can see their own buckets
        b.owner_id = me_user_id()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        )
    );
$$;

-- Update get_user_buckets function to include collaborative buckets
DROP FUNCTION IF EXISTS get_user_buckets(UUID);
CREATE FUNCTION get_user_buckets(p_user_id UUID)
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
        -- Check if current user is a collaborator
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
        -- Check if current user can edit (owner or collaborator)
        (b.owner_id = me_user_id() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
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
        p_user_id = me_user_id()
        -- Or bucket is public
        OR b.visibility = 'public'
        -- Or bucket is private and user is friends with the bucket owner
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        -- Or user is a collaborator
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;

-- Function to add a collaborator to a bucket
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
    current_user_id := me_user_id();
    
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
    
    -- Insert or update collaborator record
    INSERT INTO bucket_collaborators (bucket_id, user_id, invited_by, accepted_at)
    VALUES (p_bucket_id, p_user_id, current_user_id, NOW())
    ON CONFLICT (bucket_id, user_id) 
    DO UPDATE SET 
        invited_by = current_user_id,
        invited_at = NOW(),
        accepted_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Function to remove a collaborator from a bucket
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
    current_user_id := me_user_id();
    
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

-- Function to get bucket collaborators
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
            AND b.owner_id = me_user_id()
        )
        -- Or user is a collaborator themselves
        OR bc.user_id = me_user_id()
    )
    ORDER BY bc.created_at ASC;
$$;
