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

type BucketItem = {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  deadline: string | null;
  tags: string[] | null;
  price_min: number | null;
  price_max: number | null;
  difficulty: number | null;
  visibility: string;
  satisfaction_rating: number | null;
  urgency_level: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  bucket_emoji: string;
  bucket_title: string;
  bucket_color: string;
};

export function useBucket(bucketId: string) {
  const { user } = useSession();
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [items, setItems] = useState<BucketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBucket = async () => {
    if (!user || !bucketId) { 
      setBucket(null); 
      setItems([]);
      setLoading(false); 
      return; 
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First, try to get the bucket using the secure RPC function
      console.log('Fetching bucket with ID:', bucketId);
      
      const { data: buckets, error: bucketError } = await supabase
        .rpc('get_user_buckets_secure');

      if (bucketError) {
        console.error('Error fetching buckets:', bucketError);
        // Try fallback method
        const { data: uid } = await supabase.rpc('me_user_id');
        if (uid) {
          const { data: fallbackBuckets, error: fallbackError } = await supabase
            .from('buckets')
            .select('*')
            .eq('owner_id', uid)
            .eq('id', bucketId)
            .single();
            
          if (!fallbackError && fallbackBuckets) {
            setBucket(fallbackBuckets as Bucket);
          } else {
            setError('Bucket not found');
            return;
          }
        } else {
          setError('User not authenticated');
          return;
        }
      } else if (buckets) {
        // Find the specific bucket
        const foundBucket = buckets.find((b: Bucket) => b.id === bucketId);
        if (foundBucket) {
          setBucket(foundBucket);
        } else {
          setError('Bucket not found');
          return;
        }
      }

      // Now fetch the items for this bucket
      console.log('Fetching items for bucket:', bucketId);
      
      const { data: itemsData, error: itemsError } = await supabase
        .rpc('get_user_items_secure');

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        // Try fallback method for items
        const { data: uid } = await supabase.rpc('me_user_id');
        if (uid) {
          const { data: fallbackItems, error: fallbackItemsError } = await supabase
            .from('items')
            .select(`
              *,
              bucket: buckets!items_bucket_id_fkey (
                emoji,
                title,
                color
              )
            `)
            .eq('owner_id', uid)
            .eq('bucket_id', bucketId)
            .order('created_at', { ascending: false });
            
          if (!fallbackItemsError && fallbackItems) {
            // Transform the data to match our expected structure
            const transformedItems = fallbackItems.map((item: any) => ({
              ...item,
              bucket_emoji: item.bucket?.emoji || '📝',
              bucket_title: item.bucket?.title || 'Unknown',
              bucket_color: item.bucket?.color || '#8EC5FC'
            }));
            setItems(transformedItems);
          }
        }
      } else if (itemsData) {
        // Filter items for this specific bucket
        const bucketItems = itemsData.filter((item: BucketItem) => item.bucket_id === bucketId);
        setItems(bucketItems);
      }
      
    } catch (error) {
      console.error('Error fetching bucket:', error);
      setError('Failed to load bucket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBucket();
  }, [user, bucketId]);

  const refresh = () => {
    setLoading(true);
    fetchBucket();
  };

  const recalculateCount = async () => {
    if (!user || !bucketId) return;
    
    try {
      console.log('Recalculating challenge count for bucket:', bucketId);
      const { error } = await supabase.rpc('update_bucket_challenge_count_secure', {
        p_bucket_id: bucketId
      });
      
      if (error) {
        console.error('Error recalculating count:', error);
      } else {
        console.log('Successfully recalculated bucket count');
        // Refresh the bucket to get updated count
        refresh();
      }
    } catch (error) {
      console.error('Error in recalculateCount:', error);
    }
  };

  return { bucket, items, loading, error, refresh, recalculateCount };
}
