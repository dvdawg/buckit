import { Tabs } from 'expo-router';
import { useSession } from '@/hooks/useSession';
import { View, Text, Button } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function Gate({ children }: { children: React.ReactNode }) {
  // For development, bypass authentication entirely
  const isDevelopment = true; // Set to false when ready for production
  
  if (isDevelopment) {
    return <>{children}</>;
  }

  // Production authentication logic would go here
  const { user, loading } = useSession();
  
  if (loading) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Loading…</Text></View>;
  if (!user) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Please sign in</Text></View>;
  
  return <>{children}</>;
}

export default function Layout() {
  return (
    <Gate>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="buckets" options={{ title: 'Buckets' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </Gate>
  );
}
