import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  hapticFeedback?: boolean;
  minDuration?: number;
}

interface UsePullToRefreshReturn {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

export function usePullToRefresh({ 
  onRefresh, 
  hapticFeedback = true,
  minDuration = 800
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    const startTime = Date.now();
    setRefreshing(true);
    
    try {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      await onRefresh();
      
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      if (hapticFeedback) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Pull to refresh error:', error);
      
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
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
