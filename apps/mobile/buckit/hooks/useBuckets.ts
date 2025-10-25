import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

type Bucket = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  emoji: string;
  color: string;
  challenge_count: number;
  completion_percentage: number;
  visibility: 'private' | 'friends' | 'public';
  is_collaborative: boolean;
  created_at: string;
};

export function useBuckets() {
  const { user } = useSession();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
      setBuckets([]); 
      setLoading(false); 
      return; 
    }
    
    (async () => {
      try {
        // Get user ID
        const { data: uid } = await supabase.rpc('me_user_id');
        if (!uid) { 
          setBuckets([]); 
          setLoading(false); 
          return; 
        }

        // Fetch buckets with new fields
        const { data, error } = await supabase
          .from('buckets')
          .select('*')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setBuckets(data as Bucket[]);
        }
      } catch (error) {
        console.error('Error fetching buckets:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { buckets, loading };
}
