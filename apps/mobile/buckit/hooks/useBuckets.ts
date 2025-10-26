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

  const fetchBuckets = async () => {
    if (!user) { 
      setBuckets([]); 
      setLoading(false); 
      return; 
    }
    
    try {
      // Use the secure RPC function that handles all authentication and filtering
      // This function completely bypasses RLS and ensures only user's own data is returned
      console.log('Using secure RPC function to fetch user buckets...');
      
      const { data, error } = await supabase
        .rpc('get_user_buckets_secure');

      console.log('Secure RPC result:', { data, error });
      
      if (!error && data) {
        console.log('Setting buckets from secure RPC:', data);
        setBuckets(data as Bucket[]);
      } else if (error) {
        console.error('Secure RPC failed:', error);
        // No fallback - security is paramount
        console.log('RPC function failed, showing empty list to maintain security');
        setBuckets([]);
      }
    } catch (error) {
      console.error('Error fetching buckets:', error);
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuckets();
  }, [user]);

  const refresh = () => {
    setLoading(true);
    fetchBuckets();
  };

  return { buckets, loading, refresh };
}
