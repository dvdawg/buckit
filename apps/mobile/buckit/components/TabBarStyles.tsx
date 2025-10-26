import React from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

// Glass morphism options for the tab bar
export const TabBarStyles = {
  // Option 1: Light Glass (current implementation)
  lightGlass: {
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 20,
      marginBottom: 20,
      position: 'absolute' as const,
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
    tabBarBackground: () => (
      <BlurView
        intensity={80}
        tint="light"
        style={{
          flex: 1,
          borderRadius: 25,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }}
      />
    ),
    tabBarActiveTintColor: '#000000',
    tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.6)',
  },

  // Option 2: Dark Glass (current active)
  darkGlass: {
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 20,
      marginBottom: 20,
      position: 'absolute' as const,
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
    tabBarBackground: () => (
      <View style={{ flex: 1, borderRadius: 25, overflow: 'hidden' }}>
        <BlurView
          intensity={80}
          tint="dark"
          style={{
            flex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />
      </View>
    ),
    tabBarActiveTintColor: '#FFFFFF',
    tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Option 3: Gradient Glass
  gradientGlass: {
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 20,
      marginBottom: 20,
      position: 'absolute' as const,
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
    tabBarBackground: () => (
      <View style={{ flex: 1, borderRadius: 25, overflow: 'hidden' }}>
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />
        <LinearGradient
          colors={['rgba(142, 197, 252, 0.1)', 'rgba(224, 195, 252, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 25,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />
      </View>
    ),
    tabBarActiveTintColor: '#FFFFFF',
    tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Option 4: Subtle Dark Glass
  subtleDarkGlass: {
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 20,
      marginBottom: 20,
      position: 'absolute' as const,
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
    tabBarBackground: () => (
      <View style={{ flex: 1, borderRadius: 25, overflow: 'hidden' }}>
        <BlurView
          intensity={40}
          tint="dark"
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </View>
    ),
    tabBarActiveTintColor: '#FFFFFF',
    tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
  },

  // Option 5: Ultra Light Glass
  ultraLightGlass: {
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 20,
      borderRadius: 25,
      marginHorizontal: 20,
      marginBottom: 20,
      position: 'absolute' as const,
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
    tabBarBackground: () => (
      <BlurView
        intensity={100}
        tint="light"
        style={{
          flex: 1,
          borderRadius: 25,
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.4)',
        }}
      />
    ),
    tabBarActiveTintColor: '#000000',
    tabBarInactiveTintColor: 'rgba(0, 0, 0, 0.7)',
  },

  // Option 6: Original White (for comparison)
  originalWhite: {
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
      position: 'absolute' as const,
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
    tabBarBackground: undefined,
    tabBarActiveTintColor: '#000',
    tabBarInactiveTintColor: '#9BA1A6',
  },
};

// Helper function to get the current style
export const getCurrentTabBarStyle = (styleName: keyof typeof TabBarStyles = 'darkGlass') => {
  return TabBarStyles[styleName];
};
