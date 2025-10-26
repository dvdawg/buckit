-- Create a safe RPC function to get user buckets without RLS recursion
-- This function uses SECURITY DEFINER to bypass RLS policies entirely

CREATE OR REPLACE FUNCTION get_user_buckets_safe(user_id UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    title TEXT,
    description TEXT,
    visibility TEXT,
    is_collaborative BOOLEAN,
    cover_url TEXT,
    emoji TEXT,
    color TEXT,
    challenge_count INTEGER,
    completion_percentage NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function bypasses RLS entirely by using SECURITY DEFINER
    -- It directly queries the buckets table without triggering RLS policies
    RETURN QUERY
    SELECT 
        b.id,
        b.owner_id,
        b.title,
        b.description,
        b.visibility,
        b.is_collaborative,
        b.cover_url,
        b.emoji,
        b.color,
        b.challenge_count,
        b.completion_percentage,
        b.created_at
    FROM buckets b
    WHERE b.owner_id = user_id
    ORDER BY b.created_at DESC;
END;
$$;
