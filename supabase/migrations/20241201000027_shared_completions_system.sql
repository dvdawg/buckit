
CREATE TABLE completion_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(completion_id, user_id)
);

CREATE INDEX idx_completion_ratings_completion_id ON completion_ratings(completion_id);
CREATE INDEX idx_completion_ratings_user_id ON completion_ratings(user_id);

ALTER TABLE completion_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ratings" ON completion_ratings
    FOR SELECT USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can view ratings for shared completions" ON completion_ratings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM completions c
            JOIN items i ON i.id = c.item_id
            JOIN buckets b ON b.id = i.bucket_id
            WHERE c.id = completion_ratings.completion_id
            AND (
                b.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM bucket_collaborators bc
                    WHERE bc.bucket_id = b.id 
                    AND bc.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
                )
                OR (b.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE (f.user_id = (SELECT id FROM users WHERE auth_id = auth.uid()) 
                           OR f.friend_id = (SELECT id FROM users WHERE auth_id = auth.uid()))
                    AND f.status = 'accepted'
                    AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                ))
            )
        )
    );

CREATE POLICY "Users can create their own ratings" ON completion_ratings
    FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own ratings" ON completion_ratings
    FOR UPDATE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own ratings" ON completion_ratings
    FOR DELETE USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

ALTER TABLE completions ADD COLUMN is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE completions ADD COLUMN shared_with_user_ids UUID[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION complete_item_shared(
    p_item_id UUID,
    p_photo_url TEXT DEFAULT NULL,
    p_caption TEXT DEFAULT NULL,
    p_tagged_friend_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    completion_id UUID;
    user_id UUID;
    item_owner_id UUID;
    bucket_id UUID;
    bucket_owner_id UUID;
    collaborator_ids UUID[];
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    SELECT i.owner_id, i.bucket_id, b.owner_id
    INTO item_owner_id, bucket_id, bucket_owner_id
    FROM items i
    JOIN buckets b ON b.id = i.bucket_id
    WHERE i.id = p_item_id;
    
    IF item_owner_id IS NULL THEN
        RAISE EXCEPTION 'Item not found';
    END IF;
    
    IF item_owner_id != user_id AND NOT EXISTS (
        SELECT 1 FROM bucket_collaborators bc
        WHERE bc.bucket_id = bucket_id AND bc.user_id = user_id
    ) THEN
        RAISE EXCEPTION 'Not authorized to complete this item';
    END IF;
    
    SELECT ARRAY_AGG(DISTINCT user_id) INTO collaborator_ids
    FROM (
        SELECT bucket_owner_id as user_id
        UNION ALL
        SELECT bc.user_id
        FROM bucket_collaborators bc
        WHERE bc.bucket_id = bucket_id
        UNION ALL
        SELECT CASE 
            WHEN f.user_id = bucket_owner_id THEN f.friend_id
            ELSE f.user_id
        END
        FROM buckets b
        JOIN friendships f ON (
            (f.user_id = bucket_owner_id OR f.friend_id = bucket_owner_id)
            AND f.status = 'accepted'
        )
        WHERE b.id = bucket_id AND b.visibility = 'friends'
    ) shared_users;
    
    INSERT INTO completions (item_id, user_id, photo_url, caption, tagged_friend_ids, is_shared, shared_with_user_ids)
    VALUES (p_item_id, user_id, p_photo_url, p_caption, p_tagged_friend_ids, TRUE, collaborator_ids)
    RETURNING id INTO completion_id;
    
    INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience)
    VALUES (user_id, 'completed', 'item', p_item_id, 'friends');
    
    UPDATE users SET points = points + 10 WHERE id = user_id;
    
    RETURN completion_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_shared_completions(p_bucket_id UUID)
RETURNS TABLE (
    id UUID,
    item_id UUID,
    completed_by_user_id UUID,
    completed_by_name TEXT,
    completed_by_avatar TEXT,
    photo_url TEXT,
    caption TEXT,
    tagged_friend_ids UUID[],
    is_shared BOOLEAN,
    shared_with_user_ids UUID[],
    created_at TIMESTAMPTZ,
    user_rating INTEGER,
    user_review TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        c.id,
        c.item_id,
        c.user_id as completed_by_user_id,
        u.full_name as completed_by_name,
        u.avatar_url as completed_by_avatar,
        c.photo_url,
        c.caption,
        c.tagged_friend_ids,
        c.is_shared,
        c.shared_with_user_ids,
        c.created_at,
        cr.rating as user_rating,
        cr.review_text as user_review
    FROM completions c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN completion_ratings cr ON (
        cr.completion_id = c.id 
        AND cr.user_id = me_user_id()
    )
    JOIN items i ON i.id = c.item_id
    WHERE i.bucket_id = p_bucket_id
    AND (
        i.bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = me_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = i.bucket_id 
            AND bc.user_id = me_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM buckets b
            JOIN friendships f ON (
                (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                AND f.status = 'accepted'
            )
            WHERE b.id = i.bucket_id 
            AND b.visibility = 'friends'
            AND (f.user_id = me_user_id() OR f.friend_id = me_user_id())
        )
        OR me_user_id() = ANY(c.shared_with_user_ids)
    )
    ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION rate_completion(
    p_completion_id UUID,
    p_rating INTEGER,
    p_review_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := me_user_id();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM completions c
        JOIN items i ON i.id = c.item_id
        JOIN buckets b ON b.id = i.bucket_id
        WHERE c.id = p_completion_id
        AND (
            b.owner_id = user_id
            OR EXISTS (
                SELECT 1 FROM bucket_collaborators bc
                WHERE bc.bucket_id = b.id 
                AND bc.user_id = user_id
            )
            OR (b.visibility = 'friends' AND EXISTS (
                SELECT 1 FROM friendships f
                WHERE (f.user_id = user_id OR f.friend_id = user_id)
                AND f.status = 'accepted'
                AND (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
            ))
            OR user_id = ANY(c.shared_with_user_ids)
        )
    ) THEN
        RAISE EXCEPTION 'Not authorized to rate this completion';
    END IF;
    
    INSERT INTO completion_ratings (completion_id, user_id, rating, review_text)
    VALUES (p_completion_id, user_id, p_rating, p_review_text)
    ON CONFLICT (completion_id, user_id)
    DO UPDATE SET 
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION get_bucket_completion_stats(p_bucket_id UUID)
RETURNS TABLE (
    total_completions BIGINT,
    unique_items_completed BIGINT,
    total_items BIGINT,
    completion_percentage NUMERIC,
    average_rating NUMERIC,
    user_ratings_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(DISTINCT c.id) as total_completions,
        COUNT(DISTINCT c.item_id) as unique_items_completed,
        COUNT(DISTINCT i.id) as total_items,
        ROUND(
            (COUNT(DISTINCT c.item_id)::NUMERIC / COUNT(DISTINCT i.id)::NUMERIC) * 100, 
            2
        ) as completion_percentage,
        ROUND(AVG(cr.rating), 2) as average_rating,
        COUNT(cr.id) as user_ratings_count
    FROM items i
    LEFT JOIN completions c ON c.item_id = i.id
    LEFT JOIN completion_ratings cr ON cr.completion_id = c.id
    WHERE i.bucket_id = p_bucket_id
    AND (
        i.bucket_id IN (
            SELECT id FROM buckets 
            WHERE owner_id = me_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM bucket_collaborators bc
            WHERE bc.bucket_id = i.bucket_id 
            AND bc.user_id = me_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM buckets b
            JOIN friendships f ON (
                (f.user_id = b.owner_id OR f.friend_id = b.owner_id)
                AND f.status = 'accepted'
            )
            WHERE b.id = i.bucket_id 
            AND b.visibility = 'friends'
            AND (f.user_id = me_user_id() OR f.friend_id = me_user_id())
        )
    );
$$;
