import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';
import Avatar from '@/components/Avatar';

const dummyFriends = [
  {
    id: '1',
    username: 'alex_adventures',
    fullName: 'Alex Johnson',
    avatar: 'https:
    location: 'San Francisco, CA',
    isInvited: false,
  },
  {
    id: '2',
    username: 'sarah_explorer',
    fullName: 'Sarah Chen',
    avatar: 'https:
    location: 'Berkeley, CA',
    isInvited: false,
  },
  {
    id: '3',
    username: 'mike_fitness',
    fullName: 'Mike Rodriguez',
    avatar: 'https:
    location: 'Oakland, CA',
    isInvited: false,
  },
  {
    id: '4',
    username: 'emma_travels',
    fullName: 'Emma Wilson',
    avatar: 'https:
    location: 'Palo Alto, CA',
    isInvited: false,
  },
  {
    id: '5',
    username: 'david_foodie',
    fullName: 'David Kim',
    avatar: 'https:
    location: 'San Jose, CA',
    isInvited: false,
  },
];

interface Friend {
  id: string;
  full_name: string;
  handle: string;
  avatar_url?: string;
  isInvited: boolean;
}

export default function InviteFriendsScreen() {
  const router = useRouter();
  const { bucketId } = useLocalSearchParams();
  const { user } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: friendsData, error } = await supabase.rpc('get_friends');

      if (error) {
        console.error('Error fetching friends:', error);
        Alert.alert('Error', 'Failed to load friends list');
        return;
      }

      const friendsList = (friendsData || []).map((friend: any) => ({
        id: friend.id,
        full_name: friend.full_name,
        handle: friend.handle,
        avatar_url: friend.avatar_url,
        isInvited: false
      }));

      setFriends(friendsList);
    } catch (error) {
      console.error('Unexpected error fetching friends:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!bucketId) {
      Alert.alert('Error', 'No bucket specified');
      return;
    }

    try {
      const { error } = await supabase.rpc('add_bucket_collaborator', {
        p_bucket_id: bucketId,
        p_user_id: friendId
      });

      if (error) {
        console.error('Error adding collaborator:', error);
        Alert.alert('Error', 'Failed to add friend as collaborator');
        return;
      }

      setInvitedFriends(prev => [...prev, friendId]);
      const friend = friends.find(f => f.id === friendId);
      Alert.alert('Collaborator Added', `${friend?.full_name} is now a collaborator on this bucket!`);
    } catch (error) {
      console.error('Unexpected error inviting friend:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleSendAllInvites = () => {
    if (invitedFriends.length === 0) {
      Alert.alert('No Friends Selected', 'Please select friends to invite first.');
      return;
    }
    
    Alert.alert(
      'Collaborators Added', 
      `Added ${invitedFriends.length} collaborator${invitedFriends.length !== 1 ? 's' : ''} to your bucket!`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        }
      ]
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isInvited = invitedFriends.includes(item.id);
    
    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <View style={styles.avatarContainer}>
            <Avatar user={item} size="medium" />
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.username}>@{item.handle}</Text>
            <Text style={styles.fullName}>{item.full_name}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.inviteButton,
            isInvited && styles.inviteButtonSent
          ]}
          onPress={() => handleInviteFriend(item.id)}
          disabled={isInvited}
        >
          <LinearGradient
            colors={isInvited ? ['#374151', '#4B5563'] : ['#8EC5FC', '#E0C3FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteButtonGradient}
          >
            <Ionicons 
              name={isInvited ? "checkmark" : "person-add"} 
              size={16} 
              color={isInvited ? "#9BA1A6" : "#000"} 
            />
            <Text style={[
              styles.inviteButtonText,
              isInvited && styles.inviteButtonTextSent
            ]}>
              {isInvited ? 'Invited' : 'Invite'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      {}
      <View style={styles.bucketInfoCard}>
        <View style={styles.bucketIcon}>
          <Ionicons name="folder" size={24} color="#8EC5FC" />
        </View>
        <View style={styles.bucketDetails}>
          <Text style={styles.bucketName}>Jits Bucket</Text>
          <Text style={styles.bucketDescription}>
            Invite friends to join your adventure bucket and explore together!
          </Text>
        </View>
      </View>

      {}
      <View style={styles.friendsContainer}>
        <Text style={styles.friendsTitle}>Your Friends</Text>
        <Text style={styles.friendsSubtitle}>
          {invitedFriends.length} of {friends.length} friends invited
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8EC5FC" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.friendsList}
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
        )}
      </View>

      {}
      {invitedFriends.length > 0 && (
        <View style={styles.sendInvitesContainer}>
          <TouchableOpacity style={styles.sendInvitesButton} onPress={handleSendAllInvites}>
            <LinearGradient
              colors={['#8EC5FC', '#E0C3FC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendInvitesGradient}
            >
              <Ionicons name="send" size={20} color="#000" />
              <Text style={styles.sendInvitesText}>
                Send {invitedFriends.length} Invitation{invitedFriends.length !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
  bucketInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bucketIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  bucketDetails: {
    flex: 1,
  },
  bucketName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bucketDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    lineHeight: 20,
  },
  friendsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  friendsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  friendsSubtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 16,
  },
  friendsList: {
    paddingBottom: 20,
  },
  friendCard: {
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
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  friendDetails: {
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
  },
  inviteButton: {
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
  inviteButtonSent: {
    shadowOpacity: 0,
    elevation: 0,
  },
  inviteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inviteButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  inviteButtonTextSent: {
    color: '#9BA1A6',
  },
  sendInvitesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sendInvitesButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendInvitesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  sendInvitesText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
