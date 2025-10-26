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
  visibility: 'private' | 'public';
  is_collaborative: boolean;
  created_at: string;
  is_collaborator?: boolean;
  can_edit?: boolean;
};

export function useBuckets() {
  const { user } = useSession();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch buckets for a specific user
  const fetchUserBuckets = async (userId: string): Promise<Bucket[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_buckets_by_id', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Error fetching user buckets:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Error in fetchUserBuckets:', err);
      return [];
    }
  };

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
      
      // First, try the secure RPC function that includes collaborator buckets
      console.log('Using secure RPC function to fetch user buckets...');
      
      // Get user's database ID first
      let uid = null;
      
      // Try me_user_id first
      const { data: meUserId } = await supabase.rpc('me_user_id');
      console.log('User ID from me_user_id:', meUserId);
      
      if (meUserId) {
        uid = meUserId;
      } else {
        console.log('me_user_id failed, trying auth user...');
        
        // Get authenticated user
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user?.id) {
          // Check if user exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.user.id)
            .single();
            
          if (existingUser) {
            uid = existingUser.id;
            console.log('User ID from auth fallback:', uid);
          }
        }
      }
      
      if (!uid) {
        console.log('No user ID found, showing empty list');
        setBuckets([]);
        return;
      }
      
      const { data, error } = await supabase.rpc('get_user_buckets_by_id', {
        p_user_id: uid
      });

      console.log('=== BUCKET FETCHING DEBUG ===');
      console.log('User ID being used:', uid);
      console.log('RPC function called: get_user_buckets_by_id');
      console.log('RPC result data:', data);
      console.log('RPC result error:', error);
      console.log('Number of buckets returned:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('Bucket details:');
        data.forEach((bucket: any, index: number) => {
          console.log(`Bucket ${index + 1}:`, {
            id: bucket.id,
            title: bucket.title,
            is_collaborator: bucket.is_collaborator,
            can_edit: bucket.can_edit,
            owner_id: bucket.owner_id,
            visibility: bucket.visibility
          });
        });
      }
      console.log('=== END BUCKET FETCHING DEBUG ===');
      
      if (!error && data) {
        console.log('Setting buckets from secure RPC:', data);
        setBuckets(data as Bucket[]);
        return;
      } 
      
      // If RPC fails, try fallback method with direct table access
      console.log('RPC failed, trying fallback method...');
      
      // Try direct table access with RLS (only owned buckets as fallback)
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

  return { buckets, loading, refresh, recalculateCounts, fetchUserBuckets };
}
