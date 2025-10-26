import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import FloatingAddButton from '@/components/FloatingAddButton';
import Svg, { Path } from 'react-native-svg';

// Custom Bucket Icon Component
const BucketIcon = ({ size = 24, color = '#9BA1A6' }) => (
  <Svg width={size} height={size} viewBox="0 0 159 171" fill="none">
    <Path 
      d="M20.0024 5H138.036C147.013 5.00009 153.979 12.8323 152.933 21.748L137.565 152.748C136.678 160.304 130.275 166 122.667 166H35.3716C27.7635 166 21.3597 160.304 20.4731 152.748L5.10498 21.748C4.05899 12.8323 11.0256 5.00009 20.0024 5Z" 
      stroke={color} 
      strokeWidth="10"
    />
  </Svg>
);

export default function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs 
        screenOptions={{ 
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 0,
            height: 60,
            paddingTop: 8,
            paddingBottom: 8,
            paddingHorizontal: 20,
            borderRadius: 25,
            marginHorizontal: 20,
            marginBottom: 20,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: '#9BA1A6',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen 
          name="home" 
          options={{ 
            title: '',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="explore" 
          options={{ 
            title: '',
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
          name="my-buckets" 
          options={{ 
            title: '',
            tabBarIcon: ({ color, size }) => (
              <BucketIcon size={size} color={color} />
            ),
          }} 
        />
        <Tabs.Screen 
          name="profile" 
          options={{ 
            title: '',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }} 
        />
      </Tabs>
    </View>
  );
}