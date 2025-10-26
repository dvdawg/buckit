import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFriends, Friend } from '@/hooks/useFriends';
import Avatar from '@/components/Avatar';

export default function FriendsListScreen() {
  const router = useRouter();
  const { friends, loading, fetchFriends } = useFriends();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFriends();
    setRefreshing(false);
  };

  const handleFriendPress = (friend: Friend) => {
    router.push(`/user-profile/${friend.handle}`);
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
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
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        )}

        {!loading && friends.length > 0 && (
          <View style={styles.friendsList}>
            {friends.map((friend, index) => (
              <TouchableOpacity 
                key={`${friend.id}-${index}`} 
                style={styles.friendCard}
                onPress={() => handleFriendPress(friend)}
              >
                <Avatar user={friend} size="medium" />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.full_name || friend.handle}</Text>
                  <Text style={styles.friendHandle}>@{friend.handle}</Text>
                  <View style={styles.friendStatus}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.friendStatusText}>Friends</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && friends.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Friends Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by searching for friends and sending friend requests
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
  friendsList: {
    paddingBottom: 20,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 16,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  friendHandle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 2,
  },
  friendStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  friendStatusText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
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
