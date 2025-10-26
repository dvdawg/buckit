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

  // Dummy data for demonstration
  const bucketData = [
    { bucket: "Fitness", completion: 0.8, color: '#1e40af' },
    { bucket: "Travel", completion: 0.6, color: '#1e40af' },
    { bucket: "Food", completion: 0.4, color: '#1e40af' },
    { bucket: "Art", completion: 0.9, color: '#1e40af' },
    { bucket: "Music", completion: 0.3, color: '#1e40af' },
    { bucket: "Family", completion: 0.7, color: '#1e40af' },
  ];

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
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View style={styles.overviewCardsContainer}>
          {/* Total Completion Percentage */}
          <View style={styles.overviewCard}>
            <View style={styles.radialChartContainer}>
              <View style={styles.radialChart}>
                <View style={styles.radialChartBackground} />
                <View style={styles.radialChartProgress} />
                <View style={styles.radialChartCenter}>
                  <Text style={styles.radialChartValue}>68%</Text>
                  <Text style={styles.radialChartLabel}>Completed</Text>
                </View>
              </View>
            </View>
            <Text style={styles.overviewCardTitle}>Total Progress</Text>
          </View>

          {/* Last Month Challenges */}
          <View style={styles.overviewCard}>
            <View style={styles.numberCard}>
              <Text style={styles.numberCardValue}>24</Text>
              <Text style={styles.numberCardLabel}>This Month</Text>
            </View>
            <Text style={styles.overviewCardTitle}>Challenges Done</Text>
          </View>
        </View>

        {/* Section 1 - Challenges by Bucket */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Challenges by Bucket</Text>
          </View>
          
          <View style={styles.stackedChartContainer}>
            {bucketData.length > 0 ? bucketData.map((bucket, index) => {
              const completedChallenges = Math.round(bucket.completion * 10); // Assuming 10 total challenges per bucket
              const totalChallenges = 10;
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
});
