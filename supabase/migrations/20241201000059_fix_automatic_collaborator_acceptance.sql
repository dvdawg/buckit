
DROP FUNCTION IF EXISTS add_bucket_collaborator(UUID, UUID);

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
    current_user_id := me_user_id();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT owner_id INTO bucket_owner_id
    FROM buckets
    WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != current_user_id THEN
        RAISE EXCEPTION 'Only bucket owners can add collaborators';
    END IF;
    
    IF p_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as a collaborator';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
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

UPDATE bucket_collaborators 
SET accepted_at = COALESCE(accepted_at, invited_at, created_at, NOW())
WHERE accepted_at IS NULL;

DROP FUNCTION IF EXISTS get_bucket_collaborators(UUID);

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
        EXISTS (
            SELECT 1 FROM buckets b 
            WHERE b.id = p_bucket_id 
            AND b.owner_id = me_user_id()
        )
        OR bc.user_id = me_user_id()
    )
    ORDER BY bc.created_at ASC;
$$;

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
        (b.owner_id != p_user_id AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
        )) as is_collaborator,
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
        )) as can_edit
    FROM buckets b
    WHERE (
        b.owner_id = p_user_id
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
        )
    )
    AND (
        p_user_id = p_user_id
        OR b.visibility = 'public'
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = p_user_id OR f.friend_id = p_user_id)
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
        )
    )
    ORDER BY b.created_at DESC;
$$;

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
        (b.owner_id != me_user_id() AND EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )) as is_collaborator,
        (b.owner_id = me_user_id() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )) as can_edit
    FROM buckets b
    WHERE b.id = p_bucket_id
    AND (
        b.owner_id = me_user_id()
        OR b.visibility = 'public'
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = me_user_id() OR f.friend_id = me_user_id())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = me_user_id()
        )
    );
$$;

CREATE OR REPLACE FUNCTION test_automatic_collaborator_system(p_bucket_id UUID, p_user_id UUID)
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
    collaborator_exists BOOLEAN;
    accepted_at_set BOOLEAN;
    bucket_visible BOOLEAN;
BEGIN
    current_user_id := me_user_id();
    
    IF current_user_id IS NULL THEN
        RETURN QUERY SELECT 'User Authentication'::TEXT, false::BOOLEAN, 'User not authenticated'::TEXT, 'NULL'::TEXT;
        RETURN;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id 
        AND user_id = p_user_id
    ) INTO collaborator_exists;
    
    RETURN QUERY SELECT 'Collaborator Record Exists'::TEXT, collaborator_exists::BOOLEAN,
        CASE WHEN collaborator_exists THEN 'Collaborator record found' ELSE 'No collaborator record found' END::TEXT,
        collaborator_exists::TEXT;
    
    SELECT EXISTS(
        SELECT 1 FROM bucket_collaborators 
        WHERE bucket_id = p_bucket_id 
        AND user_id = p_user_id
        AND accepted_at IS NOT NULL
    ) INTO accepted_at_set;
    
    RETURN QUERY SELECT 'Accepted At Set'::TEXT, accepted_at_set::BOOLEAN,
        CASE WHEN accepted_at_set THEN 'accepted_at is set' ELSE 'accepted_at is NULL' END::TEXT,
        accepted_at_set::TEXT;
    
    SELECT EXISTS(
        SELECT 1 FROM get_user_buckets_by_id(p_user_id)
        WHERE id = p_bucket_id
    ) INTO bucket_visible;
    
    RETURN QUERY SELECT 'Bucket Visible to User'::TEXT, bucket_visible::BOOLEAN,
        CASE WHEN bucket_visible THEN 'Bucket appears in user bucket list' ELSE 'Bucket does not appear in user bucket list' END::TEXT,
        bucket_visible::TEXT;
    
    SELECT EXISTS(
        SELECT 1 FROM get_user_buckets_by_id(p_user_id)
        WHERE id = p_bucket_id AND is_collaborator = true
    ) INTO collaborator_exists;
    
    RETURN QUERY SELECT 'User Marked as Collaborator'::TEXT, collaborator_exists::BOOLEAN,
        CASE WHEN collaborator_exists THEN 'User is marked as collaborator' ELSE 'User is not marked as collaborator' END::TEXT,
        collaborator_exists::TEXT;
    
END;
$$;
