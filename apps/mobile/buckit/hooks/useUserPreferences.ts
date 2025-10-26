import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from './useSession';

export function useUserPreferences() {
  const { user } = useSession();
  const [preferencesCompleted, setPreferencesCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPreferencesCompleted(null);
      setLoading(false);
      return;
    }

    const checkPreferencesStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('preferences_completed')
          .eq('auth_id', user.id)
          .single();

        if (error) {
          console.error('Error checking preferences status:', error);
          setPreferencesCompleted(false);
        } else {
          console.log('User preferences status:', data?.preferences_completed);
          setPreferencesCompleted(data?.preferences_completed || false);
        }
      } catch (error) {
        console.error('Error checking preferences status:', error);
        setPreferencesCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    checkPreferencesStatus();
  }, [user]);

  return {
    preferencesCompleted,
    loading,
    needsPreferences: preferencesCompleted === false
  };
}
