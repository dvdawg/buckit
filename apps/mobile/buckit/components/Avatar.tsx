import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AvatarProps {
  user: {
    avatar_url?: string | null;
    full_name?: string | null;
    handle?: string | null;
  };
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: any;
}

const sizeMap = {
  small: 32,
  medium: 50,
  large: 80,
  xlarge: 120,
};

export default function Avatar({ user, size = 'medium', style }: AvatarProps) {
  const avatarSize = sizeMap[size];
  const hasAvatar = user.avatar_url && user.avatar_url.trim() !== '';
  
  // Get initials from full_name or handle
  const getInitials = () => {
    if (user.full_name) {
      const names = user.full_name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user.handle) {
      return user.handle[0].toUpperCase();
    }
    return '?';
  };

  const getBackgroundColor = () => {
    // Generate a consistent color based on the user's name/handle
    const name = user.full_name || user.handle || 'default';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate a color from the hash
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  if (hasAvatar) {
    return (
      <Image
        source={{ uri: user.avatar_url! }}
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.defaultAvatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: getBackgroundColor(),
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: avatarSize * 0.4,
          },
        ]}
      >
        {getInitials()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    resizeMode: 'cover',
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6B7280',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
