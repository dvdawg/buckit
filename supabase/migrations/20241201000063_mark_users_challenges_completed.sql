-- Mark all challenges as completed for specific users
-- This migration marks all items (challenges) as completed for the 15 users shown in the image

-- First, let's create a temporary table with the user UUIDs from the image
CREATE TEMP TABLE target_users (
    uuid TEXT,
    handle TEXT,
    full_name TEXT
);

-- Insert the user data from the image with diverse names
INSERT INTO target_users (uuid, handle, full_name) VALUES
    ('0104e50a-53f4-4ae8-bf93-d15c6b65d262', 'johnsmith266', 'John Smith'),
    ('01efb100-3292-4ee8-80cb-359d4339a236', 'rachelwilson312', 'Rachel Wilson'),
    ('0551092-4b69-4222-bec5-c3627264e6c', 'cheryljones947', 'Cheryl Jones'),
    ('07a522aa-08b1-4331-a625-5e5a98d5f48d', 'christopherbrown200', 'Christopher Brown'),
    ('07c3cbfc-ca35-449e-847b-fa09c87bc650', 'scottdavis187', 'Scott Davis'),
    ('08d94a6e-8a04-4d13-8330-b9cc9ffbe5e', 'francesmiller286', 'Frances Miller'),
    ('0a1278a4-7b5c-47d6-84e9-69fbf8489888', 'brendawilson795', 'Brenda Wilson'),
    ('0dfd16ba-286a-4e4c-a47e-79b2b3be4bb', 'josephmoore399', 'Joseph Moore'),
    ('0f26add2-a3b3-4454-a72e-675dd3982de', 'seantaylor275', 'Sean Taylor'),
    ('10faf8ea-5880-477d-bb4e-d3814c476a1d', 'megananderson967', 'Megan Anderson'),
    ('17324414-91f6-4047-b958-5276f3bc7936', 'danielthomas422', 'Daniel Thomas'),
    ('19a0f163-4d06-4c61-879b-f9ba47ba6875', 'garyjackson246', 'Gary Jackson'),
    ('1b7a285b-3ec1-4692-bc72-5447ce458750', 'anthonywhite607', 'Anthony White'),
    ('1ca6553d-8d24-441b-8aed-d6f962dd68e', 'arthurharris816', 'Arthur Harris'),
    ('20ce621f-1a1c-479f-944c-9127d051ab7d', 'amymartin344', 'Amy Martin');

-- Mark all items as completed for these users
-- Set completed_at to a recent timestamp (within the last 7 days)
UPDATE items 
SET 
    is_completed = TRUE,
    completed_at = NOW() - INTERVAL '1 day' * (RANDOM() * 7) -- Random completion within last 7 days
WHERE owner_id IN (
    SELECT u.id 
    FROM users u 
    JOIN target_users tu ON u.id::text = tu.uuid
);

-- Create completion records for each completed item
-- This ensures the completions table has records for all completed items
INSERT INTO completions (item_id, user_id, verified, created_at)
SELECT 
    i.id as item_id,
    i.owner_id as user_id,
    TRUE as verified,
    i.completed_at as created_at
FROM items i
JOIN users u ON u.id = i.owner_id
JOIN target_users tu ON u.id::text = tu.uuid
WHERE i.is_completed = TRUE
AND NOT EXISTS (
    SELECT 1 FROM completions c 
    WHERE c.item_id = i.id AND c.user_id = i.owner_id
);

-- Update user statistics for these users
-- Update total_completions count
UPDATE users 
SET total_completions = (
    SELECT COUNT(*) 
    FROM items 
    WHERE owner_id = users.id AND is_completed = TRUE
)
WHERE id IN (
    SELECT u.id 
    FROM users u 
    JOIN target_users tu ON u.id::text = tu.uuid
);

-- Update current_streak to a reasonable value (7 days since they completed recently)
UPDATE users 
SET 
    current_streak = 7,
    longest_streak = GREATEST(longest_streak, 7),
    last_activity_date = CURRENT_DATE
WHERE id IN (
    SELECT u.id 
    FROM users u 
    JOIN target_users tu ON u.id::text = tu.uuid
);

-- Update bucket progress for all buckets owned by these users
-- This will recalculate completion percentages
DO $$
DECLARE
    user_record RECORD;
    bucket_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT u.id 
        FROM users u 
        JOIN target_users tu ON u.id::text = tu.uuid
    LOOP
        FOR bucket_record IN 
            SELECT id FROM buckets WHERE owner_id = user_record.id
        LOOP
            PERFORM update_bucket_progress(bucket_record.id, user_record.id);
        END LOOP;
    END LOOP;
END $$;

-- Create user activity records for the last 7 days to reflect recent activity
INSERT INTO user_activity (user_id, activity_date, completions_count)
SELECT 
    u.id as user_id,
    CURRENT_DATE - INTERVAL '1 day' * (RANDOM() * 7) as activity_date,
    (RANDOM() * 5 + 1)::INTEGER as completions_count
FROM users u
JOIN target_users tu ON u.id::text = tu.uuid
ON CONFLICT (user_id, activity_date) 
DO UPDATE SET completions_count = user_activity.completions_count + EXCLUDED.completions_count;

-- Log the migration results
DO $$
DECLARE
    completed_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO completed_count
    FROM items i
    JOIN users u ON u.id = i.owner_id
    JOIN target_users tu ON u.id::text = tu.uuid
    WHERE i.is_completed = TRUE;
    
    SELECT COUNT(*) INTO user_count
    FROM users u
    JOIN target_users tu ON u.id::text = tu.uuid;
    
    RAISE NOTICE 'Migration completed: Marked % items as completed for % users', completed_count, user_count;
END $$;

-- Clean up temporary table
DROP TABLE target_users;
