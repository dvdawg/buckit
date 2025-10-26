import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBuckets } from '@/hooks/useBuckets';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with padding

export default function MyBuckets() {
  const router = useRouter();
  const { buckets, loading } = useBuckets();

  const handleBucketPress = (bucketId: string) => {
    router.push(`/buckets/${bucketId}`);
  };

  const handleAddBucket = () => {
    router.push('/create-bucket');
  };

  const renderBucketCard = (bucket: any) => {
    // Use cover_url if available, otherwise use a placeholder
    const imageSource = bucket.cover_url 
      ? { uri: bucket.cover_url }
      : { uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24' }; // Default placeholder

    return (
      <TouchableOpacity
        key={bucket.id}
        style={styles.bucketCard}
        onPress={() => handleBucketPress(bucket.id)}
      >
        <Image source={imageSource} style={styles.bucketImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bucketGradient}
        />
        
        {/* Bucket Info */}
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketTitle}>{bucket.title}</Text>
          <Text style={styles.bucketChallenges}>{bucket.challenge_count} Challenges</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-outline" size={64} color="#666" />
      <Text style={styles.emptyStateTitle}>No Buckets Yet</Text>
      <Text style={styles.emptyStateSubtitle}>Create your first bucket to get started!</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#8EC5FC" />
      <Text style={styles.loadingText}>Loading your buckets...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Navigation Header - No back button, tab bar persists */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Buckets</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddBucket}>
          <Ionicons name="add" size={24} color="#8EC5FC" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : buckets.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        >
          {buckets.map(renderBucketCard)}
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for tab bar
  },
  bucketCard: {
    width: cardWidth,
    height: 280,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bucketImage: {
    width: '100%',
    height: '100%',
  },
  bucketGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  participantInfo: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  bucketInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bucketTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  bucketChallenges: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 24,
  },
});
