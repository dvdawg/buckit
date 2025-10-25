import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Dummy data with participant counts
const buckets = [
  {
    id: "1",
    title: "Jits",
    cover: "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
    challenges: 13,
    participants: 5,
  },
  {
    id: "2",
    title: "Cafes",
    cover: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
    challenges: 9,
    participants: 1,
  },
  {
    id: "3",
    title: "Family",
    cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    challenges: 3,
    participants: 8,
  },
  {
    id: "4",
    title: "Travel",
    cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828",
    challenges: 12,
    participants: 3,
  },
  {
    id: "5",
    title: "Fitness",
    cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
    challenges: 8,
    participants: 12,
  },
  {
    id: "6",
    title: "Food",
    cover: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b",
    challenges: 15,
    participants: 7,
  },
  {
    id: "7",
    title: "Art",
    cover: "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
    challenges: 5,
    participants: 4,
  },
  {
    id: "8",
    title: "Music",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
    challenges: 7,
    participants: 9,
  },
];

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with padding

export default function Buckets() {
  const router = useRouter();

  console.log('Buckets page rendering');

  const handleBucketPress = (bucketId: string) => {
    router.push(`/buckets/${bucketId}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Buckets</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Buckets Grid */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      >
        {buckets.map((bucket) => (
          <TouchableOpacity
            key={bucket.id}
            style={styles.bucketCard}
            onPress={() => handleBucketPress(bucket.id)}
          >
            <Image source={{ uri: bucket.cover }} style={styles.bucketImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.bucketGradient}
            />
            
            {/* Participant Icon and Count */}
            <View style={styles.participantInfo}>
              <Ionicons name="people" size={16} color="#fff" />
              <Text style={styles.participantCount}>{bucket.participants}</Text>
            </View>
            
            {/* Bucket Info */}
            <View style={styles.bucketInfo}>
              <Text style={styles.bucketTitle}>{bucket.title}</Text>
              <Text style={styles.bucketChallenges}>{bucket.challenges} Challenges</Text>
            </View>
          </TouchableOpacity>
        ))}
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
    justifyContent: 'space-between',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
});
