import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '@/hooks/useSession';
import { useMe } from '@/hooks/useMe';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import PerformancePreview from '@/components/PerformancePreview';
import { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// Dummy data
const dummyUser = {
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

// All Challenges dummy data
const allChallenges = [
  {
    id: "1",
    bucket: { name: "Jits", emoji: "🪣", color: "#4ade80" },
    title: "Mt. Tam Hike",
    location: "Mt Tamalpais",
    dueDate: "Jan 15",
    urgency: "Coming Up",
    urgencyColor: "#f59e0b",
    completed: true,
    satisfaction: 5,
  },
  {
    id: "2",
    bucket: { name: "Family", emoji: "🏠", color: "#3b82f6" },
    title: "Family Dinner",
    location: "Home",
    dueDate: "Jan 12",
    urgency: "Missed",
    urgencyColor: "#ef4444",
    completed: false,
    satisfaction: null,
  },
  {
    id: "3",
    bucket: { name: "Food", emoji: "🍽️", color: "#8b5cf6" },
    title: "Try New Restaurant",
    location: "Downtown",
    dueDate: "Jan 20",
    urgency: "Anytime",
    urgencyColor: "#6b7280",
    completed: false,
    satisfaction: null,
  },
  {
    id: "4",
    bucket: { name: "Jits", emoji: "🪣", color: "#4ade80" },
    title: "Golden Gate Bridge Walk",
    location: "San Francisco",
    dueDate: "Jan 18",
    urgency: "Coming Up",
    urgencyColor: "#f59e0b",
    completed: true,
    satisfaction: 4,
  },
  {
    id: "5",
    bucket: { name: "Fitness", emoji: "💪", color: "#10b981" },
    title: "Morning Run",
    location: "Park",
    dueDate: "Jan 14",
    urgency: "Coming Up",
    urgencyColor: "#f59e0b",
    completed: false,
    satisfaction: null,
  },
  {
    id: "6",
    bucket: { name: "Travel", emoji: "✈️", color: "#f97316" },
    title: "Plan Weekend Trip",
    location: "Napa Valley",
    dueDate: "Jan 25",
    urgency: "Anytime",
    urgencyColor: "#6b7280",
    completed: false,
    satisfaction: null,
  },
  {
    id: "7",
    bucket: { name: "Art", emoji: "🎨", color: "#ec4899" },
    title: "Visit Art Museum",
    location: "SFMOMA",
    dueDate: "Jan 16",
    urgency: "Coming Up",
    urgencyColor: "#f59e0b",
    completed: false,
    satisfaction: null,
  },
  {
    id: "8",
    bucket: { name: "Music", emoji: "🎵", color: "#6366f1" },
    title: "Learn New Song",
    location: "Home Studio",
    dueDate: "Jan 22",
    urgency: "Anytime",
    urgencyColor: "#6b7280",
    completed: false,
    satisfaction: null,
  },
  {
    id: "9",
    bucket: { name: "Family", emoji: "🏠", color: "#3b82f6" },
    title: "Call Grandma",
    location: "Phone",
    dueDate: "Jan 13",
    urgency: "Missed",
    urgencyColor: "#ef4444",
    completed: false,
    satisfaction: null,
  },
  {
    id: "10",
    bucket: { name: "Food", emoji: "🍽️", color: "#8b5cf6" },
    title: "Cook New Recipe",
    location: "Kitchen",
    dueDate: "Jan 19",
    urgency: "Coming Up",
    urgencyColor: "#f59e0b",
    completed: false,
    satisfaction: null,
  },
];

const { width } = Dimensions.get('window');

export default function Profile() {
  const router = useRouter();
  const { signOut, user, isSessionValid } = useSession();
  const { me, loading, refresh } = useMe();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Monitor session validity
  useSessionMonitor();

  // Track if we need to refresh when coming back from settings
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Track navigation state to determine when to refresh
  const [lastNavigationTime, setLastNavigationTime] = useState(0);

  // Only refresh when we actually need to (not on every focus)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastNavigation = now - lastNavigationTime;
      
      // Only refresh if:
      // 1. We explicitly set shouldRefresh (returning from settings)
      // 2. It's been more than 5 seconds since last navigation (fresh tab switch)
      if (shouldRefresh || timeSinceLastNavigation > 5000) {
        console.log('Profile: Refreshing data after navigation');
        refresh();
        setShouldRefresh(false);
        setLastNavigationTime(now);
      }
    }, [shouldRefresh, refresh, lastNavigationTime])
  );

  // Debug logging for user data
  useEffect(() => {
    console.log('Profile: User data updated:', {
      full_name: me?.full_name,
      handle: me?.handle,
      location: me?.location,
      avatar_url: me?.avatar_url,
      loading
    });
  }, [me, loading]);

  useEffect(() => {
    // If no valid session, redirect to splash
    if (!user || !isSessionValid) {
      console.log('Profile: No valid session, redirecting to splash');
      router.replace('/splash');
    }
  }, [user, isSessionValid, router]);

  // If no valid session, show loading
  if (!user || !isSessionValid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

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
          source={{ uri: me?.avatar_url || dummyUser.profileImage }} 
          style={styles.profileHeaderImage} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        />
        <View style={styles.userInfo}>
          <View style={styles.userInfoTop}>
            <View style={styles.userInfoLeft}>
              <Text style={styles.userName}>
                {loading ? 'Loading...' : (me?.full_name ?? me?.handle ?? dummyUser.name)}
              </Text>
              <Text style={styles.userLocation}>
                {me?.location || `Points: ${me?.points || 0}`}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={async () => {
                  console.log('Profile: Manual refresh triggered');
                  setIsRefreshing(true);
                  await refresh();
                  setIsRefreshing(false);
                }}
                disabled={isRefreshing}
              >
                <Ionicons 
                  name={isRefreshing ? "refresh" : "refresh-outline"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => {
                  setShouldRefresh(true);
                  router.push('/settings');
                }}
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
          </View>

      {/* Performance Preview */}
      <PerformancePreview />

      {/* Buckets Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => {
          console.log('Navigating to /buckets');
          router.push('/buckets');
        }}>
          <Text style={styles.sectionTitle}>Buckets</Text>
          <View style={styles.sectionHeaderRight}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
          </View>
        </TouchableOpacity>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bucketsContainer}
        >
          {dummyUser.buckets.slice(0, 6).map((bucket) => (
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

      {/* All Challenges Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={handleAllChallenges}>
          <Text style={styles.sectionTitle}>All Challenges</Text>
          <View style={styles.sectionHeaderRight}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
          </View>
        </TouchableOpacity>
        
        {/* Challenges Preview Grid */}
        <View style={styles.challengesGrid}>
          {allChallenges.slice(0, 10).map((challenge) => (
            <TouchableOpacity key={challenge.id} style={styles.challengePreviewCard}>
              <View style={styles.challengePreviewHeader}>
                <View style={styles.challengeBucketInfo}>
                  <Text style={styles.challengeBucketEmoji}>{challenge.bucket.emoji}</Text>
                  <Text style={styles.challengeBucketName}>{challenge.bucket.name}</Text>
                </View>
                <View style={[styles.urgencyBadge, { backgroundColor: challenge.urgencyColor }]}>
                  <Text style={styles.urgencyText}>{challenge.urgency}</Text>
                </View>
              </View>
              <Text style={styles.challengePreviewTitle}>{challenge.title}</Text>
              <View style={styles.challengePreviewFooter}>
                <Text style={styles.challengeLocation}>📍 {challenge.location}</Text>
                <Text style={styles.dueDateText}>{challenge.dueDate}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={async () => {
            try {
              console.log('Profile: Starting sign out...');
              await signOut();
              console.log('Profile: Sign out completed');
            } catch (error) {
              console.error('Profile: Sign out error:', error);
            }
          }}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
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
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
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
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#9BA1A6',
    marginRight: 4,
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
  challengesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  challengePreviewCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  challengePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeBucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeBucketEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  challengeBucketName: {
    fontSize: 12,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  challengePreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  challengePreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeLocation: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  satisfactionText: {
    fontSize: 12,
    color: '#4ade80',
    marginLeft: 4,
    fontWeight: '600',
  },
  dueDateText: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  signOutContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
