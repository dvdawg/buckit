import { Stack } from 'expo-router';
import { SessionProvider } from '@/hooks/useSession';
import { useSession } from '@/hooks/useSession';
import { View, Text } from 'react-native';

function AuthGate() {
  const { user, loading } = useSession();

  console.log('AuthGate - loading:', loading, 'user:', user);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    console.log('No user found, showing login screen');
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    );
  }

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
