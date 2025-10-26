-- Fix get_bucket_by_id function to include collaborator information
-- This migration ensures that the bucket detail page shows collaboration status

-- 1. Fix get_bucket_by_id function to include is_collaborator and can_edit fields
DROP FUNCTION IF EXISTS get_bucket_by_id(UUID);

CREATE OR REPLACE FUNCTION get_bucket_by_id(p_bucket_id UUID)
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
        -- Check if the current user is a collaborator (not the owner)
        (b.owner_id != me_user_id() AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
            AND bc.accepted_at IS NOT NULL
        )) as is_collaborator,
        -- Check if the current user can edit (owner or collaborator)
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

-- 2. Fix get_bucket_items function to respect collaborator permissions
DROP FUNCTION IF EXISTS get_bucket_items(UUID);

CREATE OR REPLACE FUNCTION get_bucket_items(p_bucket_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    location_name TEXT,
    deadline TEXT,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER,
    visibility TEXT,
    satisfaction_rating INTEGER,
    urgency_level TEXT,
    is_completed BOOLEAN,
    completed_at TEXT,
    created_at TIMESTAMPTZ,
    bucket_emoji TEXT,
    bucket_title TEXT,
    bucket_color TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        i.id,
        i.title,
        i.description,
        i.location_name,
        i.deadline,
        i.tags,
        i.price_min,
        i.price_max,
        i.difficulty,
        i.visibility,
        i.satisfaction_rating,
        i.urgency_level,
        i.is_completed,
        i.completed_at,
        i.created_at,
        b.emoji as bucket_emoji,
        b.title as bucket_title,
        b.color as bucket_color
    FROM items i
    JOIN buckets b ON i.bucket_id = b.id
    WHERE i.bucket_id = p_bucket_id
    AND (
        -- User can see items in their own buckets
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
    )
    ORDER BY i.created_at DESC;
$$;

-- 3. Create a function to get bucket collaborators for display
CREATE OR REPLACE FUNCTION get_bucket_collaborators_display(p_bucket_id UUID)
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

-- 4. Create a function to test bucket collaborator display
CREATE OR REPLACE FUNCTION test_bucket_collaborator_display(p_bucket_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result BOOLEAN,
    message TEXT,
    value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    bucket_data RECORD;
    collaborator_count INTEGER;
    is_collaborator BOOLEAN;
    can_edit BOOLEAN;
BEGIN
    -- Get current user ID
    current_user_id := me_user_id();
    
    -- Test 1: Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 'User Authentication'::TEXT, false::BOOLEAN, 'User not authenticated'::TEXT, 'NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Test 2: Get bucket data
    SELECT * INTO bucket_data FROM get_bucket_by_id(p_bucket_id) LIMIT 1;
    
    IF bucket_data IS NULL THEN
        RETURN QUERY SELECT 'Bucket Access'::TEXT, false::BOOLEAN, 'Bucket not found or no access'::TEXT, 'NULL'::TEXT;
        RETURN;
    END IF;
    
    -- Test 3: Check collaborator count
    SELECT COUNT(*) INTO collaborator_count FROM bucket_collaborators WHERE bucket_id = p_bucket_id;
    RETURN QUERY SELECT 'Collaborator Count'::TEXT, true::BOOLEAN, 'Total collaborators'::TEXT, collaborator_count::TEXT;
    
    -- Test 4: Check if user is collaborator
    is_collaborator := bucket_data.is_collaborator;
    RETURN QUERY SELECT 'Is Collaborator'::TEXT, is_collaborator::BOOLEAN, 
        CASE WHEN is_collaborator THEN 'User is a collaborator' ELSE 'User is not a collaborator' END::TEXT,
        is_collaborator::TEXT;
    
    -- Test 5: Check if user can edit
    can_edit := bucket_data.can_edit;
    RETURN QUERY SELECT 'Can Edit'::TEXT, can_edit::BOOLEAN,
        CASE WHEN can_edit THEN 'User can edit bucket' ELSE 'User cannot edit bucket' END::TEXT,
        can_edit::TEXT;
    
    -- Test 6: Check if bucket owner
    RETURN QUERY SELECT 'Is Owner'::TEXT, (bucket_data.owner_id = current_user_id)::BOOLEAN,
        CASE WHEN bucket_data.owner_id = current_user_id THEN 'User owns the bucket' ELSE 'User does not own the bucket' END::TEXT,
        (bucket_data.owner_id = current_user_id)::TEXT;
    
END;
$$;
