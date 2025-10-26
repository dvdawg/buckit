import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFriends, FriendRequest } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';

export default function FriendRequestsScreen() {
  const router = useRouter();
  const { 
    friendRequests, 
    loading, 
    fetchFriendRequests, 
    acceptFriendRequest, 
    rejectFriendRequest 
  } = useFriends();
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const { data: userId, error } = await supabase.rpc('me_user_id');
        if (error) {
          console.error('Error getting current user ID:', error);
        } else {
          setCurrentUserId(userId);
        }
      } catch (err) {
        console.error('Error in getCurrentUserId:', err);
      }
    };
    
    getCurrentUserId();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFriendRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (userId: string) => {
    try {
      console.log('Accepting friend request from user:', userId);
      console.log('Current user ID:', currentUserId);
      await acceptFriendRequest(userId);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (userId: string) => {
    try {
      await rejectFriendRequest(userId);
      Alert.alert('Success', 'Friend request rejected');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reject friend request');
    }
  };

  const getRequestInfo = (request: FriendRequest) => {
    if (!currentUserId) {
      return {
        isIncoming: false,
        user: request.user_info,
        status: request.status,
      };
    }
    
    // The database function returns requests where current user is either sender or receiver
    // user_info is always the sender (user_id), friend_info is always the receiver (friend_id)
    // If friend_id matches current user, it's incoming (someone sent it TO me)
    // If user_id matches current user, it's outgoing (I sent it TO someone)
    const isIncoming = request.friend_id === currentUserId;
    
    return {
      isIncoming,
      user: isIncoming ? request.user_info : request.friend_info,
      status: request.status,
    };
  };

  // Filter requests where I am the recipient (incoming requests)
  const incomingRequests = friendRequests.filter(req => 
    currentUserId && req.friend_id === currentUserId && req.status === 'pending'
  );
  
  // Filter requests where I am the sender (outgoing requests)  
  const sentRequests = friendRequests.filter(req => 
    currentUserId && req.user_id === currentUserId && req.status === 'pending'
  );

  const renderRequestItem = (request: FriendRequest) => {
    const { isIncoming, user, status } = getRequestInfo(request);

    return (
      <View key={request.id} style={styles.requestCard}>
        <Avatar user={user} size="medium" />
        <View style={styles.requestInfo}>
          <Text style={styles.userName}>{user.full_name || user.handle}</Text>
          <Text style={styles.userHandle}>@{user.handle}</Text>
          <Text style={styles.requestStatus}>
            {isIncoming ? 'Wants to be friends' : 'Request sent'}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          {isIncoming && status === 'pending' ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptRequest(user.id)}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectRequest(user.id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>
                {status === 'pending' ? 'Pending' : status === 'accepted' ? 'Accepted' : 'Declined'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Requests</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8EC5FC"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8EC5FC" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        )}

        {/* Incoming Requests */}
        {incomingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incoming Requests</Text>
            {incomingRequests.map(renderRequestItem)}
          </View>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent Requests</Text>
            {sentRequests.map(renderRequestItem)}
          </View>
        )}

        {/* Empty State */}
        {!loading && incomingRequests.length === 0 && sentRequests.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Friend Requests</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any pending friend requests
            </Text>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => router.push('/search-users')}
            >
              <Ionicons name="search" size={20} color="#000" />
              <Text style={styles.searchButtonText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9BA1A6',
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  requestInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 4,
  },
  requestStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#9BA1A6',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
