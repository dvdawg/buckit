import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

type Me = {
  id: string;
  handle: string | null;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
};

export function useMe() {
  const { user } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setMe(null); setLoading(false); return; }
    (async () => {
      // get users.id via RPC me_user_id(), then fetch row
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) { setMe(null); setLoading(false); return; }
      const { data, error } = await supabase.from('users').select('*').eq('id', uid).single();
      if (!error) setMe(data as Me);
      setLoading(false);
    })();
  }, [user]);

  return { me, loading };
}
