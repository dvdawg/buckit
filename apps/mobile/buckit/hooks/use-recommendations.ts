import { useState, useEffect, useCallback } from 'react';
import { fetchRecommendations, logEvent, logViewDebounced, logCompletion, RecommendationParams, RecommendationItem, EventLogParams } from '../lib/recommendations';

export interface UseRecommendationsOptions extends RecommendationParams {
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseRecommendationsReturn {
  items: RecommendationItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logEvent: (params: Omit<EventLogParams, 'itemId'> & { itemId: string }) => Promise<void>;
  logView: (itemId: string) => void;
  logCompletion: (itemId: string, photoUrl?: string, caption?: string, taggedFriendIds?: string[]) => Promise<void>;
}

export function useRecommendations(options: UseRecommendationsOptions): UseRecommendationsReturn {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!options.enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchRecommendations({
        lat: options.lat,
        lon: options.lon,
        radiusKm: options.radiusKm,
        k: options.k,
      });
      
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      console.error('Recommendation fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [options.lat, options.lon, options.radiusKm, options.k, options.enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!options.refetchInterval || !options.enabled) return;
    
    const interval = setInterval(fetchData, options.refetchInterval);
    return () => clearInterval(interval);
  }, [fetchData, options.refetchInterval, options.enabled]);

  const handleLogEvent = useCallback(async (params: Omit<EventLogParams, 'itemId'> & { itemId: string }) => {
    try {
      await logEvent(params);
    } catch (err) {
      console.error('Error logging event:', err);
    }
  }, []);

  const handleLogView = useCallback((itemId: string) => {
    logViewDebounced(itemId);
  }, []);

  const handleLogCompletion = useCallback(async (
    itemId: string, 
    photoUrl?: string, 
    caption?: string, 
    taggedFriendIds?: string[]
  ) => {
    try {
      await logCompletion(itemId, photoUrl, caption, taggedFriendIds);
    } catch (err) {
      console.error('Error logging completion:', err);
      throw err;
    }
  }, []);

  return {
    items,
    loading,
    error,
    refetch: fetchData,
    logEvent: handleLogEvent,
    logView: handleLogView,
    logCompletion: handleLogCompletion,
  };
}
