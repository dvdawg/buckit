import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

type Item = {
  id: string;
  bucket_id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  deadline: string | null;
  tags: string[] | null;
  price_min: number | null;
  price_max: number | null;
  difficulty: number | null;
  visibility: 'private' | 'friends' | 'public';
  satisfaction_rating: number | null;
  urgency_level: 'overdue' | 'due_soon' | 'no_rush';
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  bucket?: {
    id: string;
    title: string;
    emoji: string;
    color: string;
  };
};

export function useItems() {
  const { user } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
      setItems([]); 
      setLoading(false); 
      return; 
    }
    
    (async () => {
      try {
        // Get user ID
        const { data: uid } = await supabase.rpc('me_user_id');
        if (!uid) { 
          setItems([]); 
          setLoading(false); 
          return; 
        }

        // Use ultimate secure RPC function that handles authentication internally
        const { data, error } = await supabase
          .rpc('get_user_items_secure');

        if (!error && data) {
          // Transform the data to include bucket information
          const transformedItems = data.map((item: any) => ({
            ...item,
            bucket: item.bucket_id ? {
              id: item.bucket_id,
              title: item.bucket_title,
              emoji: item.bucket_emoji,
              color: item.bucket_color
            } : null
          }));
          setItems(transformedItems as Item[]);
        } else if (error) {
          console.error('Ultimate secure RPC failed for items:', error);
          // No fallback - security is paramount
          setItems([]);
        }
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { items, loading };
}
