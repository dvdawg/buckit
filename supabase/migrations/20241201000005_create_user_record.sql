-- Update existing user record to link with auth ID
-- First, let's see what users exist
SELECT id, auth_id, handle, full_name FROM users WHERE handle = 'oskical';

-- Update the existing user record to link with your auth ID
UPDATE users 
SET 
    auth_id = '499c9655-9a2d-4fbf-907e-3ee6e84cc567',
    full_name = COALESCE(full_name, 'Oskical'),
    avatar_url = COALESCE(avatar_url, null),
    points = COALESCE(points, 0),
    location = COALESCE(location, 'Berkeley, CA'),
    current_streak = COALESCE(current_streak, 0),
    longest_streak = COALESCE(longest_streak, 0),
    total_completions = COALESCE(total_completions, 0),
    last_activity_date = COALESCE(last_activity_date, null)
WHERE handle = 'oskical';

-- Verify the update worked
SELECT id, auth_id, handle, full_name, points, current_streak FROM users WHERE auth_id = '499c9655-9a2d-4fbf-907e-3ee6e84cc567';
