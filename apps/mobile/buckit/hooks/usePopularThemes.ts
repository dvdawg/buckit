import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ThemeData {
  theme: string;
  icon: string;
  color: string;
  popularity_score: number;
  challenge_count: number;
  completion_rate: number;
  recent_activity: number;
}

export interface UsePopularThemesReturn {
  themes: ThemeData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePopularThemes(): UsePopularThemesReturn {
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('popular-themes');

      if (fetchError) {
        throw fetchError;
      }

      if (data?.themes) {
        setThemes(data.themes);
      } else {
        setThemes([]);
      }
    } catch (err) {
      console.error('Error fetching popular themes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch themes');
      setThemes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  return {
    themes,
    loading,
    error,
    refetch: fetchThemes,
  };
}
