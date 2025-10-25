# Supabase Database Schema

This directory contains the database schema and migrations for the Buckit application.

## Structure

- `migrations/` - Database migration files
- `types/` - TypeScript type definitions
- `seed.sql` - Sample data for development
- `README.md` - This file

## Migration Files

1. **20241201000001_initial_schema.sql** - Creates all tables and indexes
2. **20241201000002_rls_policies.sql** - Sets up Row Level Security policies
3. **20241201000003_rpc_functions.sql** - Creates RPC functions for the mobile app

## Key Features

### Tables
- **users** - User profiles linked to Supabase Auth
- **buckets** - Collections of items with visibility settings
- **items** - Individual goals/items within buckets
- **bucket_collaborators** - Multi-user collaboration on buckets
- **completions** - Records when items are completed
- **friendships** - Social connections between users
- **feed_events** - Activity feed for social features

### RPC Functions
- `me_user_id()` - Get current user's database ID
- `home_feed(limit_rows, offset_rows)` - Get personalized activity feed
- `create_bucket(title, description, visibility)` - Create new bucket
- `create_item(bucket_id, title, description, url)` - Add item to bucket
- `complete_item(item_id, photo_url, caption, tagged_friends)` - Mark item complete
- `send_friend_request(friend_id)` - Send friend request
- `accept_friend_request(user_id)` - Accept friend request

### Security
- Row Level Security (RLS) enabled on all tables
- Policies ensure users can only access their own data and public/friend data
- RPC functions use `SECURITY DEFINER` for controlled access

## Usage

### Local Development
```bash
# Start local Supabase (requires Docker)
npx supabase start

# Apply migrations
npx supabase db reset

# Generate types
npx supabase gen types typescript --local > types/database.ts
```

### Production
```bash
# Link to remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

## Environment Variables

The mobile app expects these environment variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

## Next Steps

1. Set up your Supabase project
2. Run the migrations
3. Configure authentication providers
4. Update your mobile app's environment variables
5. Test the RPC functions
