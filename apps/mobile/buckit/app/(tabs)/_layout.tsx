import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import FloatingAddButton from '@/components/FloatingAddButton';

export default function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs 
        screenOptions={{ 
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: '#333',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#9BA1A6',
        }}
      >
        <Tabs.Screen 
          name="home" 
          options={{ 
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="buckets" 
          options={{ 
            title: 'Buckets',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder" size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="explore" 
          options={{ 
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass" size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="add" 
          options={{ 
            title: '',
            tabBarButton: () => <FloatingAddButton />,
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }} 
        />
      </Tabs>
    </View>
  );
}