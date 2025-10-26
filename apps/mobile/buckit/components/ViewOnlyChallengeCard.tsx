import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ViewOnlyChallengeCardProps {
  challenge: {
    id: string;
    title: string;
    description: string;
    location?: string;
    location_name?: string;
    completed: boolean;
    satisfaction?: number;
  };
  onPress: () => void;
}

export default function ViewOnlyChallengeCard({ challenge, onPress }: ViewOnlyChallengeCardProps) {
  return (
    <TouchableOpacity
      style={styles.challengeCard}
      onPress={onPress}
    >
      {/* Completion Status - View Only */}
      <View style={styles.challengeIcon}>
        {challenge.is_completed ? (
          <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
        ) : (
          <Ionicons name="ellipse-outline" size={24} color="#6B7280" />
        )}
      </View>
      
      {/* View Only Indicator */}
      <View style={styles.viewOnlyIndicator}>
        <Ionicons name="eye" size={12} color="#6B7280" />
      </View>
      
      {/* Challenge Info */}
      <View style={styles.challengeInfo}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <Text style={styles.challengeDescription}>{challenge.description}</Text>
        <View style={styles.challengeLocation}>
          <Text style={styles.locationPin}>📍</Text>
          <Text style={styles.locationText}>
            {challenge.location_name || challenge.location || 'No location set'}
          </Text>
        </View>
        {challenge.is_completed && challenge.satisfaction_rating && (
          <View style={styles.satisfactionRating}>
            <Text style={styles.satisfactionText}>
              {challenge.satisfaction_rating} star{challenge.satisfaction_rating !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  challengeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  viewOnlyIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 4,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 8,
    lineHeight: 20,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  satisfactionRating: {
    marginTop: 4,
  },
  satisfactionText: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
});
