import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface FriendsCompletion {
  completion_id: string;
  item_id: string;
  item_title: string;
  item_description: string | null;
  item_location_name: string | null;
  bucket_id: string;
  bucket_title: string;
  bucket_emoji: string;
  bucket_color: string;
  completed_by_user_id: string;
  completed_by_name: string;
  completed_by_handle: string;
  completed_by_avatar: string | null;
  completion_photo_url: string | null;
  completion_caption: string | null;
  satisfaction_rating: number | null;
  completed_at: string;
}

export function useFriendsFeed() {
  const [completions, setCompletions] = useState<FriendsCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCompletions = useCallback(async (offset: number = 0, limit: number = 20) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching friends completions with offset:', offset, 'limit:', limit);

      const { data, error: fetchError } = await supabase.rpc('get_friends_completed_challenges', {
        limit_rows: limit,
        offset_rows: offset
      });

      console.log('📊 Friends completions response:', { data, error: fetchError });

      if (fetchError) throw fetchError;

      if (offset === 0) {
        setCompletions(data || []);
        console.log('🔄 First load - set completions:', (data || []).length);
      } else {
        setCompletions(prev => {
          const existingIds = new Set(prev.map(c => c.completion_id));
          const newCompletions = (data || []).filter((c: FriendsCompletion) => !existingIds.has(c.completion_id));
          console.log(`📥 Load more - existing: ${prev.length}, new: ${(data || []).length}, filtered: ${newCompletions.length}`);
          return [...prev, ...newCompletions];
        });
      }

      setHasMore((data || []).length === limit);

      if (offset === 0) {
        const { data: countData, error: countError } = await supabase.rpc('get_friends_completed_challenges_count');
        console.log('📈 Friends completions count:', { countData, countError });
        if (!countError) {
          setTotalCount(countData || 0);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends completions');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchCompletions(completions.length, 20);
    }
  }, [loading, hasMore, completions.length, fetchCompletions]);

  const refresh = useCallback(() => {
    fetchCompletions(0, 20);
  }, [fetchCompletions]);

  useEffect(() => {
    const debugUserAndFriends = async () => {
      try {
        const { data: userData } = await supabase.rpc('me_user_id');
        console.log('👤 Current user ID:', userData);
        
        const { data: friendsData } = await supabase.rpc('get_friends');
        console.log('👥 User friends:', friendsData);
        
        const { data: completionsData } = await supabase.from('completions').select('*').limit(5);
        console.log('✅ Recent completions:', completionsData);
      } catch (err) {
        console.log('❌ Debug error:', err);
      }
    };
    
    debugUserAndFriends();
    fetchCompletions(0, 20);
  }, [fetchCompletions]);

  return {
    completions,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    fetchCompletions
  };
}
