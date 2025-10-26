
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'accepted_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN accepted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'invited_by') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'invited_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN invited_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bucket_collaborators' 
                   AND column_name = 'id') THEN
        ALTER TABLE bucket_collaborators ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
END $$;

UPDATE bucket_collaborators 
SET accepted_at = COALESCE(accepted_at, created_at, NOW())
WHERE accepted_at IS NULL;

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
            AND bc.accepted_at IS NOT NULL
        )) as is_collaborator,
        (b.owner_id = p_user_id OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = b.id
            AND bc.user_id = p_user_id
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
    current_user_id := (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
    
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
            AND b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
        )
        OR bc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1)
    )
    ORDER BY bc.created_at ASC;
$$;

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
    current_user_id := (SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1);
    
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
        RAISE EXCEPTION 'Only bucket owners can remove collaborators';
    END IF;
    
    DELETE FROM bucket_collaborators
    WHERE bucket_id = p_bucket_id AND user_id = p_user_id;
    
    RETURN TRUE;
END;
$$;

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
        b.owner_id = p_user_id
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc3
            WHERE bc3.bucket_id = b.id
            AND bc3.user_id = p_user_id
            AND bc3.accepted_at IS NOT NULL
        )
    )
    ORDER BY b.created_at DESC;
$$;
