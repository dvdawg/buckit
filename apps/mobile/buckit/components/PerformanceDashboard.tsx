import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const bucketData = [
  { bucket: "Outdoors", completion: 0.8 },
  { bucket: "Family", completion: 0.65 },
  { bucket: "Food", completion: 0.5 },
  { bucket: "Travel", completion: 0.3 },
];

const streakData = [
  { label: "Active Days", value: 5, fill: "#4ade80" },
  { label: "Inactive", value: 2, fill: "#374151" },
];

const progressData = [
  { week: "Week 1", completed: 4 },
  { week: "Week 2", completed: 7 },
  { week: "Week 3", completed: 10 },
  { week: "Week 4", completed: 14 },
];

export default function PerformanceDashboard() {
  const totalCompletion = bucketData.reduce((sum, bucket) => sum + bucket.completion, 0) / bucketData.length;
  const activeDays = streakData[0].value;
  const totalDays = streakData.reduce((sum, item) => sum + item.value, 0);
  const lastWeek = progressData[progressData.length - 1].completed;
  const firstWeek = progressData[0].completed;
  const growthRate = ((lastWeek - firstWeek) / firstWeek) * 100;

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <Text style={styles.title}>Your Stats</Text>
        <Text style={styles.subtitle}>Reflect on your experiences across all your buckets.</Text>
      </View>

      {}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
          <Text style={styles.cardTitle}>Moments Lived by Bucket</Text>
        </View>
        
        <View style={styles.chartContainer}>
          {bucketData.map((bucket, index) => (
            <View key={index} style={styles.barContainer}>
              <Text style={styles.barLabel}>{bucket.bucket}</Text>
              <View style={styles.barBackground}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${bucket.completion * 100}%`,
                      backgroundColor: index === 0 ? '#4ade80' : index === 1 ? '#3b82f6' : index === 2 ? '#8EC5FC' : '#8EC5FC'
                    }
                  ]} 
                />
                <Text style={styles.barPercentage}>{Math.round(bucket.completion * 100)}%</Text>
              </View>
            </View>
          ))}
        </View>
        
        <Text style={styles.cardFooter}>
          You've lived {Math.round(totalCompletion * 100)}% of your total bucket moments.
        </Text>
      </View>

      {}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="flame" size={20} color="#8EC5FC" />
          <Text style={styles.cardTitle}>Streaks & Consistency</Text>
        </View>
        
        <View style={styles.streakContainer}>
          <View style={styles.streakCenter}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{activeDays}-Day Streak</Text>
          </View>
          <View style={styles.streakRing}>
            <View style={[styles.streakSegment, { backgroundColor: '#4ade80', width: `${(activeDays / totalDays) * 100}%` }]} />
            <View style={[styles.streakSegment, { backgroundColor: '#374151', width: `${(streakData[1].value / totalDays) * 100}%` }]} />
          </View>
        </View>
        
        <Text style={styles.cardFooter}>
          You've been active {activeDays} of the last {totalDays} days.
        </Text>
      </View>

      {}
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
          Your momentum increased by {Math.round(growthRate)}% this month.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA1A6',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
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
    borderWidth: 8,
    borderColor: '#374151',
    position: 'relative',
  },
  streakSegment: {
    position: 'absolute',
    height: '100%',
    borderRadius: 40,
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
});
