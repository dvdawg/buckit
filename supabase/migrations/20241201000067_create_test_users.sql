INSERT INTO users (id, auth_id, full_name, handle, avatar_url, points, location, current_streak, longest_streak, total_completions)
VALUES 
    ('0104e50a-53f4-4ae8-bf93-d15c6b65d262', gen_random_uuid(), 'John Smith', 'johnsmith266', null, 0, 'San Francisco, CA', 0, 0, 0),
    ('01efb100-3292-4ee8-80cb-359d4339a236', gen_random_uuid(), 'Rachel Wilson', 'rachelwilson312', null, 0, 'New York, NY', 0, 0, 0),
    ('0551092a-4b69-4222-bec5-c3627264e6c0', gen_random_uuid(), 'Cheryl Jones', 'cheryljones947', null, 0, 'Los Angeles, CA', 0, 0, 0),
    ('07a522aa-08b1-4331-a625-5e5a98d5f48d', gen_random_uuid(), 'Christopher Brown', 'christopherbrown200', null, 0, 'Chicago, IL', 0, 0, 0),
    ('07c3cbfc-ca35-449e-847b-fa09c87bc650', gen_random_uuid(), 'Scott Davis', 'scottdavis187', null, 0, 'Seattle, WA', 0, 0, 0),
    ('08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0', gen_random_uuid(), 'Frances Miller', 'francesmiller286', null, 0, 'Boston, MA', 0, 0, 0),
    ('0a1278a4-7b5c-47d6-84e9-69fbf8489888', gen_random_uuid(), 'Brenda Wilson', 'brendawilson795', null, 0, 'Austin, TX', 0, 0, 0),
    ('0dfd16ba-286a-4e4c-a47e-79b2b3be4bb0', gen_random_uuid(), 'Joseph Moore', 'josephmoore399', null, 0, 'Denver, CO', 0, 0, 0),
    ('0f26add2-a3b3-4454-a72e-675dd3982de0', gen_random_uuid(), 'Sean Taylor', 'seantaylor275', null, 0, 'Portland, OR', 0, 0, 0),
    ('10faf8ea-5880-477d-bb4e-d3814c476a1d', gen_random_uuid(), 'Megan Anderson', 'megananderson967', null, 0, 'Miami, FL', 0, 0, 0),
    ('17324414-91f6-4047-b958-5276f3bc7936', gen_random_uuid(), 'Daniel Thomas', 'danielthomas422', null, 0, 'Phoenix, AZ', 0, 0, 0),
    ('19a0f163-4d06-4c61-879b-f9ba47ba6875', gen_random_uuid(), 'Gary Jackson', 'garyjackson246', null, 0, 'Las Vegas, NV', 0, 0, 0),
    ('1b7a285b-3ec1-4692-bc72-5447ce458750', gen_random_uuid(), 'Anthony White', 'anthonywhite607', null, 0, 'Nashville, TN', 0, 0, 0),
    ('1ca6553d-8d24-441b-8aed-d6f962dd68e0', gen_random_uuid(), 'Arthur Harris', 'arthurharris816', null, 0, 'Atlanta, GA', 0, 0, 0),
    ('20ce621f-1a1c-479f-944c-9127d051ab7d', gen_random_uuid(), 'Amy Martin', 'amymartin344', null, 0, 'Dallas, TX', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO buckets (id, owner_id, title, description, visibility, emoji, color)
VALUES 
    (gen_random_uuid(), '0104e50a-53f4-4ae8-bf93-d15c6b65d262', 'Fitness Goals', 'My fitness journey', 'public', '💪', '#FF6B6B'),
    (gen_random_uuid(), '01efb100-3292-4ee8-80cb-359d4339a236', 'Travel Adventures', 'Places to visit', 'public', '✈️', '#4ECDC4'),
    (gen_random_uuid(), '0551092a-4b69-4222-bec5-c3627264e6c0', 'Learning Goals', 'Skills to master', 'public', '📚', '#45B7D1'),
    (gen_random_uuid(), '07a522aa-08b1-4331-a625-5e5a98d5f48d', 'Food Adventures', 'Restaurants to try', 'public', '🍽️', '#96CEB4'),
    (gen_random_uuid(), '07c3cbfc-ca35-449e-847b-fa09c87bc650', 'Tech Projects', 'Coding challenges', 'public', '💻', '#FECA57')
ON CONFLICT (id) DO NOTHING;

INSERT INTO items (id, bucket_id, owner_id, title, description, visibility, difficulty, price_min, price_max)
SELECT 
    gen_random_uuid(),
    b.id,
    b.owner_id,
    CASE 
        WHEN b.title = 'Fitness Goals' THEN 'Run 5K without stopping'
        WHEN b.title = 'Travel Adventures' THEN 'Visit the Grand Canyon'
        WHEN b.title = 'Learning Goals' THEN 'Learn Spanish basics'
        WHEN b.title = 'Food Adventures' THEN 'Try authentic sushi'
        WHEN b.title = 'Tech Projects' THEN 'Build a mobile app'
    END,
    'A challenging goal to achieve',
    'public',
    3,
    0,
    100
FROM buckets b
WHERE b.owner_id IN (
    '0104e50a-53f4-4ae8-bf93-d15c6b65d262',
    '01efb100-3292-4ee8-80cb-359d4339a236',
    '0551092a-4b69-4222-bec5-c3627264e6c0',
    '07a522aa-08b1-4331-a625-5e5a98d5f48d',
    '07c3cbfc-ca35-449e-847b-fa09c87bc650'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO friendships (user_id, friend_id, status, created_at)
VALUES 
    ('0104e50a-53f4-4ae8-bf93-d15c6b65d262', '01efb100-3292-4ee8-80cb-359d4339a236', 'accepted', NOW()),
    ('0104e50a-53f4-4ae8-bf93-d15c6b65d262', '0551092a-4b69-4222-bec5-c3627264e6c0', 'accepted', NOW()),
    ('01efb100-3292-4ee8-80cb-359d4339a236', '07a522aa-08b1-4331-a625-5e5a98d5f48d', 'accepted', NOW()),
    ('0551092a-4b69-4222-bec5-c3627264e6c0', '07c3cbfc-ca35-449e-847b-fa09c87bc650', 'accepted', NOW()),
    ('07a522aa-08b1-4331-a625-5e5a98d5f48d', '08d94a6e-8a04-4d13-8330-b9cc9ffbe5e0', 'accepted', NOW())
ON CONFLICT (user_id, friend_id) DO NOTHING;

INSERT INTO completions (id, item_id, user_id, verified, created_at)
SELECT 
    gen_random_uuid(),
    i.id,
    i.owner_id,
    TRUE,
    NOW() - INTERVAL '1 day' * (RANDOM() * 7)
FROM items i
WHERE i.owner_id IN (
    '0104e50a-53f4-4ae8-bf93-d15c6b65d262',
    '01efb100-3292-4ee8-80cb-359d4339a236',
    '0551092a-4b69-4222-bec5-c3627264e6c0',
    '07a522aa-08b1-4331-a625-5e5a98d5f48d',
    '07c3cbfc-ca35-449e-847b-fa09c87bc650'
)
ON CONFLICT (id) DO NOTHING;

