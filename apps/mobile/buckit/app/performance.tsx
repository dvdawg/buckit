import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePerformance } from '@/hooks/usePerformance';
import { useBuckets } from '@/hooks/useBuckets';
import { useMe } from '@/hooks/useMe';
import { useItems } from '@/hooks/useItems';

const { width } = Dimensions.get('window');

export default function PerformancePage() {
  const router = useRouter();
  const { performance, loading: performanceLoading } = usePerformance();
  const { buckets, loading: bucketsLoading } = useBuckets();
  const { me, loading: meLoading } = useMe();
  const { items, loading: itemsLoading } = useItems();

  // Show loading state
  if (performanceLoading || bucketsLoading || meLoading || itemsLoading) {
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

  // Calculate real user data
  const challengesMade = items.length;
  const challengesCompleted = items.filter(item => item.is_completed).length;
  const bucketsMade = buckets.length;
  const bucketsCompleted = buckets.filter(bucket => bucket.completion_percentage === 100).length;
  
  // Calculate bucket data with real completion percentages
  const bucketData = buckets.map(bucket => ({
    bucket: bucket.title,
    completion: bucket.completion_percentage / 100,
    color: bucket.color || '#1e40af'
  }));

  const totalCompletion = bucketData.length > 0 
    ? bucketData.reduce((sum, bucket) => sum + bucket.completion, 0) / bucketData.length 
    : 0;
  
  const currentStreak = me?.current_streak || 0;
  const totalCompletions = me?.total_completions || 0;
  const growthRate = performance?.growthRate || 0;

  // Generate monthly histogram data (last 6 months)
  const generateMonthlyHistogram = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Count completed challenges in this month
      const completedInMonth = items.filter(item => {
        if (!item.completed_at) return false;
        const completedDate = new Date(item.completed_at);
        return completedDate >= monthStart && completedDate <= monthEnd;
      }).length;
      
      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        completed: completedInMonth,
        date: monthStart
      });
    }
    return months;
  };

  const monthlyData = generateMonthlyHistogram();
  const maxCompleted = Math.max(...monthlyData.map(m => m.completed), 1);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* First Row - 4 Stats Boxes */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: '#8EC5FC' }]}>
            <Text style={styles.statValue}>{challengesMade}</Text>
            <Text style={styles.statLabel}>Challenges Made</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#1e40af' }]}>
            <Text style={styles.statValue}>{challengesCompleted}</Text>
            <Text style={styles.statLabel}>Challenges Completed</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#6b7280' }]}>
            <Text style={styles.statValue}>{bucketsMade}</Text>
            <Text style={styles.statLabel}>Buckets Made</Text>
          </View>
          <View style={[styles.statBox, { borderColor: '#374151' }]}>
            <Text style={styles.statValue}>{bucketsCompleted}</Text>
            <Text style={styles.statLabel}>Buckets Completed</Text>
          </View>
        </View>

        {/* Section 1 - Challenges by Bucket */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Challenges by Bucket</Text>
          </View>
          
          <View style={styles.stackedChartContainer}>
            {bucketData.length > 0 ? bucketData.map((bucket, index) => {
              // Get actual challenge counts for this bucket
              const bucketChallenges = items.filter(item => item.bucket_id === buckets[index]?.id);
              const completedChallenges = bucketChallenges.filter(item => item.is_completed).length;
              const totalChallenges = bucketChallenges.length;
              const remainingChallenges = totalChallenges - completedChallenges;
              
              return (
                <View key={index} style={styles.stackedBarContainer}>
                  <Text style={styles.barLabel}>{bucket.bucket}</Text>
                  <View style={styles.stackedBarBackground}>
                    <View style={styles.stackedBarRow}>
                      <View 
                        style={[
                          styles.stackedBarSegment,
                          { 
                            width: `${(completedChallenges / totalChallenges) * 100}%`,
                            backgroundColor: '#dbeafe',
                            borderTopLeftRadius: 4,
                            borderBottomLeftRadius: 4,
                          }
                        ]} 
                      >
                        <Text style={styles.barNumberLabelLight}>{completedChallenges}</Text>
                      </View>
                      <View 
                        style={[
                          styles.stackedBarSegment,
                          { 
                            width: `${(remainingChallenges / totalChallenges) * 100}%`,
                            backgroundColor: '#1e40af',
                            borderTopRightRadius: 4,
                            borderBottomRightRadius: 4,
                          }
                        ]} 
                      >
                        <Text style={styles.barNumberLabelDark}>{totalChallenges}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }) : (
              <Text style={styles.emptyStateText}>No buckets found. Create your first bucket to start tracking progress!</Text>
            )}
          </View>
        </View>

        {/* Monthly Histogram */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Challenges Completed (Last 6 Months)</Text>
          </View>
          
          <View style={styles.histogramContainer}>
            {monthlyData.map((month, index) => {
              return (
                <View key={index} style={styles.histogramBar}>
                  <View style={styles.histogramBarContainer}>
                    <View 
                      style={[
                        styles.histogramBarFill,
                        { 
                          height: `${(month.completed / maxCompleted) * 100}%`,
                          backgroundColor: month.completed > 0 ? '#8EC5FC' : '#374151'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.histogramLabel}>{month.month}</Text>
                  <Text style={styles.histogramValue}>{month.completed}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Streak and Momentum Row */}
        <View style={styles.streakMomentumRow}>
          <View style={[styles.streakMomentumBox, { borderColor: '#6b7280' }]}>
            <View style={styles.streakMomentumIcon}>
              <Ionicons name="flame" size={24} color="#6b7280" />
            </View>
            <Text style={styles.streakMomentumValue}>{currentStreak}</Text>
            <Text style={styles.streakMomentumLabel}>Days Streak</Text>
          </View>
          <View style={[styles.streakMomentumBox, { borderColor: '#1e40af' }]}>
            <View style={styles.streakMomentumIcon}>
              <Ionicons name="trending-up" size={24} color="#1e40af" />
            </View>
            <Text style={styles.streakMomentumValue}>{momentumDisplay}</Text>
            <Text style={styles.streakMomentumLabel}>{momentumLabel}</Text>
          </View>
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
  overviewCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    minHeight: 160,
  },
  overviewCardTitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginTop: 12,
    textAlign: 'center',
  },
  radialChartContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialChart: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  radialChartBackground: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#374151',
  },
  radialChartProgress: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#1e40af',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  radialChartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialChartValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  radialChartLabel: {
    fontSize: 12,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 4,
  },
  numberCard: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  numberCardValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  numberCardLabel: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 8,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'left',
  },
  stackedChartContainer: {
    marginBottom: 16,
  },
  stackedBarContainer: {
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
    fontWeight: '500',
  },
  stackedBarBackground: {
    marginBottom: 4,
  },
  stackedBarRow: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  stackedBarSegment: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barNumberLabelLight: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000',
  },
  barNumberLabelDark: {
    fontSize: 11,
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
    height: 200,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  lineChart: {
    height: '100%',
    position: 'relative',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    paddingBottom: 30, // Space for labels
    paddingTop: 20, // Space for values
  },
  dataPointContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  lineToNext: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#1e40af',
    opacity: 0.6,
    transform: [{ translateY: -1 }], // Center the line on the dot
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ translateX: -4 }, { translateY: -4 }], // Center the dot
  },
  lineLabel: {
    fontSize: 11,
    color: '#9BA1A6',
    position: 'absolute',
    bottom: -25,
    transform: [{ translateX: -15 }], // Center the label
  },
  lineValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    position: 'absolute',
    transform: [{ translateX: -8 }], // Center the value
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
  // New styles for stats row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  // Histogram styles
  histogramContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 8,
  },
  histogramBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  histogramBarContainer: {
    height: 80,
    width: '100%',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  histogramBarFill: {
    width: '100%',
    minHeight: 2,
    borderRadius: 2,
  },
  histogramLabel: {
    fontSize: 10,
    color: '#9BA1A6',
    marginBottom: 2,
  },
  histogramValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // Streak and momentum styles
  streakMomentumRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  streakMomentumBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  streakMomentumIcon: {
    marginBottom: 12,
  },
  streakMomentumValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  streakMomentumLabel: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
  },
});
