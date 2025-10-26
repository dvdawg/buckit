import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePerformance } from '@/hooks/usePerformance';
import { useBuckets } from '@/hooks/useBuckets';
import { useMe } from '@/hooks/useMe';
import { useItems } from '@/hooks/useItems';

export default function PerformancePreview() {
  const router = useRouter();
  const { performance, loading: performanceLoading } = usePerformance();
  const { buckets, loading: bucketsLoading } = useBuckets();
  const { me, loading: meLoading } = useMe();
  const { items, loading: itemsLoading } = useItems();

  const handlePress = () => {
    router.push('/performance');
  };

  // Calculate real data
  const challengesMade = items.length;
  const challengesCompleted = items.filter(item => item.is_completed).length;
  const bucketsMade = buckets.length;
  const currentStreak = me?.current_streak || 0;
  
  // Calculate momentum (challenges completed in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const currentPeriodMomentum = items.filter(item => {
    if (!item.completed_at) return false;
    const completedDate = new Date(item.completed_at);
    return completedDate >= thirtyDaysAgo;
  }).length;

  const previousPeriodMomentum = items.filter(item => {
    if (!item.completed_at) return false;
    const completedDate = new Date(item.completed_at);
    return completedDate >= sixtyDaysAgo && completedDate < thirtyDaysAgo;
  }).length;

  // Check if user has been active for less than 30 days (first month)
  const accountCreated = me?.created_at ? new Date(me.created_at) : new Date();
  const daysSinceAccount = Math.floor((new Date().getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));
  const isFirstMonth = daysSinceAccount < 30;

  // Calculate momentum percentage change
  let momentumDisplay, momentumLabel;
  if (isFirstMonth) {
    momentumDisplay = '--';
    momentumLabel = 'vs last month';
  } else if (previousPeriodMomentum === 0) {
    // If no previous data, show current count
    momentumDisplay = currentPeriodMomentum;
    momentumLabel = 'vs last month';
  } else {
    // Calculate percentage change
    const percentageChange = ((currentPeriodMomentum - previousPeriodMomentum) / previousPeriodMomentum) * 100;
    momentumDisplay = `${percentageChange > 0 ? '+' : ''}${Math.round(percentageChange)}%`;
    momentumLabel = 'vs last month';
  }

  // Show loading state
  if (performanceLoading || bucketsLoading || meLoading || itemsLoading) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Analytics</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </View>
        <Text style={styles.loadingText}>Loading Analytics Data...</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Analytics</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Challenges Completed */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
          <Text style={styles.metricValue}>{challengesCompleted}</Text>
          <Text style={styles.metricSubtext}>Challenges</Text>
        </View>

        {/* Current Streak */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="flame" size={16} color="#8EC5FC" />
            <Text style={styles.metricLabel}>Streak</Text>
          </View>
          <Text style={styles.metricValue}>{currentStreak}</Text>
          <Text style={styles.metricSubtext}>Days</Text>
        </View>

        {/* Momentum */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="trending-up" size={16} color="#18357A" />
            <Text style={styles.metricLabel}>Momentum</Text>
          </View>
          <Text style={styles.metricValue}>{momentumDisplay}</Text>
          <Text style={styles.metricSubtext}>Vs Last Month</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{challengesMade}</Text>
          <Text style={styles.statLabel}>Challenges Made</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{bucketsMade}</Text>
          <Text style={styles.statLabel}>Buckets Made</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#A0A0A0',
    fontFamily: 'Poppins',
    marginLeft: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 8,
  },
});
