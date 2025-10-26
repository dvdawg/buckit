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
      
      // Get the bucket using the secure RPC function that respects visibility
      console.log('Fetching bucket with ID:', bucketId);
      
      const { data: bucketData, error: bucketError } = await supabase
        .rpc('get_bucket_by_id', {
          p_bucket_id: bucketId
        });

      if (bucketError) {
        console.error('Error fetching bucket:', bucketError);
        setError('Failed to load bucket');
        return;
      }

      if (bucketData && bucketData.length > 0) {
        setBucket(bucketData[0] as Bucket);
      } else {
        setError('Bucket not found or you do not have permission to view it');
        return;
      }

      // Now fetch the items for this bucket
      console.log('Fetching items for bucket:', bucketId);
      
      const { data: itemsData, error: itemsError } = await supabase
        .rpc('get_bucket_items', {
          p_bucket_id: bucketId
        });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        setItems([]);
      } else if (itemsData) {
        setItems(itemsData as BucketItem[]);
      } else {
        setItems([]);
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
    
    // Only allow recalculating count if user can edit the bucket
    if (!bucket?.can_edit) {
      console.log('User cannot edit bucket, skipping count recalculation');
      return;
    }
    
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
