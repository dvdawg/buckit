-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE NOT NULL,
    handle TEXT,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create buckets table
CREATE TABLE buckets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
    is_collaborative BOOLEAN DEFAULT FALSE,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create items table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_id UUID NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location_name TEXT,
    location_point GEOGRAPHY(POINT, 4326),
    deadline DATE,
    tags TEXT[],
    price_min INTEGER,
    price_max INTEGER,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tsv TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    ) STORED
);

-- Create bucket_collaborators table
CREATE TABLE bucket_collaborators (
    bucket_id UUID NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'collaborator',
    PRIMARY KEY (bucket_id, user_id)
);

-- Create completions table
CREATE TABLE completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT,
    caption TEXT,
    tagged_friend_ids UUID[],
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create friendships table
CREATE TABLE friendships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Create feed_events table
CREATE TABLE feed_events (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verb TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id UUID NOT NULL,
    audience TEXT NOT NULL DEFAULT 'friends',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_buckets_owner_id ON buckets(owner_id);
CREATE INDEX idx_buckets_visibility ON buckets(visibility);
CREATE INDEX idx_items_bucket_id ON items(bucket_id);
CREATE INDEX idx_items_owner_id ON items(owner_id);
CREATE INDEX idx_items_visibility ON items(visibility);
CREATE INDEX idx_items_created_at ON items(created_at);
CREATE INDEX idx_items_tsv ON items USING GIN(tsv);
CREATE INDEX idx_items_embedding ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_completions_item_id ON completions(item_id);
CREATE INDEX idx_completions_user_id ON completions(user_id);
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_feed_events_actor_id ON feed_events(actor_id);
CREATE INDEX idx_feed_events_created_at ON feed_events(created_at);
CREATE INDEX idx_feed_events_audience ON feed_events(audience);

-- Create spatial index for location_point
CREATE INDEX idx_items_location_point ON items USING GIST(location_point);
