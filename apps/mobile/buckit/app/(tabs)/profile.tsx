import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '@/hooks/useSession';
import { useMe } from '@/hooks/useMe';

// Dummy data
const user = {
  name: "Brandon",
  location: "Berkeley, CA",
  profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
  buckets: [
    {
      id: "1",
      title: "Jits",
      cover: "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      challenges: 6,
    },
    {
      id: "2",
      title: "Family",
      cover: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      challenges: 3,
    },
    {
      id: "3",
      title: "Cafes",
      cover: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
      challenges: 9,
    },
    {
      id: "4",
      title: "Travel",
      cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828",
      challenges: 12,
    },
    {
      id: "5",
      title: "Fitness",
      cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
      challenges: 8,
    },
    {
      id: "6",
      title: "Food",
      cover: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b",
      challenges: 15,
    },
    {
      id: "7",
      title: "Art",
      cover: "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
      challenges: 5,
    },
    {
      id: "8",
      title: "Music",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
      challenges: 7,
    },
  ],
};

const { width } = Dimensions.get('window');

export default function Profile() {
  const router = useRouter();
  const { signOut } = useSession();
  const { me, loading } = useMe();

  const handleBucketPress = (bucketId: string) => {
    router.push(`/buckets/${bucketId}`);
  };

  const handleAllChallenges = () => {
    router.push('/challenges');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header with Full-Width Image */}
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: me?.avatar_url || user.profileImage }} 
          style={styles.profileHeaderImage} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {loading ? 'Loading...' : (me?.full_name ?? me?.handle ?? user.name)}
          </Text>
          <Text style={styles.userLocation}>
            {me?.points ? `Points: ${me.points}` : user.location}
          </Text>
        </View>
      </View>

      {/* Buckets Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => {
          console.log('Navigating to /buckets');
          router.push('/buckets');
        }}>
          <Text style={styles.sectionTitle}>Buckets</Text>
          <Ionicons name="chevron-forward" size={20} color="#9BA1A6" />
        </TouchableOpacity>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bucketsContainer}
        >
          {user.buckets.map((bucket) => (
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
              <View style={styles.bucketInfo}>
                <Text style={styles.bucketTitle}>{bucket.title}</Text>
                <Text style={styles.bucketChallenges}>{bucket.challenges} Challenges</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* All Challenges Link */}
      <TouchableOpacity style={styles.allChallengesButton} onPress={handleAllChallenges}>
        <Text style={styles.allChallengesText}>All Challenges</Text>
        <Ionicons name="chevron-forward" size={20} color="#9BA1A6" />
      </TouchableOpacity>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <Button title="Sign out" onPress={signOut} />
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    height: 300,
    position: 'relative',
  },
  profileHeaderImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  userInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#9BA1A6',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  bucketsContainer: {
    paddingRight: 20,
  },
  bucketCard: {
    width: (width - 60) / 3, // Show exactly 3 buckets
    height: 200,
    marginRight: 16,
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
  allChallengesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  allChallengesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  signOutContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});
