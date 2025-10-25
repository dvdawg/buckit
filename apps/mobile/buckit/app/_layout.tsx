import { Stack } from 'expo-router';
import { SessionProvider } from '@/hooks/useSession';

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="modals" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
