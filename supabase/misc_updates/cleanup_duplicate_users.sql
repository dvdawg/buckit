WITH duplicate_analysis AS (
  SELECT 
    handle,
    full_name,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at DESC) as user_ids,
    array_agg(created_at ORDER BY created_at DESC) as created_dates
  FROM users 
  WHERE handle LIKE '%@buckit.com' OR full_name IS NOT NULL
  GROUP BY handle, full_name
  HAVING COUNT(*) > 1
)
SELECT 
  handle,
  full_name,
  duplicate_count,
  user_ids,
  created_dates
FROM duplicate_analysis
ORDER BY duplicate_count DESC, handle;

WITH potential_duplicates AS (
  SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    u1.handle as user1_handle,
    u2.handle as user2_handle,
    u1.full_name as user1_name,
    u2.full_name as user2_name,
    u1.created_at as user1_created,
    u2.created_at as user2_created,
    -- Calculate similarity score
    CASE 
      WHEN u1.handle = u2.handle THEN 100
      WHEN u1.full_name = u2.full_name AND u1.full_name IS NOT NULL THEN 80
      WHEN u1.handle LIKE '%' || split_part(u2.handle, '@', 1) || '%' THEN 60
      WHEN u2.handle LIKE '%' || split_part(u1.handle, '@', 1) || '%' THEN 60
      ELSE 0
    END as similarity_score
  FROM users u1
  JOIN users u2 ON u1.id < u2.id  -- Avoid self-joins and duplicate pairs
  WHERE 
    -- Look for users created around the same time (within 1 hour)
    ABS(EXTRACT(EPOCH FROM (u1.created_at - u2.created_at))) < 3600
    AND (
      -- Same handle
      u1.handle = u2.handle
      -- Same full name (if not null)
      OR (u1.full_name = u2.full_name AND u1.full_name IS NOT NULL)
      -- Similar handles (buckit.com emails with similar patterns)
      OR (u1.handle LIKE '%@buckit.com' AND u2.handle LIKE '%@buckit.com' 
          AND split_part(u1.handle, '@', 1) = split_part(u2.handle, '@', 1))
    )
)
SELECT 
  user1_id,
  user2_id,
  user1_handle,
  user2_handle,
  user1_name,
  user2_name,
  user1_created,
  user2_created,
  similarity_score,
  CASE 
    WHEN user1_created > user2_created THEN user1_id
    ELSE user2_id
  END as keep_id,
  CASE 
    WHEN user1_created > user2_created THEN user2_id
    ELSE user1_id
  END as delete_id
FROM potential_duplicates
WHERE similarity_score > 50
ORDER BY similarity_score DESC, user1_created;

CREATE TEMP TABLE users_to_delete AS
WITH potential_duplicates AS (
  SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    u1.handle as user1_handle,
    u2.handle as user2_handle,
    u1.full_name as user1_name,
    u2.full_name as user2_name,
    u1.created_at as user1_created,
    u2.created_at as user2_created,
    CASE 
      WHEN u1.handle = u2.handle THEN 100
      WHEN u1.full_name = u2.full_name AND u1.full_name IS NOT NULL THEN 80
      WHEN u1.handle LIKE '%' || split_part(u2.handle, '@', 1) || '%' THEN 60
      WHEN u2.handle LIKE '%' || split_part(u1.handle, '@', 1) || '%' THEN 60
      ELSE 0
    END as similarity_score
  FROM users u1
  JOIN users u2 ON u1.id < u2.id
  WHERE 
    ABS(EXTRACT(EPOCH FROM (u1.created_at - u2.created_at))) < 3600
    AND (
      u1.handle = u2.handle
      OR (u1.full_name = u2.full_name AND u1.full_name IS NOT NULL)
      OR (u1.handle LIKE '%@buckit.com' AND u2.handle LIKE '%@buckit.com' 
          AND split_part(u1.handle, '@', 1) = split_part(u2.handle, '@', 1))
    )
)
SELECT DISTINCT
  CASE 
    WHEN user1_created > user2_created THEN user2_id
    ELSE user1_id
  END as user_id_to_delete,
  CASE 
    WHEN user1_created > user2_created THEN user1_id
    ELSE user2_id
  END as user_id_to_keep,
  user1_handle,
  user2_handle,
  user1_name,
  user2_name,
  similarity_score
FROM potential_duplicates
WHERE similarity_score > 50;

SELECT 
  'USERS TO DELETE:' as action,
  user_id_to_delete as user_id,
  user1_handle as handle,
  user1_name as full_name,
  similarity_score
FROM users_to_delete
UNION ALL
SELECT 
  'USERS TO KEEP:' as action,
  user_id_to_keep as user_id,
  user2_handle as handle,
  user2_name as full_name,
  similarity_score
FROM users_to_delete
ORDER BY action, similarity_score DESC;

SELECT 
  COUNT(*) as total_duplicates_to_remove,
  COUNT(DISTINCT user_id_to_delete) as unique_users_to_delete,
  COUNT(DISTINCT user_id_to_keep) as unique_users_to_keep
FROM users_to_delete;


DELETE FROM completions 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM items 
WHERE owner_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM buckets 
WHERE owner_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM friendships 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete)
   OR friend_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM bucket_collaborators 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM bucket_progress 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM performance_metrics 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM user_activity 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM weekly_progress 
WHERE user_id IN (SELECT user_id_to_delete FROM users_to_delete);

DELETE FROM users 
WHERE id IN (SELECT user_id_to_delete FROM users_to_delete);

SELECT COUNT(*) as remaining_users FROM users;
