import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserSearch, useFriends } from '@/hooks/useFriends';
import { useBuckets } from '@/hooks/useBuckets';

const { width } = Dimensions.get('window');

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getUserByHandle } = useUserSearch();
  const { sendFriendRequest, unfriend, getFriendshipStatus } = useFriends();
  const { fetchUserBuckets } = useBuckets();
  
  const [user, setUser] = useState<any>(null);
  const [userBuckets, setUserBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucketsLoading, setBucketsLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string>('none');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      // For now, we'll use the id as handle - in a real app you'd have a proper user lookup
      const userData = await getUserByHandle(id as string);
      if (userData) {
        setUser(userData);
        setFriendshipStatus(userData.friendship_status);
        
        // Fetch the user's buckets
        await loadUserBuckets(userData.id);
      } else {
        Alert.alert('Error', 'User not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadUserBuckets = async (userId: string) => {
    try {
      setBucketsLoading(true);
      console.log('Loading buckets for user:', userId);
      const buckets = await fetchUserBuckets(userId);
      console.log('Loaded user buckets:', buckets);
      setUserBuckets(buckets);
    } catch (error) {
      console.error('Error loading user buckets:', error);
      setUserBuckets([]);
    } finally {
      setBucketsLoading(false);
    }
  };

  const handleFriendAction = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      console.log('Friend action triggered, status:', friendshipStatus, 'user:', user.id);
      
      if (friendshipStatus === 'accepted') {
        console.log('Attempting to unfriend user:', user.id);
        await unfriend(user.id);
        setFriendshipStatus('none');
        Alert.alert('Success', 'Removed from friends');
      } else if (friendshipStatus === 'none' || friendshipStatus === 'declined') {
        console.log('Attempting to send friend request to:', user.id);
        await sendFriendRequest(user.id);
        setFriendshipStatus('pending');
        Alert.alert('Success', 'Friend request sent!');
      }
    } catch (error) {
      console.error('Friend action error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  };

  const getActionButton = () => {
    switch (friendshipStatus) {
      case 'accepted':
        return (
          <TouchableOpacity 
            style={styles.unfriendButton}
            onPress={handleFriendAction}
            disabled={actionLoading}
          >
            <View style={styles.actionButton}>
              <Ionicons name="person-remove" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Unfriend</Text>
            </View>
          </TouchableOpacity>
        );
      case 'pending':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.pendingButton]} disabled>
            <Ionicons name="time" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Pending</Text>
          </TouchableOpacity>
        );
      case 'declined':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={handleFriendAction}
            disabled={actionLoading}
          >
            <Ionicons name="person-add" size={16} color="#000" />
            <Text style={[styles.actionButtonText, styles.addButtonText]}>Add Friend</Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={handleFriendAction}
            disabled={actionLoading}
          >
            <Ionicons name="person-add" size={16} color="#000" />
            <Text style={[styles.actionButtonText, styles.addButtonText]}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8EC5FC" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="#6B7280" />
        <Text style={styles.errorTitle}>User Not Found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show user's buckets based on friendship status and visibility
  const visibleBuckets = userBuckets.filter(bucket => {
    // Always show public buckets
    if (bucket.visibility === 'public') return true;
    
    // Show private buckets if we're friends
    if (bucket.visibility === 'private' && friendshipStatus === 'accepted') return true;
    
    // Don't show private buckets unless it's the current user (which shouldn't happen in this view)
    return false;
  });

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerContainer}>
        <Image 
          source={{ 
            uri: user.avatar_url || 'https://via.placeholder.com/300x200/6B7280/FFFFFF?text=Profile'
          }} 
          style={styles.profileHeaderImage} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        />
        <View style={styles.userInfo}>
          <View style={styles.userInfoTop}>
            <View style={styles.userInfoLeft}>
              <Text style={styles.userName}>{user.full_name || user.handle}</Text>
              <Text style={styles.userHandle}>@{user.handle}</Text>
              <Text style={styles.userLocation}>
                {user.location || `${user.points} points`}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              {getActionButton()}
            </View>
          </View>
        </View>
      </View>

      {/* Header with back button */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {friendshipStatus === 'accepted' ? 'Buckets' : 'Shared Buckets'}
          </Text>
          {bucketsLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color="#8EC5FC" />
              <Text style={styles.loadingText}>Loading buckets...</Text>
            </View>
          ) : visibleBuckets.length > 0 ? (
            <View style={styles.bucketsGrid}>
              {visibleBuckets.map((bucket) => (
                <TouchableOpacity 
                  key={bucket.id} 
                  style={styles.bucketCard}
                  onPress={() => router.push(`/buckets/${bucket.id}`)}
                >
                  <Image
                    source={{ uri: bucket.cover_url || 'https://via.placeholder.com/150x100/6B7280/FFFFFF?text=Bucket' }}
                    style={styles.bucketImage}
                  />
                  <View style={styles.bucketInfo}>
                    <Text style={styles.bucketTitle} numberOfLines={1}>
                      {bucket.title}
                    </Text>
                    <Text style={styles.bucketDescription} numberOfLines={2}>
                      {bucket.description || 'No description'}
                    </Text>
                    <View style={styles.bucketMeta}>
                      <View style={styles.bucketVisibility}>
                        <Ionicons 
                          name={bucket.visibility === 'public' ? 'globe' : 'people'} 
                          size={12} 
                          color="#6B7280" 
                        />
                        <Text style={styles.bucketVisibilityText}>
                          {bucket.visibility === 'public' ? 'Public' : 'Private'}
                        </Text>
                      </View>
                      {bucket.is_collaborator && (
                        <View style={styles.collaborationIndicator}>
                          <Ionicons name="people" size={12} color="#8EC5FC" />
                          <Text style={styles.collaborationText}>Collaborating</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {friendshipStatus === 'accepted' ? 'No buckets yet' : 'Add this friend to see their buckets'}
              </Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#9BA1A6',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
  },
  topHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
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
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: '#9BA1A6',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#9BA1A6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
    gap: 6,
  },
  addButton: {
    backgroundColor: '#8EC5FC',
  },
  pendingButton: {
    backgroundColor: '#F59E0B',
  },
  unfriendButton: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addButtonText: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
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
  bucketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bucketCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bucketImage: {
    width: '100%',
    height: 100,
  },
  bucketInfo: {
    padding: 12,
  },
  bucketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bucketDescription: {
    fontSize: 12,
    color: '#9BA1A6',
    lineHeight: 16,
    marginBottom: 4,
  },
  bucketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bucketVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bucketVisibilityText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  collaborationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  collaborationText: {
    fontSize: 8,
    color: '#8EC5FC',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  friendRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  friendRequestButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: '#9BA1A6',
    fontSize: 14,
    marginLeft: 8,
  },
});
