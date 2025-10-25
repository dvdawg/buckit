import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePerformance } from '@/hooks/usePerformance';

export default function PerformancePreview() {
  const router = useRouter();
  const { performance, loading } = usePerformance();

  const handlePress = () => {
    router.push('/performance');
  };

  // Show loading state
  if (loading || !performance) {
    return (
      <TouchableOpacity style={styles.container} onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics" size={20} color="#4ade80" />
            <Text style={styles.title}>Performance</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </View>
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={20} color="#4ade80" />
          <Text style={styles.title}>Overview</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {/* Overall Progress */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.metricLabel}>Moments</Text>
          </View>
          <Text style={styles.metricValue}>{Math.round(performance.overallProgress * 100)}%</Text>
          <Text style={styles.metricSubtext}>across buckets</Text>
        </View>

        {/* Current Streak */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={styles.metricLabel}>Streak</Text>
          </View>
          <Text style={styles.metricValue}>{performance.currentStreak}</Text>
          <Text style={styles.metricSubtext}>day streak</Text>
        </View>

        {/* This Month */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="trending-up" size={16} color="#3b82f6" />
            <Text style={styles.metricLabel}>Momentum</Text>
          </View>
          <Text style={styles.metricValue}>+{Math.round(performance.growthRate)}%</Text>
          <Text style={styles.metricSubtext}>this month</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{performance.totalCompletions}</Text>
          <Text style={styles.statLabel}>challenges completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{performance.activeBuckets}</Text>
          <Text style={styles.statLabel}>active buckets</Text>
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
    color: '#fff',
    marginLeft: 8,
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
    fontSize: 12,
    color: '#9BA1A6',
    marginLeft: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
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
