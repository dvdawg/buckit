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
      // Test basic Supabase connection first
      console.log('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      console.log('Connection test result:', { testData, testError });
      
      if (testError) {
        console.error('Supabase connection failed:', testError);
        setBuckets([]);
        return;
      }
      
      // First, try the secure RPC function
      console.log('Using secure RPC function to fetch user buckets...');
      
      const { data, error } = await supabase
        .rpc('get_user_buckets_secure');

      console.log('Secure RPC result:', { data, error });
      
      if (!error && data) {
        console.log('Setting buckets from secure RPC:', data);
        setBuckets(data as Bucket[]);
        return;
      } 
      
      // If RPC fails, try fallback method with direct table access
      console.log('RPC failed, trying fallback method...');
      
      // Get user's database ID first
      const { data: uid } = await supabase.rpc('me_user_id');
      console.log('User ID from me_user_id:', uid);
      
      if (!uid) {
        console.log('No user ID found, showing empty list');
        setBuckets([]);
        return;
      }
      
      // Try direct table access with RLS
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('buckets')
        .select('*')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });
        
      console.log('Fallback query result:', { data: fallbackData, error: fallbackError });
      
      if (!fallbackError && fallbackData) {
        console.log('Setting buckets from fallback query:', fallbackData);
        setBuckets(fallbackData as Bucket[]);
      } else {
        console.error('Both RPC and fallback failed:', { rpcError: error, fallbackError });
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

  const recalculateCounts = async () => {
    if (!user) return;
    
    try {
      console.log('Recalculating bucket challenge counts...');
      const { error } = await supabase.rpc('recalculate_user_bucket_counts');
      
      if (error) {
        console.error('Error recalculating counts:', error);
      } else {
        console.log('Successfully recalculated bucket counts');
        // Refresh the buckets to get updated counts
        refresh();
      }
    } catch (error) {
      console.error('Error in recalculateCounts:', error);
    }
  };

  return { buckets, loading, refresh, recalculateCounts };
}
