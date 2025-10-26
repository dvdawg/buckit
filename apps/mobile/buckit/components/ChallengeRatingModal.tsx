import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface ChallengeRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  challenge: {
    id: string;
    title: string;
    is_completed?: boolean;
  } | null;
}

export default function ChallengeRatingModal({ 
  visible, 
  onClose, 
  onSuccess,
  challenge 
}: ChallengeRatingModalProps) {
  const [tempRating, setTempRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleRatingSubmit = async () => {
    if (tempRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!challenge) {
      Alert.alert('Error', 'No challenge selected for rating.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_item_satisfaction_rating', {
        p_item_id: challenge.id,
        p_satisfaction_rating: tempRating,
        p_is_completed: true
      });

      if (error) {
        console.error('Error updating challenge rating:', error);
        Alert.alert('Error', `Failed to save rating: ${error.message}`);
        return;
      }

      setTempRating(0);
      onClose();
      onSuccess?.();
      Alert.alert('Success', 'Challenge completed!');
    } catch (error) {
      console.error('Error in rating submission:', error);
      Alert.alert('Error', 'Failed to complete challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRatingCancel = () => {
    setTempRating(0);
    onClose();
  };

  const handleUncomplete = async () => {
    if (!challenge) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({ is_completed: false })
        .eq('id', challenge.id);

      if (error) {
        console.error('Error uncompleting challenge:', error);
        Alert.alert('Error', 'Failed to uncomplete challenge');
        return;
      }

      onClose();
      onSuccess?.();
      Alert.alert('Success', 'Challenge marked as incomplete');
    } catch (error) {
      console.error('Error in handleUncomplete:', error);
      Alert.alert('Error', 'Failed to update challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!challenge) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRatingCancel}
    >
      <View style={styles.ratingModalOverlay}>
        <View style={styles.ratingModalContainer}>
          <View style={styles.ratingModalHeader}>
            <Text style={styles.ratingModalTitle}>
              {challenge.is_completed ? 'Uncomplete Challenge' : 'Rate Your Experience'}
            </Text>
            <Text style={styles.ratingModalSubtitle}>
              {challenge.is_completed 
                ? `Are you sure you want to mark "${challenge.title}" as incomplete?`
                : `How satisfied were you with "${challenge.title}"?`
              }
            </Text>
          </View>

          {!challenge.is_completed && (
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setTempRating(star)}
                  style={styles.starButton}
                  disabled={loading}
                >
                  <Ionicons 
                    name={star <= tempRating ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= tempRating ? "#8EC5FC" : "#9BA1A6"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.ratingModalActions}>
            <TouchableOpacity 
              style={styles.ratingCancelButton} 
              onPress={handleRatingCancel}
              disabled={loading}
            >
              <Text style={styles.ratingCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.ratingSubmitButton, loading && styles.ratingSubmitButtonDisabled]} 
              onPress={challenge.is_completed ? handleUncomplete : handleRatingSubmit}
              disabled={loading || (!challenge.is_completed && tempRating === 0)}
            >
              <Text style={styles.ratingSubmitButtonText}>
                {loading ? 'Processing...' : (challenge.is_completed ? 'Uncomplete' : 'Submit Rating')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ratingModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  ratingModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  ratingCancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingCancelButtonText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSubmitButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  ratingSubmitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
