import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePerformance } from '@/hooks/usePerformance';
import { useBuckets } from '@/hooks/useBuckets';
import { useMe } from '@/hooks/useMe';

const { width } = Dimensions.get('window');

export default function PerformancePage() {
  const router = useRouter();
  const { performance, loading: performanceLoading } = usePerformance();
  const { buckets, loading: bucketsLoading } = useBuckets();
  const { me, loading: meLoading } = useMe();

  // Show loading state
  if (performanceLoading || bucketsLoading || meLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Overview</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </View>
    );
  }

  // Prepare bucket data from real data
  const bucketData = buckets.map((bucket, index) => ({
    bucket: bucket.title,
    completion: (bucket.completion_percentage || 0) / 100,
    color: bucket.color || '#4ade80'
  }));

  // Calculate real metrics
  const totalCompletion = bucketData.length > 0 
    ? bucketData.reduce((sum, bucket) => sum + bucket.completion, 0) / bucketData.length 
    : 0;
  
  const currentStreak = performance?.currentStreak || 0;
  const totalCompletions = performance?.totalCompletions || 0;
  const growthRate = performance?.growthRate || 0;

  // Generate weekly progress data (last 4 weeks)
  const generateWeeklyProgress = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 6));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      weeks.push({
        week: `Week ${4 - i}`,
        completed: Math.floor(Math.random() * 10) + 5, // Placeholder - would need real weekly data
        date: weekStart
      });
    }
    return weeks;
  };

  const progressData = generateWeeklyProgress();
  const lastWeek = progressData[progressData.length - 1].completed;
  const firstWeek = progressData[0].completed;
  const calculatedGrowthRate = firstWeek > 0 ? ((lastWeek - firstWeek) / firstWeek) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Overview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>Reflect on your experiences across all your buckets.</Text>
        </View>

        {/* Section 1 - Progress by Bucket */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
            <Text style={styles.cardTitle}>Moments Lived by Bucket</Text>
          </View>
          
          <View style={styles.chartContainer}>
            {bucketData.length > 0 ? bucketData.map((bucket, index) => (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barLabel}>{bucket.bucket}</Text>
                <View style={styles.barBackground}>
                  <View 
                    style={[
                      styles.barFill, 
                      { 
                        width: `${bucket.completion * 100}%`,
                        backgroundColor: bucket.color
                      }
                    ]} 
                  />
                  <Text style={styles.barPercentage}>{Math.round(bucket.completion * 100)}%</Text>
                </View>
              </View>
            )) : (
              <Text style={styles.emptyStateText}>No buckets found. Create your first bucket to start tracking progress!</Text>
            )}
          </View>
          
          <Text style={styles.cardFooter}>
            You've lived {Math.round(totalCompletion * 100)}% of your total bucket moments.
          </Text>
        </View>

        {/* Section 2 - Streaks & Consistency */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flame" size={20} color="#f59e0b" />
            <Text style={styles.cardTitle}>Streaks & Consistency</Text>
          </View>
          
          <View style={styles.streakContainer}>
            <View style={styles.streakCenter}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{currentStreak}-Day Streak</Text>
            </View>
            <View style={styles.streakRing}>
              <View style={styles.streakRingBackground} />
              <View style={[styles.streakRingProgress, { 
                transform: [{ rotate: `${Math.min((currentStreak / 30) * 360, 360)}deg` }] 
              }]} />
            </View>
          </View>
          
          <Text style={styles.cardFooter}>
            You've completed {totalCompletions} challenges with a {currentStreak}-day streak.
          </Text>
        </View>

        {/* Section 3 - Total Challenges Completed */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Experiences Over Time</Text>
          </View>
          
          <View style={styles.lineChartContainer}>
            <View style={styles.lineChart}>
              {progressData.map((point, index) => (
                <View key={index} style={styles.linePoint}>
                  <View 
                    style={[
                      styles.lineDot,
                      { 
                        backgroundColor: '#3b82f6',
                        bottom: `${(point.completed / 14) * 100}%`
                      }
                    ]} 
                  />
                  <Text style={styles.lineLabel}>{point.week}</Text>
                  <Text style={styles.lineValue}>{point.completed}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <Text style={styles.cardFooter}>
            Your momentum increased by {Math.round(calculatedGrowthRate)}% this month.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  subtitleContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA1A6',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  chartContainer: {
    marginBottom: 16,
  },
  barContainer: {
    marginBottom: 16,
  },
  barLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  barBackground: {
    height: 24,
    backgroundColor: '#374151',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
  },
  barPercentage: {
    position: 'absolute',
    right: 8,
    top: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardFooter: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  streakIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  streakRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRingBackground: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#374151',
  },
  streakRingProgress: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#4ade80',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  lineChartContainer: {
    height: 120,
    marginBottom: 16,
  },
  lineChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
  },
  linePoint: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
  },
  lineLabel: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 8,
  },
  lineValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
