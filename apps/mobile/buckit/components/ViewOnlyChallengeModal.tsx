import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface ViewOnlyChallengeModalProps {
  visible: boolean;
  challenge: {
    id: string;
    title: string;
    description: string;
    location?: string;
    location_name?: string;
    targetDate?: string;
    completed: boolean;
    satisfaction?: number;
  } | null;
  bucketTitle?: string;
  onClose: () => void;
}

export default function ViewOnlyChallengeModal({
  visible,
  challenge,
  bucketTitle,
  onClose,
}: ViewOnlyChallengeModalProps) {
  if (!challenge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {challenge && (
                <>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{challenge.title}</Text>
                    <View style={styles.modalCompletionBadge}>
                      {challenge.completed ? (
                        <>
                          <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                          <Text style={styles.modalCompletionText}>Completed</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="ellipse-outline" size={14} color="#9BA1A6" />
                          <Text style={styles.modalCompletionTextIncomplete}>Not Completed</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalSeparator} />

                  {/* Details */}
                  <View style={styles.modalDetailsSection}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>🪣</Text>
                      <Text style={styles.modalDetailText}>{bucketTitle || 'Unknown Bucket'}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📍</Text>
                      <Text style={styles.modalDetailText}>
                        {challenge.location_name || challenge.location || 'No location set'}
                      </Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📅</Text>
                      <Text style={styles.modalDetailText}>
                        {challenge.targetDate ? `Target: ${new Date(challenge.targetDate).toLocaleDateString()}` : 'No target date set'}
                      </Text>
                    </View>
                    {challenge.completed && challenge.satisfaction && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalLocationPin}>⭐</Text>
                        <Text style={styles.modalDetailText}>
                          Rated {challenge.satisfaction} star{challenge.satisfaction !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalSeparator} />

                  {/* Description */}
                  <View style={styles.modalDescriptionSection}>
                    <Text style={styles.modalDescriptionTitle}>Challenge Description</Text>
                    <Text style={styles.modalDescriptionText}>
                      {challenge.description || 'No description provided'}
                    </Text>
                  </View>

                  <View style={styles.modalSeparator} />

                  {/* Photos Section - View Only */}
                  <View style={styles.modalPhotosSection}>
                    <Text style={styles.modalPhotosTitle}>Photos</Text>
                    <View style={styles.modalPhotoGrid}>
                      <View style={styles.noPhotosContainer}>
                        <Ionicons name="camera-outline" size={40} color="#6B7280" />
                        <Text style={styles.noPhotosText}>No photos available</Text>
                        <Text style={styles.noPhotosSubtext}>Photos are only visible to bucket collaborators</Text>
                      </View>
                    </View>
                  </View>

                  {/* Extra spacing at bottom */}
                  <View style={{ height: 20 }} />
                </>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
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
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.85,
    minHeight: height * 0.4,
    backgroundColor: 'rgba(31, 41, 55, 0.98)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    flex: 1,
    padding: 24,
    paddingBottom: 80, // Extra space for close button
  },
  modalHeader: {
    marginBottom: 20,
    paddingRight: 60, // Add space for close button
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 32,
  },
  modalCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  modalCompletionText: {
    fontSize: 12,
    color: '#4ade80',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalCompletionTextIncomplete: {
    fontSize: 12,
    color: '#9BA1A6',
    marginLeft: 4,
    fontWeight: '600',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  modalDetailsSection: {
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalLocationPin: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  modalDetailText: {
    fontSize: 16,
    color: '#B0B0B0',
    flex: 1,
  },
  modalDescriptionSection: {
    marginBottom: 20,
  },
  modalDescriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalDescriptionText: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 24,
    minHeight: 60, // Ensure minimum height for description
  },
  modalPhotosSection: {
    marginBottom: 20,
  },
  modalPhotosTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalPhotoGrid: {
    minHeight: 140,
    justifyContent: 'center',
  },
  noPhotosContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '600',
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});
