import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  hapticFeedback?: boolean;
  minDuration?: number; // Minimum duration in milliseconds
}

interface UsePullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh({ 
  onRefresh, 
  hapticFeedback = true,
  minDuration = 800 // Default 800ms minimum duration
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    const startTime = Date.now();
    setRefreshing(true);
    
    try {
      // Trigger haptic feedback when refresh starts
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Execute the refresh function
      await onRefresh();
      
      // Calculate remaining time to meet minimum duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      // Wait for remaining time if needed
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Optional: Add a second haptic feedback when refresh completes
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Pull to refresh error:', error);
      
      // Calculate remaining time to meet minimum duration even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Haptic feedback for error
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, onRefresh, hapticFeedback, minDuration]);

  return {
    refreshing,
    onRefresh: handleRefresh,
  };
}
