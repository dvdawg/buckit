import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import Avatar from './Avatar';

interface Friend {
  id: string;
  full_name: string;
  handle: string;
  avatar_url?: string;
  isSelected: boolean;
}

interface FriendsSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedFriends: Friend[]) => void;
  initialSelectedFriends?: Friend[];
  bucketId?: string; // For editing existing bucket
}

export default function FriendsSelectionModal({
  visible,
  onClose,
  onConfirm,
  initialSelectedFriends = [],
  bucketId,
}: FriendsSelectionModalProps) {
  const { user } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>(initialSelectedFriends);

  useEffect(() => {
    if (visible) {
      fetchFriends();
      setSelectedFriends(initialSelectedFriends);
    }
  }, [visible, initialSelectedFriends]);

  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's friends
      const { data: friendsData, error } = await supabase.rpc('get_friends');

      if (error) {
        console.error('Error fetching friends:', error);
        Alert.alert('Error', 'Failed to load friends list');
        return;
      }

      // Transform the data and mark selected friends
      const friendsList = (friendsData || []).map((friend: any) => ({
        id: friend.id,
        full_name: friend.full_name,
        handle: friend.handle,
        avatar_url: friend.avatar_url,
        isSelected: initialSelectedFriends.some(selected => selected.id === friend.id)
      }));

      setFriends(friendsList);
    } catch (error) {
      console.error('Unexpected error fetching friends:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friend: Friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) {
        return prev.filter(f => f.id !== friend.id);
      } else {
        return [...prev, { ...friend, isSelected: true }];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedFriends);
    onClose();
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.some(f => f.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => toggleFriend(item)}
      >
        <View style={styles.friendInfo}>
          <View style={styles.avatarContainer}>
            <Avatar user={item} size="medium" />
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.full_name}</Text>
            <Text style={styles.friendHandle}>@{item.handle}</Text>
          </View>
        </View>
        <View style={[styles.selectionIndicator, isSelected && styles.selectionIndicatorSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invite Collaborators</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8EC5FC" />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Select friends to collaborate on this bucket
                </Text>
                <FlatList
                  data={friends}
                  renderItem={renderFriendItem}
                  keyExtractor={(item) => item.id}
                  style={styles.friendsList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people-outline" size={48} color="#6B7280" />
                      <Text style={styles.emptyText}>No friends found</Text>
                      <Text style={styles.emptySubtext}>
                        Add friends first to invite them as collaborators
                      </Text>
                    </View>
                  }
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8EC5FC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
    borderColor: '#8EC5FC',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  friendDetails: {
    flex: 1,
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
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorSelected: {
    backgroundColor: '#8EC5FC',
    borderColor: '#8EC5FC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
