
DROP FUNCTION IF EXISTS get_user_buckets(UUID);

CREATE OR REPLACE FUNCTION get_user_buckets(p_user_id UUID)
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
        EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
            AND bc.accepted_at IS NOT NULL
        ) as is_collaborator,
        (b.owner_id = get_current_user_db_id_simple() OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
            AND bc.accepted_at IS NOT NULL
        )) as can_edit
    FROM buckets b
    WHERE (
        b.owner_id = p_user_id
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
            AND bc.accepted_at IS NOT NULL
        )
    )
    AND (
        p_user_id = get_current_user_db_id_simple()
        OR b.visibility = 'public'
        OR (b.visibility = 'private' AND EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_id = get_current_user_db_id_simple() OR f.friend_id = get_current_user_db_id_simple())
            AND f.status = 'accepted'
            AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
        ))
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = get_current_user_db_id_simple()
            AND bc.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;

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
    current_user_id := get_current_user_db_id_simple();
    
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

CREATE OR REPLACE FUNCTION debug_collaborators()
RETURNS TABLE (
    current_user_id UUID,
    total_buckets INTEGER,
    owned_buckets INTEGER,
    collaborator_buckets INTEGER,
    total_collaborator_records INTEGER,
    user_collaborator_records INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    total_buckets INTEGER;
    owned_buckets INTEGER;
    collaborator_buckets INTEGER;
    total_collaborator_records INTEGER;
    user_collaborator_records INTEGER;
BEGIN
    current_user_id := get_current_user_db_id_simple();
    
    SELECT COUNT(*) INTO total_buckets FROM buckets;
    
    SELECT COUNT(*) INTO owned_buckets FROM buckets WHERE owner_id = current_user_id;
    
    SELECT COUNT(*) INTO collaborator_buckets 
    FROM buckets b
    WHERE EXISTS (
        SELECT 1 FROM bucket_collaborators bc
        WHERE bc.bucket_id = b.id
        AND bc.user_id = current_user_id
        AND bc.accepted_at IS NOT NULL
    );
    
    SELECT COUNT(*) INTO total_collaborator_records FROM bucket_collaborators;
    
    SELECT COUNT(*) INTO user_collaborator_records 
    FROM bucket_collaborators 
    WHERE user_id = current_user_id;
    
    RETURN QUERY SELECT 
        current_user_id,
        total_buckets,
        owned_buckets,
        collaborator_buckets,
        total_collaborator_records,
        user_collaborator_records;
END;
$$;
