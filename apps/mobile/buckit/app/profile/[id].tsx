import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Dummy user profiles data
const userProfiles = {
  '1': {
    id: '1',
    username: 'alex_adventures',
    fullName: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    location: 'San Francisco, CA',
    bio: 'Adventure seeker and outdoor enthusiast. Always looking for the next mountain to climb! 🏔️',
    points: 2847,
    buckets: [
      {
        id: "1",
        title: "Adventure",
        cover: "https://images.unsplash.com/photo-1551632811-561732d1e306",
        challenges: 12,
      },
      {
        id: "2",
        title: "Photography",
        cover: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a",
        challenges: 8,
      },
      {
        id: "3",
        title: "Fitness",
        cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        challenges: 15,
      },
    ],
    recentChallenges: [
      {
        id: "1",
        title: "Half Dome Hike",
        location: "Yosemite",
        completed: true,
        satisfaction: 5,
      },
      {
        id: "2",
        title: "Sunrise Photography",
        location: "Golden Gate Bridge",
        completed: true,
        satisfaction: 4,
      },
      {
        id: "3",
        title: "Marathon Training",
        location: "Golden Gate Park",
        completed: false,
        satisfaction: null,
      },
    ],
    isFriend: false,
  },
  '2': {
    id: '2',
    username: 'sarah_explorer',
    fullName: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
    location: 'Berkeley, CA',
    bio: 'Foodie, traveler, and coffee enthusiast. Exploring the world one cup at a time ☕',
    points: 1923,
    buckets: [
      {
        id: "1",
        title: "Food",
        cover: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b",
        challenges: 20,
      },
      {
        id: "2",
        title: "Travel",
        cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828",
        challenges: 14,
      },
      {
        id: "3",
        title: "Coffee",
        cover: "https://images.unsplash.com/photo-1554118811-1e0d58224f24",
        challenges: 6,
      },
    ],
    recentChallenges: [
      {
        id: "1",
        title: "Try 10 New Restaurants",
        location: "SF Bay Area",
        completed: true,
        satisfaction: 5,
      },
      {
        id: "2",
        title: "Visit 5 Coffee Shops",
        location: "Berkeley",
        completed: true,
        satisfaction: 4,
      },
      {
        id: "3",
        title: "Plan Europe Trip",
        location: "Planning",
        completed: false,
        satisfaction: null,
      },
    ],
    isFriend: false,
  },
  '3': {
    id: '3',
    username: 'mike_fitness',
    fullName: 'Mike Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
    location: 'Oakland, CA',
    bio: 'Fitness coach and wellness advocate. Helping others achieve their health goals 💪',
    points: 3456,
    buckets: [
      {
        id: "1",
        title: "Fitness",
        cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
        challenges: 25,
      },
      {
        id: "2",
        title: "Nutrition",
        cover: "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
        challenges: 18,
      },
      {
        id: "3",
        title: "Wellness",
        cover: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
        challenges: 12,
      },
    ],
    recentChallenges: [
      {
        id: "1",
        title: "100 Push-ups Challenge",
        location: "Home Gym",
        completed: true,
        satisfaction: 5,
      },
      {
        id: "2",
        title: "Meal Prep Week",
        location: "Kitchen",
        completed: true,
        satisfaction: 4,
      },
      {
        id: "3",
        title: "Morning Meditation",
        location: "Home",
        completed: false,
        satisfaction: null,
      },
    ],
    isFriend: false,
  },
  '4': {
    id: '4',
    username: 'emma_travels',
    fullName: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
    location: 'Palo Alto, CA',
    bio: 'Digital nomad and culture enthusiast. Collecting memories from around the world 🌍',
    points: 2156,
    buckets: [
      {
        id: "1",
        title: "Travel",
        cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828",
        challenges: 16,
      },
      {
        id: "2",
        title: "Culture",
        cover: "https://images.unsplash.com/photo-1541961017774-22349e4a1262",
        challenges: 9,
      },
      {
        id: "3",
        title: "Languages",
        cover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
        challenges: 7,
      },
    ],
    recentChallenges: [
      {
        id: "1",
        title: "Visit 3 New Countries",
        location: "Europe",
        completed: true,
        satisfaction: 5,
      },
      {
        id: "2",
        title: "Learn Basic Spanish",
        location: "Online",
        completed: true,
        satisfaction: 3,
      },
      {
        id: "3",
        title: "Try Local Cuisine",
        location: "Various",
        completed: false,
        satisfaction: null,
      },
    ],
    isFriend: false,
  },
  '5': {
    id: '5',
    username: 'david_foodie',
    fullName: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    location: 'San Jose, CA',
    bio: 'Chef and food blogger. Sharing my culinary adventures and recipes 🍳',
    points: 1789,
    buckets: [
      {
        id: "1",
        title: "Cooking",
        cover: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136",
        challenges: 22,
      },
      {
        id: "2",
        title: "Restaurants",
        cover: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
        challenges: 13,
      },
      {
        id: "3",
        title: "Baking",
        cover: "https://images.unsplash.com/photo-1578985545062-69928b1d9587",
        challenges: 8,
      },
    ],
    recentChallenges: [
      {
        id: "1",
        title: "Master Sourdough Bread",
        location: "Home Kitchen",
        completed: true,
        satisfaction: 4,
      },
      {
        id: "2",
        title: "Try Michelin Star Restaurant",
        location: "San Francisco",
        completed: true,
        satisfaction: 5,
      },
      {
        id: "3",
        title: "Cook 30 Different Cuisines",
        location: "Home",
        completed: false,
        satisfaction: null,
      },
    ],
    isFriend: false,
  },
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isFriend, setIsFriend] = useState(false);
  
  // For now, show a "coming soon" message instead of dummy data
  // TODO: Implement real user profile fetching from database
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User profiles coming soon!</Text>
        <Text style={styles.errorSubtext}>This feature is under development.</Text>
      </View>
    </View>
  );

  const handleAddFriend = () => {
    setIsFriend(true);
    Alert.alert('Friend Request Sent', `Friend request sent to ${user.fullName}!`);
  };

  const handleBucketPress = (bucketId: string) => {
    Alert.alert('Bucket', `Viewing ${user.buckets.find(b => b.id === bucketId)?.title} bucket`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header with Full-Width Image */}
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: user.avatar }} 
          style={styles.profileHeaderImage} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        />
        <View style={styles.userInfo}>
          <View style={styles.userInfoTop}>
            <View style={styles.userInfoLeft}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userLocation}>@{user.username}</Text>
              <Text style={styles.userBio}>{user.bio}</Text>
              <Text style={styles.userPoints}>Points: {user.points}</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.addFriendButton}
                onPress={handleAddFriend}
                disabled={isFriend}
              >
                <LinearGradient
                  colors={isFriend ? ['#374151', '#4B5563'] : ['#8EC5FC', '#E0C3FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addFriendGradient}
                >
                  <Ionicons 
                    name={isFriend ? "checkmark" : "person-add"} 
                    size={16} 
                    color={isFriend ? "#9BA1A6" : "#000"} 
                  />
                  <Text style={[
                    styles.addFriendText,
                    isFriend && styles.addFriendTextSent
                  ]}>
                    {isFriend ? 'Sent' : 'Add Friend'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Buckets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buckets</Text>
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

      {/* Recent Challenges Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Challenges</Text>
        {user.recentChallenges.map((challenge) => (
          <View key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: challenge.is_completed ? '#10B981' : '#6B7280' }
              ]}>
                <Text style={styles.statusText}>
                  {challenge.is_completed ? 'Completed' : 'In Progress'}
                </Text>
              </View>
            </View>
            <Text style={styles.challengeLocation}>📍 {challenge.location}</Text>
            {challenge.is_completed && challenge.satisfaction_rating && (
              <View style={styles.satisfactionRow}>
                <Text style={styles.satisfactionText}>Satisfaction: </Text>
                <View style={styles.starsContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < challenge.satisfaction_rating! ? "star" : "star-outline"}
                      size={16}
                      color="#F59E0B"
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#9BA1A6',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  },
  userInfoTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userInfoLeft: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFriendButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addFriendGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addFriendText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addFriendTextSent: {
    color: '#9BA1A6',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#8EC5FC',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    lineHeight: 20,
  },
  userPoints: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  bucketsContainer: {
    paddingRight: 20,
  },
  bucketCard: {
    width: (width - 60) / 3,
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
  challengeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  challengeLocation: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 8,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satisfactionText: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  starsContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
});
