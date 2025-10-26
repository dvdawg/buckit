import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'light' | 'medium' | 'dark';
  borderRadius?: number;
  padding?: number;
}

export default function GlassCard({ 
  children, 
  style, 
  variant = 'medium',
  borderRadius = 24,
  padding = 20 
}: GlassCardProps) {

  const getGradientColors = () => {
    switch (variant) {
      case 'light':
        return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
      case 'medium':
        return ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)'];
      case 'dark':
        return ['rgba(0, 0, 0, 0.2)', 'rgba(0, 0, 0, 0.1)'];
      default:
        return ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.08)'];
    }
  };

  return (
    <View style={[styles.container, { borderRadius, padding }, style]}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius }]}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
