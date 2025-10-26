-- Fix challenge_count update mechanism
-- This ensures that challenge_count is properly updated when items are added/removed

-- First, let's ensure the triggers exist and are working
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_bucket_stats_on_item_change ON items;
DROP TRIGGER IF EXISTS update_progress_on_completion ON items;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS trigger_update_bucket_stats();
DROP FUNCTION IF EXISTS trigger_update_progress();
DROP FUNCTION IF EXISTS update_bucket_progress(UUID, UUID);

-- Recreate the update_bucket_progress function
CREATE OR REPLACE FUNCTION update_bucket_progress(p_bucket_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    completion_pct DECIMAL(5,2);
BEGIN
    -- Count total items in bucket
    SELECT COUNT(*) INTO total_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = p_user_id;
    
    -- Count completed items
    SELECT COUNT(*) INTO completed_items
    FROM items 
    WHERE bucket_id = p_bucket_id AND owner_id = p_user_id AND is_completed = TRUE;
    
    -- Calculate completion percentage
    completion_pct := CASE 
        WHEN total_items = 0 THEN 0.00
        ELSE (completed_items::DECIMAL / total_items::DECIMAL) * 100
    END;
    
    -- Update bucket table with challenge count and completion percentage
    UPDATE buckets 
    SET 
        challenge_count = total_items,
        completion_percentage = completion_pct
    WHERE id = p_bucket_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updated bucket %: challenge_count = %, completion_percentage = %', p_bucket_id, total_items, completion_pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record activity
CREATE OR REPLACE FUNCTION record_user_activity(p_user_id UUID, p_completions_count INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    -- Insert or update activity for today
    INSERT INTO user_activity (user_id, activity_date, completions_count)
    VALUES (p_user_id, CURRENT_DATE, p_completions_count)
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET completions_count = user_activity.completions_count + p_completions_count;
    
    -- Update total completions
    UPDATE users 
    SET total_completions = total_completions + p_completions_count
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for progress updates
CREATE OR REPLACE FUNCTION trigger_update_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- If item is being marked as completed
    IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
        -- Record user activity
        PERFORM record_user_activity(NEW.owner_id, 1);
        
        -- Update bucket progress
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        
        -- Update item completion timestamp
        NEW.completed_at := NOW();
    END IF;
    
    -- If satisfaction rating is being updated, also update bucket progress
    IF NEW.satisfaction_rating IS DISTINCT FROM OLD.satisfaction_rating THEN
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
    END IF;
    
    -- If item is being uncompleted
    IF NEW.is_completed = FALSE AND OLD.is_completed = TRUE THEN
        -- Update bucket progress
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        
        -- Clear completion timestamp
        NEW.completed_at := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for bucket stats updates
CREATE OR REPLACE FUNCTION trigger_update_bucket_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Update new bucket if bucket_id changed
        IF NEW.bucket_id != OLD.bucket_id THEN
            PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
            PERFORM update_bucket_progress(OLD.bucket_id, OLD.owner_id);
        ELSE
            PERFORM update_bucket_progress(NEW.bucket_id, NEW.owner_id);
        END IF;
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_bucket_progress(OLD.bucket_id, OLD.owner_id);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the triggers
CREATE TRIGGER update_progress_on_completion
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_progress();

CREATE TRIGGER update_bucket_stats_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_bucket_stats();

-- Create a function to manually recalculate all bucket challenge counts
CREATE OR REPLACE FUNCTION recalculate_all_bucket_counts()
RETURNS VOID AS $$
DECLARE
    bucket_record RECORD;
BEGIN
    -- Loop through all buckets and recalculate their challenge counts
    FOR bucket_record IN 
        SELECT DISTINCT b.id, b.owner_id 
        FROM buckets b
    LOOP
        PERFORM update_bucket_progress(bucket_record.id, bucket_record.owner_id);
    END LOOP;
    
    RAISE NOTICE 'Recalculated challenge counts for all buckets';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the recalculation to fix any existing buckets
SELECT recalculate_all_bucket_counts();

-- Create a function to manually update a specific bucket's count
CREATE OR REPLACE FUNCTION update_bucket_challenge_count(p_bucket_id UUID)
RETURNS VOID AS $$
DECLARE
    bucket_owner_id UUID;
BEGIN
    -- Get the bucket owner
    SELECT owner_id INTO bucket_owner_id FROM buckets WHERE id = p_bucket_id;
    
    IF bucket_owner_id IS NOT NULL THEN
        PERFORM update_bucket_progress(p_bucket_id, bucket_owner_id);
        RAISE NOTICE 'Updated challenge count for bucket %', p_bucket_id;
    ELSE
        RAISE NOTICE 'Bucket % not found', p_bucket_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
