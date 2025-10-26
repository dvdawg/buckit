import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserSearch, useFriends, UserSearchResult } from '@/hooks/useFriends';
import Avatar from '@/components/Avatar';

export default function AddFriendsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, string>>({});
  const { searchResults, loading, searchUsers } = useUserSearch();
  const { sendFriendRequest } = useFriends();

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, searchUsers]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setFriendshipStatuses(prev => ({
        ...prev,
        [userId]: 'pending'
      }));
      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send friend request');
    }
  };

  const handleViewProfile = (user: UserSearchResult) => {
    router.push(`/user-profile/${user.handle}`);
  };

  const handleSearchPress = () => {
    router.push('/search-users');
  };

  const getActionButton = (user: UserSearchResult) => {
    const status = friendshipStatuses[user.id] || user.friendship_status;

    switch (status) {
      case 'accepted':
        return (
          <TouchableOpacity style={[styles.addButton, styles.friendsButton]}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={[styles.addButtonText, styles.friendsButtonText]}>Friends</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      case 'pending':
        return (
          <TouchableOpacity style={[styles.addButton, styles.pendingButton]}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={[styles.addButtonText, styles.pendingButtonText]}>Pending</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      default:
        return (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={(e) => {
              e.stopPropagation();
              handleSendFriendRequest(user.id);
            }}
          >
            <LinearGradient
              colors={['#8EC5FC', '#E0C3FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButtonGradient}
            >
              <Ionicons name="person-add" size={16} color="#000" />
              <Text style={styles.addButtonText}>Add Friend</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item }: { item: UserSearchResult }) => {
    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => handleViewProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <Avatar user={item} size="medium" />
          <View style={styles.userDetails}>
            <Text style={styles.username}>@{item.handle}</Text>
            <Text style={styles.fullName}>{item.full_name || item.handle}</Text>
            <Text style={styles.location}>⭐ {item.points} points</Text>
          </View>
        </View>
        {getActionButton(item)}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9BA1A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name..."
            placeholderTextColor="#9BA1A6"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearchPress}
        >
          <Ionicons name="arrow-forward" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {searchQuery ? `Search Results (${searchResults.length})` : 'Find Friends'}
        </Text>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8EC5FC" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {!loading && searchQuery.trim() && searchResults.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with a different username or name
            </Text>
          </View>
        )}

        {!loading && searchQuery.trim() && searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        )}

        {!searchQuery.trim() && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>Find Friends</Text>
            <Text style={styles.emptySubtitle}>
              Search for friends by their username or name
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchButton: {
    backgroundColor: '#8EC5FC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  resultsList: {
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
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
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8EC5FC',
    marginBottom: 2,
  },
  fullName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  location: {
    fontSize: 12,
    color: '#9BA1A6',
    marginBottom: 2,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '500',
  },
  addButton: {
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
  addButtonSent: {
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  addButtonTextSent: {
    color: '#9BA1A6',
  },
  friendsButton: {
    shadowColor: '#10B981',
  },
  pendingButton: {
    shadowColor: '#F59E0B',
  },
  friendsButtonText: {
    color: '#fff',
  },
  pendingButtonText: {
    color: '#fff',
  },
});
