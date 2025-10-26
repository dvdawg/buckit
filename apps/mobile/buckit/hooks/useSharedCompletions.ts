import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface SharedCompletion {
  id: string;
  item_id: string;
  completed_by_user_id: string;
  completed_by_name: string;
  completed_by_avatar: string;
  photo_url: string;
  caption: string;
  tagged_friend_ids: string[];
  is_shared: boolean;
  shared_with_user_ids: string[];
  created_at: string;
  user_rating?: number;
  user_review?: string;
}

export interface CompletionStats {
  total_completions: number;
  unique_items_completed: number;
  total_items: number;
  completion_percentage: number;
  average_rating: number;
  user_ratings_count: number;
}

export function useSharedCompletions(bucketId: string) {
  const [completions, setCompletions] = useState<SharedCompletion[]>([]);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletions = async () => {
    if (!bucketId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_shared_completions', {
        p_bucket_id: bucketId
      });
      if (error) throw error;
      setCompletions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch completions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!bucketId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_bucket_completion_stats', {
        p_bucket_id: bucketId
      });
      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  };

  const completeItem = async (
    itemId: string,
    photoUrl?: string,
    caption?: string,
    taggedFriendIds?: string[]
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('complete_item_shared', {
        p_item_id: itemId,
        p_photo_url: photoUrl,
        p_caption: caption,
        p_tagged_friend_ids: taggedFriendIds
      });
      if (error) throw error;
      
      await Promise.all([fetchCompletions(), fetchStats()]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rateCompletion = async (
    completionId: string,
    rating: number,
    reviewText?: string
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('rate_completion', {
        p_completion_id: completionId,
        p_rating: rating,
        p_review_text: reviewText
      });
      if (error) throw error;
      
      await fetchCompletions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rate completion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCompletionsByItem = (itemId: string) => {
    return completions.filter(completion => completion.item_id === itemId);
  };

  const getPhotosForItem = (itemId: string) => {
    return completions
      .filter(completion => completion.item_id === itemId && completion.photo_url)
      .map(completion => ({
        id: completion.id,
        url: completion.photo_url,
        caption: completion.caption,
        completed_by: completion.completed_by_name,
        completed_by_avatar: completion.completed_by_avatar,
        created_at: completion.created_at,
        user_rating: completion.user_rating,
        user_review: completion.user_review
      }));
  };

  const getAverageRatingForItem = (itemId: string) => {
    const itemCompletions = getCompletionsByItem(itemId);
    const ratings = itemCompletions
      .map(c => c.user_rating)
      .filter(rating => rating !== undefined && rating !== null) as number[];
    
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  };

  useEffect(() => {
    if (bucketId) {
      fetchCompletions();
      fetchStats();
    }
  }, [bucketId]);

  return {
    completions,
    stats,
    loading,
    error,
    fetchCompletions,
    fetchStats,
    completeItem,
    rateCompletion,
    getCompletionsByItem,
    getPhotosForItem,
    getAverageRatingForItem,
  };
}
