import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Challenge {
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
}

export interface UseChallengesByThemeReturn {
  challenges: Challenge[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChallengesByTheme(theme: string, limit: number = 20): UseChallengesByThemeReturn {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = async () => {
    if (!theme) {
      setChallenges([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('challenges-by-theme', {
        body: { theme, limit }
      });

      if (fetchError) {
        throw fetchError;
      }

      if (data?.challenges) {
        setChallenges(data.challenges);
      } else {
        setChallenges([]);
      }
    } catch (err) {
      console.error('Error fetching challenges by theme:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch challenges');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [theme, limit]);

  return {
    challenges,
    loading,
    error,
    refetch: fetchChallenges,
  };
}
