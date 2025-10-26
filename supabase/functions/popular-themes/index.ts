import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ThemeAnalysis = {
  theme: string;
  icon: string;
  color: string;
  popularity_score: number;
  challenge_count: number;
  completion_rate: number;
  recent_activity: number;
};

export const handler = serve(async (req) => {
  try {
    console.log('Popular themes function called');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user ID from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log('User authenticated:', userId);

    // Define theme categories based on challenge data patterns
    const themeCategories = [
      { theme: 'Fitness & Health', icon: '💪', color: '#ef4444', keywords: ['fitness', 'gym', 'workout', 'yoga', 'running', 'swimming', 'cycling', 'dance', 'martial', 'health', 'wellness', 'meditation', 'doctor', 'dental', 'massage', 'spa'] },
      { theme: 'Learning & Growth', icon: '📚', color: '#8EC5FC', keywords: ['learn', 'course', 'language', 'workshop', 'podcast', 'documentary', 'ted', 'book', 'coding', 'skill', 'education', 'study'] },
      { theme: 'Creative Arts', icon: '🎨', color: '#ec4899', keywords: ['art', 'gallery', 'photography', 'writing', 'music', 'craft', 'painting', 'pottery', 'sewing', 'digital', 'creative', 'design'] },
      { theme: 'Adventure & Travel', icon: '🏔️', color: '#4ade80', keywords: ['adventure', 'travel', 'hike', 'museum', 'tour', 'beach', 'bridge', 'explore', 'outdoor', 'nature', 'park', 'trail'] },
      { theme: 'Food & Dining', icon: '🍽️', color: '#f59e0b', keywords: ['food', 'cook', 'recipe', 'baking', 'restaurant', 'market', 'tasting', 'wine', 'cheese', 'coffee', 'fermentation', 'dining'] },
      { theme: 'Social & Community', icon: '👥', color: '#8b5cf6', keywords: ['social', 'meetup', 'party', 'volunteer', 'community', 'event', 'concert', 'game', 'friends', 'networking', 'collaboration'] },
      { theme: 'Career & Professional', icon: '💼', color: '#10b981', keywords: ['career', 'work', 'resume', 'linkedin', 'skill', 'mentor', 'conference', 'portfolio', 'interview', 'certification', 'professional'] },
      { theme: 'Home & Lifestyle', icon: '🏠', color: '#6b7280', keywords: ['home', 'garden', 'organization', 'cleaning', 'diy', 'furniture', 'decor', 'plant', 'garage', 'kitchen', 'lifestyle'] }
    ];

    // Analyze user activity and popular themes
    const themeAnalysis: ThemeAnalysis[] = [];
    
    console.log(`Starting theme analysis for user: ${userId}`);

    for (const category of themeCategories) {
      // Get challenges that match this theme
      const keywordQuery = category.keywords.map(keyword => `title.ilike.%${keyword}%,description.ilike.%${keyword}%`).join(',');
      console.log(`Searching for theme ${category.theme} with keywords: ${category.keywords.slice(0, 3).join(', ')}...`);
      
      const { data: themeChallenges, error: challengesError } = await supabase
        .from('items')
        .select(`
          id,
          title,
          description,
          is_completed,
          satisfaction_rating,
          created_at,
          buckets!inner(title)
        `)
        .or(keywordQuery)
        .eq('visibility', 'public');

      if (challengesError) {
        console.error(`Error fetching challenges for ${category.theme}:`, challengesError);
        continue;
      }

      if (!themeChallenges || themeChallenges.length === 0) {
        console.log(`No challenges found for theme: ${category.theme}`);
        continue;
      }

      // Filter out challenges without buckets
      const validChallenges = themeChallenges.filter(c => c.buckets);
      if (validChallenges.length === 0) {
        console.log(`No valid challenges found for theme: ${category.theme}`);
        continue;
      }

      // Calculate popularity metrics
      const totalChallenges = validChallenges.length;
      const completedChallenges = validChallenges.filter(c => c.is_completed).length;
      const completionRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;
      
      console.log(`Completion rate for ${category.theme}: ${completedChallenges}/${totalChallenges} (${completionRate.toFixed(1)}%)`);

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentChallenges = validChallenges.filter(c => 
        new Date(c.created_at) >= thirtyDaysAgo
      ).length;
      
      console.log(`Recent challenges for ${category.theme}: ${recentChallenges} in last 30 days`);

      // Get user's interaction with this theme
      const { data: userInteractions } = await supabase
        .from('feed_events')
        .select('verb, created_at')
        .eq('actor_id', userId)
        .in('object_id', validChallenges.map(c => c.id))
        .gte('created_at', thirtyDaysAgo.toISOString());

      const userActivity = userInteractions?.length || 0;
      console.log(`User activity for ${category.theme}: ${userActivity} interactions`);

      // Calculate popularity score (weighted combination of metrics)
      const popularityScore = Math.min(100, 
        (completionRate * 0.4) + 
        (recentChallenges * 2) + 
        (userActivity * 5) +
        (totalChallenges * 0.1)
      );

      const themeData = {
        theme: category.theme,
        icon: category.icon,
        color: category.color,
        popularity_score: Math.round(popularityScore),
        challenge_count: totalChallenges,
        completion_rate: Math.round(completionRate),
        recent_activity: recentChallenges
      };
      
      console.log(`Theme ${category.theme}: ${totalChallenges} challenges, ${completionRate.toFixed(1)}% completion, score: ${Math.round(popularityScore)}`);
      
      themeAnalysis.push(themeData);
    }

    // Sort by popularity score
    themeAnalysis.sort((a, b) => b.popularity_score - a.popularity_score);

    // Return top themes (at least return some default themes if none found)
    const topThemes = themeAnalysis.length > 0 ? themeAnalysis.slice(0, 8) : [];
    
    console.log(`Found ${themeAnalysis.length} themes, returning top ${topThemes.length}`);

    // If no themes found, return some default themes
    if (topThemes.length === 0) {
      console.log('No themes found, returning default themes');
      const defaultThemes = [
        { theme: 'Fitness & Health', icon: '💪', color: '#ef4444', popularity_score: 50, challenge_count: 0, completion_rate: 0, recent_activity: 0 },
        { theme: 'Learning & Growth', icon: '📚', color: '#8EC5FC', popularity_score: 45, challenge_count: 0, completion_rate: 0, recent_activity: 0 },
        { theme: 'Creative Arts', icon: '🎨', color: '#ec4899', popularity_score: 40, challenge_count: 0, completion_rate: 0, recent_activity: 0 }
      ];
      
      return new Response(JSON.stringify({ 
        themes: defaultThemes,
        user_id: userId,
        generated_at: new Date().toISOString()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      themes: topThemes,
      user_id: userId,
      generated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in popular-themes function:", error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
