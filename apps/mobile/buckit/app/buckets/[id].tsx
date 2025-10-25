import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Dummy data for Jits bucket
const jitsBucket = {
  id: "1",
  title: "Jits",
  cover: "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
  createdDate: "09/25/2025",
  challenges: [
    {
      id: "1",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "2", 
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "3",
      title: "Mt. Tam Hike", 
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "4",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais", 
      completed: false,
    },
    {
      id: "5",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "6",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
  ],
};

const { width, height } = Dimensions.get('window');

export default function BucketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // For now, only handle Jits bucket (id: "1")
  const bucket = id === "1" ? jitsBucket : null;

  const handleBack = () => {
    router.back();
  };

  const handleAddItem = () => {
    // TODO: Open modal to add new item/challenge
    console.log('Add new item to bucket');
  };

  const handleChallengePress = (challengeId: string) => {
    // TODO: Navigate to challenge detail
    console.log('Navigate to challenge:', challengeId);
  };

  if (!bucket) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bucket not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Image source={{ uri: bucket.cover }} style={styles.headerImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.headerGradient}
        />
        
        {/* Navigation */}
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="people" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bucket Info */}
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketTitle}>{bucket.title}</Text>
          <View style={styles.bucketMeta}>
            <Text style={styles.createdDate}>Created {bucket.createdDate}</Text>
            <View style={styles.statusIcon}>
              <Ionicons name="ellipse" size={8} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      {/* Challenges List */}
      <ScrollView style={styles.challengesSection} showsVerticalScrollIndicator={false}>
        {bucket.challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeCard}
            onPress={() => handleChallengePress(challenge.id)}
          >
            <View style={styles.challengeIcon}>
              <Ionicons name="ellipse-outline" size={24} color="#fff" />
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <View style={styles.challengeLocation}>
                <Ionicons name="location" size={12} color="#ff4444" />
                <Text style={styles.locationText}>{challenge.location}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddItem}>
        <Ionicons name="add" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerSection: {
    height: height * 0.6,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerNav: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bucketTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bucketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
  statusIcon: {
    width: 8,
    height: 8,
  },
  challengesSection: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  challengeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#9BA1A6',
    marginLeft: 4,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});
