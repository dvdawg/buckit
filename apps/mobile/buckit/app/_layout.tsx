import { Stack } from 'expo-router';
import { SessionProvider } from '@/hooks/useSession';
import { useSession } from '@/hooks/useSession';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import LoginScreen from './login';

function AuthGate() {
  const { user, loading, isSessionValid, sessionError, hasRedirected, hasShownAlert, markRedirected, markAlertShown, isSigningOut } = useSession();
  const router = useRouter();

  console.log('AuthGate - loading:', loading, 'user:', user, 'isSessionValid:', isSessionValid, 'sessionError:', sessionError, 'hasRedirected:', hasRedirected, 'hasShownAlert:', hasShownAlert);

  useEffect(() => {
    if (!loading && !hasRedirected) {
      if (!isSessionValid && sessionError) {
        console.log('Invalid session detected:', sessionError);
        
        if (isSigningOut) {
          console.log('Sign out in progress, redirecting to login without error');
          markRedirected();
          router.replace('/login');
          return;
        }
        
        markRedirected();
        
        if (!hasShownAlert) {
          markAlertShown();
          Alert.alert(
            'Session Issue',
            `Your session is invalid: ${sessionError}. Please log in again.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Redirecting to login due to invalid session');
                  router.replace('/login');
                }
              }
            ]
          );
        } else {
          console.log('Redirecting to login due to invalid session (no alert)');
          router.replace('/login');
        }
        return;
      }

      if (user && isSessionValid) {
        console.log('Valid user found, showing main app');
        console.log('User details:', { id: user.id, email: user.email });
        markRedirected();
        router.replace('/(tabs)/profile');
      } else {
        console.log('No valid user found, starting splash sequence');
        console.log('User state:', { user: !!user, isSessionValid, sessionError });
        markRedirected();
        router.replace('/splash');
      }
    }
  }, [user, loading, isSessionValid, sessionError, hasRedirected, hasShownAlert]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  if (!isSessionValid && sessionError && !hasRedirected && !isSigningOut) {
    setTimeout(() => {
      if (!hasRedirected) {
        console.log('Auto-redirecting to login due to session error');
        router.replace('/login');
      }
    }, 2000);
    
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ color: '#8EC5FC', fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
          Session Issue
        </Text>
        <Text style={{ color: '#9BA1A6', textAlign: 'center', marginBottom: 20 }}>
          {sessionError}
        </Text>
        <Text style={{ color: '#4ade80', fontSize: 16 }}>
          Redirecting to login...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="buckets" />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="performance" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="definition" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="modals" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AuthGate />
    </SessionProvider>
  );
}
