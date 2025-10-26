-- Migration to generate 150 test users with friends, buckets, and challenges
-- All users will be friends with user 4501837d-52cd-4f67-952c-c0550f1d25ee
-- Each user will have 3 friends among the 150 generated users
-- Each user will have 3 buckets with 3 challenges each

-- Common first and last names for generating realistic user data
WITH first_names AS (
  SELECT unnest(ARRAY[
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna',
    'Steven', 'Carol', 'Paul', 'Ruth', 'Andrew', 'Sharon', 'Joshua', 'Michelle',
    'Kenneth', 'Laura', 'Kevin', 'Sarah', 'Brian', 'Kimberly', 'George', 'Deborah',
    'Timothy', 'Dorothy', 'Ronald', 'Lisa', 'Jason', 'Nancy', 'Edward', 'Karen',
    'Jeffrey', 'Betty', 'Ryan', 'Helen', 'Jacob', 'Sandra', 'Gary', 'Donna',
    'Nicholas', 'Carol', 'Eric', 'Ruth', 'Jonathan', 'Sharon', 'Stephen', 'Michelle',
    'Larry', 'Laura', 'Justin', 'Sarah', 'Scott', 'Kimberly', 'Brandon', 'Deborah',
    'Benjamin', 'Dorothy', 'Samuel', 'Amy', 'Gregory', 'Angela', 'Alexander', 'Ashley',
    'Patrick', 'Brenda', 'Jack', 'Emma', 'Dennis', 'Olivia', 'Jerry', 'Cynthia',
    'Tyler', 'Marie', 'Aaron', 'Janet', 'Jose', 'Catherine', 'Henry', 'Frances',
    'Adam', 'Christine', 'Douglas', 'Samantha', 'Nathan', 'Debra', 'Peter', 'Rachel',
    'Zachary', 'Carolyn', 'Kyle', 'Janet', 'Noah', 'Virginia', 'Alan', 'Maria',
    'Ethan', 'Heather', 'Jeremy', 'Diane', 'Mason', 'Julie', 'Christian', 'Joyce',
    'Keith', 'Victoria', 'Roger', 'Kelly', 'Gerald', 'Christina', 'Harold', 'Joan',
    'Sean', 'Evelyn', 'Austin', 'Judith', 'Carl', 'Megan', 'Arthur', 'Cheryl',
    'Lawrence', 'Andrea', 'Dylan', 'Hannah', 'Jesse', 'Jacqueline', 'Jordan', 'Martha',
    'Bryan', 'Gloria', 'Billy', 'Teresa', 'Joe', 'Sara', 'Bruce', 'Janice',
    'Gabriel', 'Julia', 'Logan', 'Marie', 'Albert', 'Madison', 'Wayne', 'Grace',
    'Roy', 'Judy', 'Ralph', 'Theresa', 'Eugene', 'Beverly', 'Louis', 'Denise',
    'Philip', 'Marilyn', 'Bobby', 'Amber', 'Johnny', 'Danielle', 'Willie', 'Rose',
    'Elijah', 'Brittany', 'Randy', 'Diana', 'Howard', 'Abigail', 'Eugene', 'Jane'
  ]) AS name
),
last_names AS (
  SELECT unnest(ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
    'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
    'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
    'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
    'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
    'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
    'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
    'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
    'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham',
    'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant',
    'Herrera', 'Gibson', 'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray',
    'Ford', 'Castro', 'Marshall', 'Owens', 'Harrison', 'Fernandez', 'McDonald', 'Woods',
    'Washington', 'Kennedy', 'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb',
    'Tucker', 'Guzman', 'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter',
    'Gordon', 'Mendez', 'Silva', 'Shaw', 'Snyder', 'Mason', 'Dixon', 'Munoz',
    'Hunt', 'Hicks', 'Holmes', 'Palmer', 'Wagner', 'Black', 'Robertson', 'Boyd',
    'Rose', 'Stone', 'Salazar', 'Fox', 'Warren', 'Mills', 'Meyer', 'Rice',
    'Schmidt', 'Garza', 'Daniels', 'Ferguson', 'Nichols', 'Stephens', 'Soto', 'Weaver',
    'Ryan', 'Gardner', 'Payne', 'Grant', 'Dunn', 'Kelley', 'Spencer', 'Hawkins',
    'Arnold', 'Pierce', 'Vazquez', 'Hansen', 'Peters', 'Santos', 'Hart', 'Bradley',
    'Knight', 'Elliott', 'Cunningham', 'Duncan', 'Armstrong', 'Hudson', 'Carroll', 'Lane',
    'Riley', 'Andrews', 'Alvarado', 'Jenkins', 'Watts', 'Escobar', 'Beck', 'Barnes',
    'Gaines', 'Calderon', 'Aguirre', 'Luna', 'Erickson', 'Reeves', 'Chang', 'Klein',
    'Salinas', 'Fuentes', 'Baldwin', 'Daniel', 'Simon', 'Velasco', 'Hardy', 'Higgins',
    'Aguilar', 'Lin', 'Cummings', 'Chandler', 'Sharp', 'Barber', 'Bowen', 'Ochoa',
    'Dennis', 'Robbins', 'Liu', 'Ramsey', 'Francis', 'Griffith', 'Paul', 'Blair',
    'Oconnor', 'Morrison', 'Gill', 'James', 'Hoffman', 'Blake', 'Rose', 'Scott',
    'Casey', 'Cobb', 'Walters', 'Logan', 'Fleming', 'Walton', 'Robertson', 'Jacobs',
    'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero',
    'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno',
    'Bowman', 'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson',
    'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins',
    'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis', 'Neal',
    'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton', 'Shelton',
    'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles',
    'Craig', 'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates',
    'Hale', 'Rhodes', 'Pena', 'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez',
    'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago', 'Norris', 'Hardy', 'Love',
    'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page', 'Munoz',
    'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey',
    'Wolfe', 'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber',
    'Cummings', 'Hines', 'Baldwin', 'Griffith', 'Valdez', 'Hubbard', 'Salinas', 'Reeves',
    'Warner', 'Bush', 'Thornton', 'Mann', 'Zimmerman', 'Erickson', 'Fletcher', 'McKinney',
    'Page', 'Dawson', 'Joseph', 'Marquez', 'Reeves', 'Klein', 'Espinoza', 'Baldwin',
    'Moran', 'Love', 'Robbins', 'Higgins', 'Ball', 'Curtis', 'Valdez', 'Hendricks',
    'Dunlap', 'Baker', 'Vargas', 'Black', 'Hodges', 'Clayton', 'Keller', 'Maxwell',
    'Wallace', 'Mccoy', 'Bauer', 'Norton', 'Pope', 'Flynn', 'Hogan', 'Robles',
    'Salinas', 'Yates', 'Lindsey', 'Lloyd', 'Marsh', 'Mcbride', 'Owen', 'Solis',
    'Pham', 'Lang', 'Pratt', 'Lara', 'Brock', 'Ballard', 'Trujillo', 'Shaffer',
    'Drake', 'Roman', 'Aguirre', 'Morton', 'Stokes', 'Lamb', 'Pacheco', 'Patrick',
    'Cochran', 'Shepherd', 'Cain', 'Burnett', 'Hess', 'Li', 'Cervantes', 'Olsen',
    'Briggs', 'Ochoa', 'Cabrera', 'Velasquez', 'Montoya', 'Roth', 'Meyers', 'Cardenas',
    'Fuentes', 'Weiss', 'Hoover', 'Wilkins', 'Nicholson', 'Underwood', 'Short', 'Carson',
    'Morrow', 'Colon', 'Holloway', 'Summers', 'Bryan', 'Petersen', 'Mckenzie', 'Serrano',
    'Wilcox', 'Carey', 'Clayton', 'Poole', 'Calderon', 'Gallegos', 'Greer', 'Rivas',
    'Guerra', 'Decker', 'Collier', 'Wall', 'Whitaker', 'Bass', 'Flowers', 'Davenport',
    'Conley', 'Houston', 'Huff', 'Copeland', 'Hood', 'Monroe', 'Massey', 'Roberson',
    'Combs', 'Franco', 'Larsen', 'Pittman', 'Randall', 'Skinner', 'Wilkinson', 'Kirby',
    'Cameron', 'Bridges', 'Anthony', 'Richard', 'Kirk', 'Bruce', 'Singleton', 'Mathis',
    'Bradford', 'Boone', 'Abbott', 'Charles', 'Allison', 'Sweeney', 'Atkinson', 'Horn',
    'Jefferson', 'Rosales', 'York', 'Christian', 'Phelps', 'Farrell', 'Castaneda', 'Nash',
    'Dickerson', 'Bond', 'Wyatt', 'Foley', 'Chase', 'Gates', 'Vincent', 'Mathews',
    'Hodge', 'Garrison', 'Trevino', 'Villarreal', 'Heath', 'Dalton', 'Valencia', 'Callahan',
    'Hensley', 'Atkins', 'Huffman', 'Roy', 'Boyer', 'Shields', 'Lin', 'Hancock',
    'Grimes', 'Glenn', 'Cline', 'Delacruz', 'Camacho', 'Dillon', 'Parrish', 'Oneill',
    'Melton', 'Booth', 'Kane', 'Berg', 'Harrell', 'Pitts', 'Savage', 'Wiggins',
    'Brennan', 'Salas', 'Marks', 'Russo', 'Sawyer', 'Baxter', 'Golden', 'Hutchinson',
    'Liu', 'Walter', 'McDowell', 'Wiley', 'Rich', 'Humphrey', 'Johns', 'Koch',
    'Suarez', 'Hobbs', 'Beard', 'Gilmore', 'Ibarra', 'Keith', 'Macias', 'Khan',
    'Andrade', 'Ware', 'Stephenson', 'Henson', 'Wilkerson', 'Dyer', 'McClure', 'Blackwell',
    'Mercado', 'Tanner', 'Eaton', 'Clay', 'Barron', 'Beasley', 'Oneal', 'Preston',
    'Small', 'Wu', 'Zamora', 'Macdonald', 'Vance', 'Snow', 'McClain', 'Stafford',
    'Orozco', 'Barry', 'English', 'Shannon', 'Kline', 'Jacobson', 'Woodard', 'Huang',
    'Kemp', 'Mosley', 'Prince', 'Merritt', 'Hurst', 'Villanueva', 'Roach', 'Nolan',
    'Lam', 'Yoder', 'Mccullough', 'Lester', 'Santana', 'Valenzuela', 'Winters', 'Barrera',
    'Leach', 'Orr', 'Berger', 'Mckee', 'Strong', 'Conway', 'Stein', 'Whitehead',
    'Bullock', 'Escobar', 'Knox', 'Meadows', 'Solomon', 'Velez', 'Odonnell', 'Kerr',
    'Stout', 'Blankenship', 'Browning', 'Kent', 'Lozano', 'Bartlett', 'Pruitt', 'Buck',
    'Barr', 'Gaines', 'Durham', 'Gentry', 'Mcintyre', 'Sloan', 'Melendez', 'Rocha',
    'Herman', 'Sexton', 'Moon', 'Hendricks', 'Rangel', 'Stark', 'Lowery', 'Hardin',
    'Hull', 'Sellers', 'Ellison', 'Calhoun', 'Gillespie', 'Mora', 'Knapp', 'Mccall',
    'Morse', 'Dorsey', 'Weeks', 'Nielsen', 'Livingston', 'Leblanc', 'Mclean', 'Bradshaw',
    'Glass', 'Middleton', 'Buckley', 'Schaefer', 'Frost', 'Howe', 'House', 'Mcintosh',
    'Ho', 'Pennington', 'Reilly', 'Hebert', 'Mcfarland', 'Hickman', 'Noble', 'Spears',
    'Conrad', 'Arias', 'Galvan', 'Velazquez', 'Huynh', 'Frederick', 'Randolph', 'Cantu',
    'Fitzpatrick', 'Mahoney', 'Peck', 'Villa', 'Michael', 'Donovan', 'Mcconnell', 'Walls',
    'Boyle', 'Mayer', 'Zuniga', 'Giles', 'Pineda', 'Pace', 'Hurley', 'Mays',
    'Mcmillan', 'Crosby', 'Ayers', 'Case', 'Bentley', 'Shepard', 'Everett', 'Pugh',
    'David', 'Mcmahon', 'Dunlap', 'Bender', 'Hahn', 'Harding', 'Acevedo', 'Raymond',
    'Blackburn', 'Duffy', 'Landry', 'Dougherty', 'Bautista', 'Shah', 'Potts', 'Arroyo',
    'Valentine', 'Meza', 'Gould', 'Vaughan', 'Fry', 'Hubbard', 'Cantrell', 'Hunt',
    'Higgins', 'Atkinson', 'Bond', 'Berger', 'Mercado', 'Mccarthy', 'Hendrix', 'Horton',
    'Huffman', 'Boyd', 'Mays', 'Mccall', 'Roth', 'Ray', 'Mcconnell', 'Warner',
    'Mccormick', 'Farrell', 'Walsh', 'Mccarthy', 'Mcconnell', 'Mccall', 'Mccormick', 'Mccarthy'
  ]) AS name
),
-- Generate 150 users
generated_users AS (
  SELECT 
    gen_random_uuid() as id,
    gen_random_uuid() as auth_id,
    LOWER(fn.name || ln.name || floor(random() * 1000)::text) as handle,
    fn.name || ' ' || ln.name as full_name,
    LOWER(fn.name || '.' || ln.name || '@buckit.com') as email,
    floor(random() * 1000) as points,
    now() as created_at,
    'San Francisco, CA' as location,
    floor(random() * 30) as current_streak,
    floor(random() * 100) as longest_streak,
    floor(random() * 500) as total_completions,
    current_date - interval '1 day' * floor(random() * 30) as last_activity_date
  FROM first_names fn
  CROSS JOIN last_names ln
  LIMIT 150
),
-- Insert users
inserted_users AS (
  INSERT INTO users (id, auth_id, handle, full_name, points, created_at, location, current_streak, longest_streak, total_completions, last_activity_date)
  SELECT id, auth_id, handle, full_name, points, created_at, location, current_streak, longest_streak, total_completions, last_activity_date
  FROM generated_users
  RETURNING id
),
-- Create friendships with the specified user
friendships_with_main AS (
  INSERT INTO friendships (user_id, friend_id, status)
  SELECT 
    '4501837d-52cd-4f67-952c-c0550f1d25ee'::uuid,
    gu.id,
    'accepted'
  FROM generated_users gu
  UNION ALL
  SELECT 
    gu.id,
    '4501837d-52cd-4f67-952c-c0550f1d25ee'::uuid,
    'accepted'
  FROM generated_users gu
  ON CONFLICT (user_id, friend_id) DO NOTHING
  RETURNING user_id, friend_id
),
-- Create friendships between the 150 users (3 friends each)
user_friendships AS (
  INSERT INTO friendships (user_id, friend_id, status)
  WITH friendship_pairs AS (
    SELECT DISTINCT
      gu1.id as user1_id,
      gu2.id as user2_id
    FROM generated_users gu1
    CROSS JOIN LATERAL (
      SELECT gu2.id
      FROM generated_users gu2
      WHERE gu2.id != gu1.id
      ORDER BY random()
      LIMIT 3
    ) gu2
  )
  SELECT 
    user1_id as user_id,
    user2_id as friend_id,
    'accepted' as status
  FROM friendship_pairs
  UNION ALL
  SELECT 
    user2_id as user_id,
    user1_id as friend_id,
    'accepted' as status
  FROM friendship_pairs
  ON CONFLICT (user_id, friend_id) DO NOTHING
  RETURNING user_id, friend_id
),
-- Create buckets for each user
user_buckets AS (
  INSERT INTO buckets (owner_id, title, description, visibility, is_collaborative, emoji, color)
  SELECT 
    gu.id,
    bucket_titles.title,
    'Hooray',
    'public',
    false,
    bucket_titles.emoji,
    bucket_titles.color
  FROM generated_users gu
  CROSS JOIN (
    VALUES 
      ('Fitness Goals', '💪', '#ff6b6b'),
      ('Travel Adventures', '✈️', '#4ecdc4'),
      ('Learning & Growth', '📚', '#45b7d1'),
      ('Creative Projects', '🎨', '#96ceb4'),
      ('Health & Wellness', '🧘', '#feca57'),
      ('Career Development', '💼', '#ff9ff3'),
      ('Social Connections', '👥', '#54a0ff'),
      ('Home & Garden', '🏠', '#5f27cd'),
      ('Cooking & Food', '🍳', '#00d2d3'),
      ('Outdoor Activities', '🏔️', '#ff9f43')
  ) AS bucket_titles(title, emoji, color)
  ORDER BY gu.id, random()
  LIMIT 450  -- 3 buckets per user
  RETURNING id, owner_id, title
),
-- Create challenges for each bucket
bucket_challenges AS (
  INSERT INTO items (bucket_id, owner_id, title, description, location_name, visibility, difficulty, price_min, price_max)
  SELECT 
    ub.id,
    ub.owner_id,
    challenge_data.title,
    challenge_data.description,
    challenge_data.location,
    'public',
    floor(random() * 5) + 1,
    floor(random() * 100),
    floor(random() * 500) + 100
  FROM user_buckets ub
  CROSS JOIN (
    VALUES 
      -- Fitness Goals challenges
      ('Run 5K', 'Complete a 5K run', 'Golden Gate Park'),
      ('Gym Workout', 'Hit the gym for strength training', 'Crunch Fitness SF'),
      ('Yoga Session', 'Attend a yoga class', 'Yoga Tree Castro'),
      ('Hike Trail', 'Hike a local trail', 'Lands End Trail'),
      ('Swimming', 'Swim laps at the pool', 'Mission Pool'),
      ('Cycling', 'Bike ride around the city', 'Embarcadero'),
      ('Dance Class', 'Take a dance class', 'Oasis SF'),
      ('Rock Climbing', 'Indoor rock climbing', 'Planet Granite'),
      ('Martial Arts', 'Martial arts training', 'SF Judo Institute'),
      
      -- Travel Adventures challenges
      ('Visit Museum', 'Explore a local museum', 'SFMOMA'),
      ('City Tour', 'Take a city walking tour', 'Union Square'),
      ('Food Tour', 'Try new restaurants', 'Mission District'),
      ('Beach Day', 'Spend a day at the beach', 'Ocean Beach'),
      ('Cable Car Ride', 'Ride the historic cable car', 'Powell Street'),
      ('Alcatraz Tour', 'Visit Alcatraz Island', 'Pier 33'),
      ('Golden Gate Bridge', 'Walk across the bridge', 'Golden Gate Bridge'),
      ('Chinatown Explore', 'Explore Chinatown', 'Grant Avenue'),
      ('Fisherman''s Wharf', 'Visit the wharf', 'Pier 39'),
      
      -- Learning & Growth challenges
      ('Read Book', 'Read a new book', 'SF Public Library'),
      ('Online Course', 'Complete an online course', 'Home'),
      ('Language Practice', 'Practice a new language', 'Language Exchange SF'),
      ('Workshop Attend', 'Attend a skill workshop', 'General Assembly SF'),
      ('Podcast Listen', 'Listen to educational podcast', 'Home'),
      ('Documentary Watch', 'Watch a documentary', 'Home'),
      ('TED Talk', 'Watch TED talks', 'Home'),
      ('Book Club', 'Join a book club meeting', 'Book Passage'),
      ('Coding Practice', 'Practice programming', 'Home'),
      
      -- Creative Projects challenges
      ('Art Gallery', 'Visit an art gallery', 'De Young Museum'),
      ('Photography', 'Take creative photos', 'Palace of Fine Arts'),
      ('Writing', 'Write a short story', 'Home'),
      ('Music Practice', 'Practice an instrument', 'Home'),
      ('Craft Project', 'Complete a craft project', 'Home'),
      ('Painting', 'Create a painting', 'Home'),
      ('Pottery Class', 'Take a pottery class', 'Clay Studio SF'),
      ('Sewing Project', 'Complete a sewing project', 'Home'),
      ('Digital Art', 'Create digital artwork', 'Home'),
      
      -- Health & Wellness challenges
      ('Meditation', 'Daily meditation practice', 'Home'),
      ('Healthy Cooking', 'Cook a healthy meal', 'Home'),
      ('Doctor Visit', 'Annual checkup', 'UCSF Medical Center'),
      ('Dental Cleaning', 'Dental appointment', 'SF Dental Group'),
      ('Eye Exam', 'Eye examination', 'Warby Parker SF'),
      ('Massage', 'Get a relaxing massage', 'Kabuki Springs'),
      ('Spa Day', 'Treat yourself to spa day', 'Burke Williams'),
      ('Sleep Well', 'Get 8 hours of sleep', 'Home'),
      ('Hydration', 'Drink 8 glasses of water', 'Home'),
      
      -- Career Development challenges
      ('Networking Event', 'Attend networking event', 'WeWork SF'),
      ('Resume Update', 'Update your resume', 'Home'),
      ('LinkedIn Profile', 'Optimize LinkedIn profile', 'Home'),
      ('Skill Assessment', 'Take skill assessment', 'Home'),
      ('Mentor Meeting', 'Meet with a mentor', 'Coffee Shop'),
      ('Conference Attend', 'Attend industry conference', 'Moscone Center'),
      ('Portfolio Update', 'Update your portfolio', 'Home'),
      ('Interview Practice', 'Practice interview skills', 'Home'),
      ('Certification', 'Earn a certification', 'Home'),
      
      -- Social Connections challenges
      ('Coffee Meetup', 'Meet a friend for coffee', 'Blue Bottle Coffee'),
      ('Dinner Party', 'Host a dinner party', 'Home'),
      ('Game Night', 'Organize game night', 'Home'),
      ('Volunteer Work', 'Volunteer in community', 'SF Food Bank'),
      ('Community Event', 'Attend community event', 'Castro District'),
      ('Birthday Party', 'Attend birthday celebration', 'Home'),
      ('Movie Night', 'Watch movie with friends', 'AMC Metreon'),
      ('Concert', 'Attend a concert', 'The Fillmore'),
      ('Sports Game', 'Watch sports with friends', 'Oracle Park'),
      
      -- Home & Garden challenges
      ('Garden Planting', 'Plant something in garden', 'Home'),
      ('Home Organization', 'Organize a room', 'Home'),
      ('Deep Cleaning', 'Deep clean the house', 'Home'),
      ('DIY Project', 'Complete a DIY project', 'Home'),
      ('Furniture Assembly', 'Assemble new furniture', 'Home'),
      ('Home Decor', 'Update home decor', 'Home'),
      ('Plant Care', 'Take care of houseplants', 'Home'),
      ('Garage Cleanup', 'Clean out garage', 'Home'),
      ('Kitchen Upgrade', 'Upgrade kitchen items', 'Home'),
      
      -- Cooking & Food challenges
      ('New Recipe', 'Try a new recipe', 'Home'),
      ('Baking', 'Bake something from scratch', 'Home'),
      ('Farmers Market', 'Visit farmers market', 'Ferry Building'),
      ('Cooking Class', 'Take a cooking class', 'Sur La Table'),
      ('Food Truck', 'Try a food truck', 'SOMA StrEat Food Park'),
      ('Wine Tasting', 'Wine tasting experience', 'Napa Valley'),
      ('Cheese Tasting', 'Try new cheeses', 'Cowgirl Creamery'),
      ('Coffee Roasting', 'Learn about coffee roasting', 'Blue Bottle Roastery'),
      ('Fermentation', 'Make fermented food', 'Home'),
      
      -- Outdoor Activities challenges
      ('Beach Volleyball', 'Play beach volleyball', 'Ocean Beach'),
      ('Kayaking', 'Go kayaking', 'Sausalito'),
      ('Surfing', 'Try surfing', 'Ocean Beach'),
      ('Hiking', 'Go for a hike', 'Mount Davidson'),
      ('Picnic', 'Have a picnic', 'Dolores Park'),
      ('Bike Tour', 'Take a bike tour', 'Golden Gate Park'),
      ('Sailing', 'Go sailing', 'Marina District'),
      ('Camping', 'Go camping', 'Point Reyes'),
      ('Stargazing', 'Go stargazing', 'Twin Peaks')
  ) AS challenge_data(title, description, location)
  ORDER BY ub.id, random()
  LIMIT 1350  -- 3 challenges per bucket
  RETURNING id, bucket_id, owner_id, title
)
-- Update bucket challenge counts and completion percentages for all newly created buckets
UPDATE buckets 
SET 
  challenge_count = (
    SELECT COUNT(*) 
    FROM items 
    WHERE items.bucket_id = buckets.id
  ),
  completion_percentage = 0.00
WHERE owner_id IN (SELECT id FROM generated_users);
