import { Tabs } from 'expo-router';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { View, Text, Button } from 'react-native';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();

  useEffect(() => {
    // auto sign-in flow can be added here (magic link deep link handling)
  }, []);

  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Loading…</Text></View>;

  if (!user) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', gap:12 }}>
        <Text style={{ fontSize:18, fontWeight:'600' }}>Welcome to Buckit</Text>
        <Button title="Sign in with Magic Link (dev)" onPress={async () => {
          // dev helper: hardcode your own email for now
          await supabase.auth.signInWithOtp({ email: 'you@example.com', options: { emailRedirectTo: 'buckit://auth' } });
          alert('Magic link sent to you@example.com');
        }} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function Layout() {
  return (
    <SessionProvider>
      <Gate>
        <Tabs screenOptions={{ headerShown: false }}>
          <Tabs.Screen name="home" options={{ title: 'Home' }} />
          <Tabs.Screen name="buckets" options={{ title: 'Buckets' }} />
          <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        </Tabs>
      </Gate>
    </SessionProvider>
  );
}
