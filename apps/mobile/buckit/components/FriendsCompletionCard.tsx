import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FriendsCompletion } from '@/hooks/useFriendsFeed';
import Avatar from './Avatar';

interface FriendsCompletionCardProps {
  completion: FriendsCompletion;
  onPress?: () => void;
}

export default function FriendsCompletionCard({ completion, onPress }: FriendsCompletionCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={12}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      {}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Avatar 
              user={{
                avatar_url: completion.completed_by_avatar,
                full_name: completion.completed_by_name,
                handle: null
              }}
              size="small"
            />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{completion.completed_by_name}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(completion.completed_at)}</Text>
          </View>
        </View>
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketEmoji}>{completion.bucket_emoji}</Text>
          <Text style={styles.bucketTitle} numberOfLines={1}>{completion.bucket_title}</Text>
        </View>
      </View>

      {}
      <Text style={styles.challengeTitle}>{completion.item_title}</Text>
      
      {}
      {completion.item_description && (
        <Text style={styles.challengeDescription} numberOfLines={2}>
          {completion.item_description}
        </Text>
      )}

      {}
      {completion.item_location_name && (
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#A0A0A0" />
          <Text style={styles.locationText}>{completion.item_location_name}</Text>
        </View>
      )}

      {}
      {completion.completion_photo_url && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: completion.completion_photo_url }} style={styles.completionPhoto} />
        </View>
      )}

      {}
      {completion.completion_caption && (
        <Text style={styles.caption}>{completion.completion_caption}</Text>
      )}

      {}
      {renderStars(completion.satisfaction_rating)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
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
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  timeAgo: {
    fontSize: 12,
    color: '#A0A0A0',
    fontFamily: 'Poppins',
    marginTop: 2,
  },
  bucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bucketEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  bucketTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    maxWidth: 80,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    fontFamily: 'Poppins',
    lineHeight: 20,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontFamily: 'Poppins',
    marginLeft: 4,
  },
  photoContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completionPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  caption: {
    fontSize: 14,
    color: '#CCCCCC',
    fontFamily: 'Poppins',
    lineHeight: 20,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});
