import { Stack } from 'expo-router';
import { SessionProvider } from '@/hooks/useSession';
import { useSession } from '@/hooks/useSession';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import LoginScreen from './login';

function AuthGate() {
  const { user, loading } = useSession();
  const router = useRouter();

  console.log('AuthGate - loading:', loading, 'user:', user);

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('User found, showing main app');
        router.replace('/(tabs)/profile');
      } else {
        console.log('No user found, starting splash sequence');
        router.replace('/splash');
      }
    }
  }, [user, loading]);

  // Always show loading first to prevent main app from loading
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
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
