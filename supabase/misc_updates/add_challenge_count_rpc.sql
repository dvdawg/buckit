
CREATE OR REPLACE FUNCTION update_bucket_challenge_count_secure(p_bucket_id UUID)
RETURNS VOID AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
    bucket_owner_id UUID;
    total_items INTEGER;
    completed_items INTEGER;
    completion_pct DECIMAL(5,2);
BEGIN
    -- Get authenticated user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database';
    END IF;
    
    -- Verify user owns the bucket
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    IF bucket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Bucket not found';
    END IF;
    
    IF bucket_owner_id != user_db_id THEN
        RAISE EXCEPTION 'Access denied: You do not own this bucket';
    END IF;
    
    -- Count total items in bucket
    SELECT COUNT(*) INTO total_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = user_db_id;
    
    -- Count completed items
    SELECT COUNT(*) INTO completed_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = user_db_id AND is_completed = TRUE;
    
    -- Calculate completion percentage
    completion_pct := CASE 
        WHEN total_items = 0 THEN 0.00
        ELSE (completed_items::DECIMAL / total_items::DECIMAL) * 100
    END;
    
    -- Update bucket table
    UPDATE buckets 
    SET 
        challenge_count = total_items,
        completion_percentage = completion_pct
    WHERE id = p_bucket_id;
    
    RAISE NOTICE 'Updated bucket %: challenge_count = %, completion_percentage = %', p_bucket_id, total_items, completion_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION recalculate_user_bucket_counts()
RETURNS VOID AS $$
DECLARE
    auth_uid UUID;
    user_db_id UUID;
    bucket_record RECORD;
BEGIN
    -- Get authenticated user
    auth_uid := auth.uid();
    IF auth_uid IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Get user's database ID
    SELECT id INTO user_db_id FROM users WHERE auth_id = auth_uid LIMIT 1;
    IF user_db_id IS NULL THEN
        RAISE EXCEPTION 'User not found in database';
    END IF;
    
    -- Loop through all user's buckets and recalculate their challenge counts
    FOR bucket_record IN 
        SELECT id FROM buckets WHERE owner_id = user_db_id
    LOOP
        PERFORM update_bucket_challenge_count_secure(bucket_record.id);
    END LOOP;
    
    RAISE NOTICE 'Recalculated challenge counts for all user buckets';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
