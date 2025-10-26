import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type Challenge = {
  id: string;
  title: string;
  description: string;
  location_name: string;
  difficulty: number;
  price_min: number;
  price_max: number;
  is_completed: boolean;
  satisfaction_rating: number | null;
  created_at: string;
  bucket: {
    id: string;
    title: string;
    emoji: string;
    color: string;
  };
};

export const handler = serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { theme, limit = 20 } = await req.json();

    if (!theme) {
      return new Response(JSON.stringify({ error: 'Theme parameter is required' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const themeKeywords: Record<string, string[]> = {
      'Fitness & Health': ['fitness', 'gym', 'workout', 'yoga', 'running', 'swimming', 'cycling', 'dance', 'martial', 'health', 'wellness', 'meditation', 'doctor', 'dental', 'massage', 'spa'],
      'Learning & Growth': ['learn', 'course', 'language', 'workshop', 'podcast', 'documentary', 'ted', 'book', 'coding', 'skill', 'education', 'study'],
      'Creative Arts': ['art', 'gallery', 'photography', 'writing', 'music', 'craft', 'painting', 'pottery', 'sewing', 'digital', 'creative', 'design'],
      'Adventure & Travel': ['adventure', 'travel', 'hike', 'museum', 'tour', 'beach', 'bridge', 'explore', 'outdoor', 'nature', 'park', 'trail'],
      'Food & Dining': ['food', 'cook', 'recipe', 'baking', 'restaurant', 'market', 'tasting', 'wine', 'cheese', 'coffee', 'fermentation', 'dining'],
      'Social & Community': ['social', 'meetup', 'party', 'volunteer', 'community', 'event', 'concert', 'game', 'friends', 'networking', 'collaboration'],
      'Career & Professional': ['career', 'work', 'resume', 'linkedin', 'skill', 'mentor', 'conference', 'portfolio', 'interview', 'certification', 'professional'],
      'Home & Lifestyle': ['home', 'garden', 'organization', 'cleaning', 'diy', 'furniture', 'decor', 'plant', 'garage', 'kitchen', 'lifestyle']
    };

    const keywords = themeKeywords[theme];
    if (!keywords) {
      return new Response(JSON.stringify({ error: 'Invalid theme' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const searchConditions = keywords.flatMap(keyword => [
      `title.ilike.%${keyword}%`,
      `description.ilike.%${keyword}%`
    ]);

    const { data: challenges, error: challengesError } = await supabase
      .from('items')
      .select(`
        id,
        title,
        description,
        location_name,
        difficulty,
        price_min,
        price_max,
        is_completed,
        satisfaction_rating,
        created_at,
        bucket_id,
        buckets(
          id,
          title,
          emoji,
          color
        )
      `)
      .or(searchConditions.join(','))
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (challengesError) {
      console.error('Error fetching challenges by theme:', challengesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch challenges' }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const transformedChallenges: Challenge[] = (challenges || [])
      .filter(challenge => challenge.buckets)
      .map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description || '',
        location_name: challenge.location_name || '',
        difficulty: challenge.difficulty || 1,
        price_min: challenge.price_min || 0,
        price_max: challenge.price_max || 0,
        is_completed: challenge.is_completed || false,
        satisfaction_rating: challenge.satisfaction_rating,
        created_at: challenge.created_at,
        bucket: {
          id: challenge.buckets.id,
          title: challenge.buckets.title,
          emoji: challenge.buckets.emoji || '🪣',
          color: challenge.buckets.color || '#4ade80'
        }
      }));

    return new Response(JSON.stringify({ 
      challenges: transformedChallenges,
      theme,
      count: transformedChallenges.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in challenges-by-theme function:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
