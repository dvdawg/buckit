-- Sample seed data for development
-- Note: This assumes you have some test users in your auth.users table

-- Insert sample users (you'll need to replace these with actual auth.uid() values)
-- INSERT INTO users (auth_id, handle, full_name, avatar_url, points) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'alice', 'Alice Johnson', 'https://example.com/avatar1.jpg', 150),
-- ('00000000-0000-0000-0000-000000000002', 'bob', 'Bob Smith', 'https://example.com/avatar2.jpg', 200),
-- ('00000000-0000-0000-0000-000000000003', 'charlie', 'Charlie Brown', 'https://example.com/avatar3.jpg', 75);

-- Sample buckets (uncomment and modify user IDs as needed)
-- INSERT INTO buckets (owner_id, title, description, visibility, is_collaborative) VALUES
-- ((SELECT id FROM users WHERE handle = 'alice'), 'Travel Bucket List', 'Places I want to visit', 'public', false),
-- ((SELECT id FROM users WHERE handle = 'bob'), 'Fitness Goals', 'My workout and health goals', 'friends', true),
-- ((SELECT id FROM users WHERE handle = 'charlie'), 'Learning Goals', 'Skills I want to master', 'private', false);

-- Sample items (uncomment and modify as needed)
-- INSERT INTO items (bucket_id, owner_id, title, description, difficulty, visibility) VALUES
-- ((SELECT id FROM buckets WHERE title = 'Travel Bucket List'), (SELECT id FROM users WHERE handle = 'alice'), 'Visit Japan', 'Experience Japanese culture and food', 3, 'public'),
-- ((SELECT id FROM buckets WHERE title = 'Travel Bucket List'), (SELECT id FROM users WHERE handle = 'alice'), 'Go to Iceland', 'See the Northern Lights', 4, 'public'),
-- ((SELECT id FROM buckets WHERE title = 'Fitness Goals'), (SELECT id FROM users WHERE handle = 'bob'), 'Run a Marathon', 'Complete a full 26.2 mile race', 5, 'friends'),
-- ((SELECT id FROM buckets WHERE title = 'Learning Goals'), (SELECT id FROM users WHERE handle = 'charlie'), 'Learn Spanish', 'Become conversational in Spanish', 2, 'private');

-- Sample friendships (uncomment and modify as needed)
-- INSERT INTO friendships (user_id, friend_id, status) VALUES
-- ((SELECT id FROM users WHERE handle = 'alice'), (SELECT id FROM users WHERE handle = 'bob'), 'accepted'),
-- ((SELECT id FROM users WHERE handle = 'bob'), (SELECT id FROM users WHERE handle = 'charlie'), 'accepted');

-- Sample feed events (these would be created automatically by the RPC functions)
-- INSERT INTO feed_events (actor_id, verb, object_type, object_id, audience) VALUES
-- ((SELECT id FROM users WHERE handle = 'alice'), 'created', 'bucket', (SELECT id FROM buckets WHERE title = 'Travel Bucket List'), 'public'),
-- ((SELECT id FROM users WHERE handle = 'bob'), 'created', 'item', (SELECT id FROM items WHERE title = 'Run a Marathon'), 'friends');
