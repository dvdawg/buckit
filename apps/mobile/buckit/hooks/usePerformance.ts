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
        
        // Get user ID
        const { data: uid, error: uidError } = await supabase.rpc('me_user_id');
        console.log('me_user_id result:', { uid, uidError });
        
        if (uidError) {
          console.error('Error getting user ID:', uidError);
          setPerformance(null);
          setLoading(false);
          return;
        }
        
        let finalUid = uid;
        
        if (!uid) { 
          console.log('No user ID found - checking if user exists in users table...');
          
          // Let's try to find the user directly
          const { data: authUser } = await supabase.auth.getUser();
          console.log('Auth user:', authUser);
          
          if (authUser?.user?.id) {
            // Check if user exists in users table
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

        // Fetch user data for basic stats
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('current_streak, total_completions')
          .eq('id', finalUid)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
        }

        console.log('User data:', userData);

        // Use real user data where available, dummy data otherwise
        setPerformance({
          overallProgress: 0.56, // 56% - using dummy data for now
          currentStreak: userData?.current_streak || 0,
          growthRate: 250, // Using dummy data
          totalCompletions: userData?.total_completions || 0,
          activeBuckets: 4, // Using dummy data
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
