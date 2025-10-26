import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

type PerformanceData = {
  overallProgress: number;
  currentStreak: number;
  growthRate: number;
  totalCompletions: number;
  activeBuckets: number;
  weeklyProgress: Array<{
    week: string;
    completed: number;
  }>;
  bucketProgress: Array<{
    bucket: string;
    completion: number;
  }>;
};

export function usePerformance() {
  const { user } = useSession();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
      setPerformance(null); 
      setLoading(false); 
      return; 
    }
    
    (async () => {
      try {
        console.log('Fetching performance data...');
        console.log('Current user from session:', user);
        
        let finalUid = null;
        
        try {
          const { data: uid, error: uidError } = await supabase.rpc('me_user_id');
          console.log('me_user_id result:', { uid, uidError });
          
          if (!uidError && uid) {
            finalUid = uid;
          } else {
            console.log('me_user_id failed, trying direct user lookup...');
          }
        } catch (rpcError) {
          console.log('RPC call failed, trying direct user lookup...', rpcError);
        }
        
        if (!finalUid) { 
          console.log('No user ID from RPC - checking if user exists in users table...');
          
          const { data: authUser } = await supabase.auth.getUser();
          console.log('Auth user:', authUser);
          
          if (authUser?.user?.id) {
            const { data: existingUser, error: userCheckError } = await supabase
              .from('users')
              .select('id, auth_id')
              .eq('auth_id', authUser.user.id)
              .single();
              
            console.log('User check result:', { existingUser, userCheckError });
            
            if (existingUser) {
              console.log('User found in database, using their ID:', existingUser.id);
              finalUid = existingUser.id;
            } else {
              console.log('User not found in users table - they need to be created via migration');
              setPerformance(null);
              setLoading(false);
              return;
            }
          } else {
            console.log('No authenticated user found');
            setPerformance(null);
            setLoading(false);
            return;
          }
        }

        console.log('Using user ID:', finalUid);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('current_streak, total_completions')
          .eq('id', finalUid)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
        }

        console.log('User data:', userData);

        setPerformance({
          overallProgress: 0.56,
          currentStreak: userData?.current_streak || 0,
          growthRate: 250,
          totalCompletions: userData?.total_completions || 0,
          activeBuckets: 4,
          weeklyProgress: [
            { week: "Week 1", completed: 4 },
            { week: "Week 2", completed: 7 },
            { week: "Week 3", completed: 10 },
            { week: "Week 4", completed: 14 },
          ],
          bucketProgress: [
            { bucket: "Outdoors", completion: 0.8 },
            { bucket: "Family", completion: 0.65 },
            { bucket: "Food", completion: 0.5 },
            { bucket: "Travel", completion: 0.3 },
          ]
        });

        console.log('Performance data set successfully');

      } catch (error) {
        console.error('Error fetching performance data:', error);
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return { performance, loading };
}
