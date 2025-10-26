import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

type Me = {
  id: string;
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  location: string | null;
  phone_number: string | null;
  birthday: string | null;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_activity_date: string | null;
};

export function useMe() {
  const { user } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user) { 
      setMe(null); 
      setLoading(false); 
      return; 
    }
    
    try {
      const { data: uid } = await supabase.rpc('me_user_id');
      
      if (!uid) { 
        console.log('No user ID from me_user_id, checking auth user...');
        
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user?.id) {
          setMe(null);
          setLoading(false);
          return;
        }
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authUser.user.id)
          .single();
          
        if (existingUser) {
          setMe(existingUser as Me);
          setLoading(false);
          return;
        }
        
        console.log('User not found - needs to be created via migration');
        setMe(null);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
      if (!error) setMe(data as Me);
      setLoading(false);
    } catch (error) {
      console.error('Error in useMe:', error);
      setMe(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const refresh = () => {
    fetchUserData();
  };

  return { me, loading, refresh };
}
