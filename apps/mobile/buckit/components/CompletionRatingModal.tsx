import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CompletionRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onRate: (rating: number, reviewText?: string) => void;
  currentRating?: number;
  currentReview?: string;
  completedByName?: string;
  loading?: boolean;
}

export default function CompletionRatingModal({
  visible,
  onClose,
  onRate,
  currentRating = 0,
  currentReview = '',
  completedByName,
  loading = false,
}: CompletionRatingModalProps) {
  const [rating, setRating] = useState(currentRating);
  const [reviewText, setReviewText] = useState(currentReview);

  const handleRate = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }
    onRate(rating, reviewText.trim() || undefined);
  };

  const handleClose = () => {
    setRating(currentRating);
    setReviewText(currentReview);
    onClose();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starNumber = index + 1;
      return (
        <TouchableOpacity
          key={index}
          style={styles.starButton}
          onPress={() => setRating(starNumber)}
          disabled={loading}
        >
          <Ionicons
            name={starNumber <= rating ? 'star' : 'star-outline'}
            size={32}
            color={starNumber <= rating ? '#FFD700' : '#6B7280'}
          />
        </TouchableOpacity>
      );
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Rate Completion</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#9BA1A6" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {completedByName && (
              <Text style={styles.completedBy}>
                Completed by {completedByName}
              </Text>
            )}

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How was this experience?</Text>
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
              <Text style={styles.ratingText}>
                {rating === 0 ? 'Tap a star to rate' : 
                 rating === 1 ? 'Poor' :
                 rating === 2 ? 'Fair' :
                 rating === 3 ? 'Good' :
                 rating === 4 ? 'Very Good' : 'Excellent'}
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Write a review (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your thoughts about this experience..."
                placeholderTextColor="#9BA1A6"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                maxLength={500}
                editable={!loading}
              />
              <Text style={styles.characterCount}>
                {reviewText.length}/500
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || loading) && styles.buttonDisabled
              ]}
              onPress={handleRate}
              disabled={rating === 0 || loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  completedBy: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 12,
  },
  reviewInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B7280',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
