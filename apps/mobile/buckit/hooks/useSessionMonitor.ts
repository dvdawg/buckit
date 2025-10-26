import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from './useSession';
import { Alert } from 'react-native';

/**
 * Hook to monitor session validity and handle invalid sessions
 * Should be used in main app screens to detect session issues
 */
export function useSessionMonitor() {
  const { isSessionValid, sessionError, loading } = useSession();
  const router = useRouter();
  const [hasShownAlert, setHasShownAlert] = useState(false);

  useEffect(() => {
    if (!loading && !isSessionValid && sessionError && !hasShownAlert) {
      console.log('SessionMonitor: Invalid session detected:', sessionError);
      setHasShownAlert(true);
      
      Alert.alert(
        'Session Expired',
        'Your session is no longer valid. Please log in again.',
        [
          {
            text: 'Log In',
            onPress: () => {
              console.log('SessionMonitor: Redirecting to login');
              router.replace('/login');
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [isSessionValid, sessionError, loading, router, hasShownAlert]);

  return {
    isSessionValid,
    sessionError,
    loading
  };
}
