import { Stack } from 'expo-router';
import { SessionProvider } from '@/hooks/useSession';
import { useSession } from '@/hooks/useSession';
import { View, Text } from 'react-native';
import LoginScreen from './login';

function AuthGate() {
  const { user, loading } = useSession();

  console.log('AuthGate - loading:', loading, 'user:', user);

  // Always show loading first to prevent main app from loading
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If no user, show login screen directly (not through routing)
  if (!user) {
    console.log('No user found, showing login screen');
    return <LoginScreen />;
  }

  // Only show main app when user is authenticated
  console.log('User found, showing main app');
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="buckets" />
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
