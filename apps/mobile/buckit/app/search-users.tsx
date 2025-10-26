import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserSearch, useFriends } from '@/hooks/useFriends';
import Avatar from '@/components/Avatar';

const { width } = Dimensions.get('window');

export default function SearchUsersScreen() {
  const router = useRouter();
  const { searchResults, loading, searchUsers } = useUserSearch();
  const { sendFriendRequest, getFriendshipStatus } = useFriends();
  const [searchTerm, setSearchTerm] = useState('');
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, searchUsers]);

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      // Update friendship status
      setFriendshipStatuses(prev => ({
        ...prev,
        [userId]: 'pending'
      }));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send friend request');
    }
  };

  const handleUserPress = (user: any) => {
    router.push(`/user-profile/${user.handle}`);
  };

  const getActionButton = (user: any) => {
    const status = friendshipStatuses[user.id] || user.friendship_status;

    switch (status) {
      case 'accepted':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.friendsButton]}>
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <Text style={[styles.actionButtonText, styles.friendsButtonText]}>Friends</Text>
          </TouchableOpacity>
        );
      case 'pending':
        return (
          <TouchableOpacity style={[styles.actionButton, styles.pendingButton]}>
            <Ionicons name="time" size={16} color="#F59E0B" />
            <Text style={[styles.actionButtonText, styles.pendingButtonText]}>Pending</Text>
          </TouchableOpacity>
        );
      case 'declined':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => handleSendFriendRequest(user.id)}
          >
            <Ionicons name="person-add" size={16} color="#000" />
            <Text style={[styles.actionButtonText, styles.addButtonText]}>Add Friend</Text>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity 
            style={[styles.actionButton, styles.addButton]}
            onPress={() => handleSendFriendRequest(user.id)}
          >
            <Ionicons name="person-add" size={16} color="#000" />
            <Text style={[styles.actionButtonText, styles.addButtonText]}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9BA1A6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or name..."
          placeholderTextColor="#9BA1A6"
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoFocus
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchTerm('')}
          >
            <Ionicons name="close-circle" size={20} color="#9BA1A6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8EC5FC" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {!loading && searchTerm.trim() && searchResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with a different username or name
            </Text>
          </View>
        )}

        {!loading && searchTerm.trim() && searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((user) => (
              <TouchableOpacity 
                key={user.id} 
                style={styles.userCard}
                onPress={() => handleUserPress(user)}
              >
                <Avatar user={user} size="medium" />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.full_name || user.handle}</Text>
                  <Text style={styles.userHandle}>@{user.handle}</Text>
                  <Text style={styles.userPoints}>{user.points} points</Text>
                </View>
                {getActionButton(user)}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!searchTerm.trim() && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>Find Friends</Text>
            <Text style={styles.emptySubtitle}>
              Search for friends by their username or name
            </Text>
            <View style={styles.privacyNotice}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.privacyNoticeText}>
                Users control bucket sharing. Send a friend request to see their shared buckets.
              </Text>
            </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
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
    paddingHorizontal: 40,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    maxWidth: 300,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  resultsList: {
    paddingBottom: 20,
  },
  userCard: {
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
  userInfo: {
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
    marginBottom: 2,
  },
  userPoints: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButton: {
    backgroundColor: '#8EC5FC',
  },
  friendsButton: {
    backgroundColor: '#10B981',
  },
  pendingButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addButtonText: {
    color: '#000',
  },
  friendsButtonText: {
    color: '#fff',
  },
  pendingButtonText: {
    color: '#fff',
  },
});
