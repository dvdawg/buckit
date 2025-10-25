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
      // Check if session is invalid
      if (!isSessionValid && sessionError) {
        console.log('Invalid session detected:', sessionError);
        
        // If we're signing out, just redirect to login without showing error
        if (isSigningOut) {
          console.log('Sign out in progress, redirecting to login without error');
          markRedirected();
          router.replace('/login');
          return;
        }
        
        markRedirected();
        
        // Only show alert if we haven't shown it yet
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
          // If we've already shown the alert, just redirect
          console.log('Redirecting to login due to invalid session (no alert)');
          router.replace('/login');
        }
        return;
      }

      if (user && isSessionValid) {
        console.log('Valid user found, showing main app');
        markRedirected();
        router.replace('/(tabs)/profile');
      } else if (!user) {
        console.log('No valid user found, starting splash sequence');
        markRedirected();
        router.replace('/splash');
      }
    }
  }, [user, loading, isSessionValid, sessionError, hasRedirected, hasShownAlert]);

  // Show loading while session is being validated
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  // If we have a session error and haven't redirected yet, automatically redirect after a short delay
  // Skip error page if we're signing out
  if (!isSessionValid && sessionError && !hasRedirected && !isSigningOut) {
    // Auto-redirect after 2 seconds if alert doesn't work
    setTimeout(() => {
      if (!hasRedirected) {
        console.log('Auto-redirecting to login due to session error');
        router.replace('/login');
      }
    }, 2000);
    
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 20 }}>
        <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '600', marginBottom: 10 }}>
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

  // Show splash screen initially
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="buckets" />
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
