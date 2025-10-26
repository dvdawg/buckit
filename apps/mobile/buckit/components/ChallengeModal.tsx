import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '@/lib/supabase';
import LocationDisplay from '@/components/LocationDisplay';

const { width, height } = Dimensions.get('window');

interface ChallengeModalProps {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
}

export default function ChallengeModal({ visible, challengeId, onClose }: ChallengeModalProps) {
  const [challenge, setChallenge] = useState<any>(null);
  const [bucket, setBucket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);

  useEffect(() => {
    if (visible && challengeId) {
      fetchChallengeData();
    }
  }, [visible, challengeId]);

  const fetchChallengeData = async () => {
    if (!challengeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase
        .from('items')
        .select(`
          *,
          bucket: buckets!items_bucket_id_fkey (
            id,
            title,
            emoji,
            color
          )
        `)
        .eq('id', challengeId)
        .eq('owner_id', uid)
        .single();

      if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        Alert.alert('Error', 'Challenge not found');
        setLoading(false);
        return;
      }

      if (challengeData) {
        setChallenge(challengeData);
        setBucket(challengeData.bucket);
      }
    } catch (error) {
      console.error('Error in fetchChallengeData:', error);
      Alert.alert('Error', 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChallenge = () => {
    if (challenge?.is_completed) {
      Alert.alert(
        'Uncomplete Challenge',
        'Do you want to mark this challenge as incomplete?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Uncomplete', style: 'destructive', onPress: handleUncompleteChallenge }
        ]
      );
    } else {
      setRatingModalVisible(true);
    }
  };

  const handleUncompleteChallenge = async () => {
    if (!challenge) return;

    try {
      const { error } = await supabase
        .from('items')
        .update({ 
          is_completed: false,
          completed_at: null,
          satisfaction_rating: null
        })
        .eq('id', challenge.id);

      if (error) {
        console.error('Error uncompleting challenge:', error);
        Alert.alert('Error', 'Failed to uncomplete challenge');
      } else {
        setChallenge({ ...challenge, is_completed: false, completed_at: null, satisfaction_rating: null });
      }
    } catch (error) {
      console.error('Error in handleUncompleteChallenge:', error);
      Alert.alert('Error', 'Failed to uncomplete challenge');
    }
  };

  const handleRatingSubmit = async () => {
    if (!challenge || tempRating === 0) return;

    try {
      const { error } = await supabase
        .from('items')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString(),
          satisfaction_rating: tempRating
        })
        .eq('id', challenge.id);

      if (error) {
        console.error('Error completing challenge:', error);
        Alert.alert('Error', 'Failed to complete challenge');
      } else {
        setChallenge({ 
          ...challenge, 
          is_completed: true, 
          completed_at: new Date().toISOString(), 
          satisfaction_rating: tempRating 
        });
        setRatingModalVisible(false);
        setTempRating(0);
      }
    } catch (error) {
      console.error('Error in handleRatingSubmit:', error);
      Alert.alert('Error', 'Failed to complete challenge');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.modalContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8EC5FC" />
              <Text style={styles.loadingText}>Loading challenge...</Text>
            </View>
          ) : challenge ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.locationPin}>🪣</Text>
                  <Text style={styles.detailText}>{bucket?.title || 'Unknown Bucket'}</Text>
                </View>
                <View style={[styles.detailRow, styles.completionRow]}>
                  <View style={styles.completionInfo}>
                    <Ionicons name="flag" size={16} color="#4ade80" />
                    <Text style={[styles.detailText, { color: challenge.is_completed ? '#4ade80' : '#8EC5FC' }]}>
                      {challenge.is_completed ? 'Completed' : 'In Progress'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.completionButton}
                    onPress={handleCompleteChallenge}
                  >
                    {challenge.is_completed ? (
                      <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <LocationDisplay
                    location={challenge.location_name ? {
                      name: challenge.location_name,
                      coordinates: challenge.location_point ? {
                        latitude: challenge.location_point.latitude || 0,
                        longitude: challenge.location_point.longitude || 0,
                      } : { latitude: 0, longitude: 0 },
                    } : null}
                  />
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#8EC5FC" />
                  <Text style={styles.detailText}>
                    {challenge.deadline ? `Due: ${new Date(challenge.deadline).toLocaleDateString()}` : 'None yet!'}
                  </Text>
                </View>
              </View>

              {}
              {challenge.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{challenge.description}</Text>
                </View>
              )}

              {}
              {challenge.is_completed && challenge.satisfaction_rating && (
                <View style={styles.completionInfo}>
                  <Text style={styles.completionTitle}>Satisfaction Rating</Text>
                  <View style={styles.ratingDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= challenge.satisfaction_rating ? "star" : "star-outline"}
                        size={20}
                        color="#8EC5FC"
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={64} color="#8EC5FC" />
              <Text style={styles.errorTitle}>Challenge Not Found</Text>
              <Text style={styles.errorText}>This challenge could not be found or you don't have access to it.</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {}
          <Modal
            visible={ratingModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setRatingModalVisible(false)}
          >
            <BlurView intensity={20} style={styles.blurContainer}>
              <View style={styles.ratingModalContainer}>
                <Text style={styles.ratingTitle}>Rate Your Experience</Text>
                <Text style={styles.ratingSubtitle}>How satisfied were you with completing this challenge?</Text>
                
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setTempRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= tempRating ? "star" : "star-outline"}
                        size={32}
                        color="#8EC5FC"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.ratingButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setRatingModalVisible(false);
                      setTempRating(0);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, { opacity: tempRating > 0 ? 1 : 0.5 }]}
                    onPress={handleRatingSubmit}
                    disabled={tempRating === 0}
                  >
                    <Text style={styles.submitButtonText}>Complete Challenge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </Modal>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalContent: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9BA1A6',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 16,
    lineHeight: 28,
  },
  completionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  completionRow: {
    justifyContent: 'space-between',
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 2,
  },
  locationPin: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#9BA1A6',
    lineHeight: 22,
  },
  completionInfo: {
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingModalContainer: {
    width: width * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#333',
  },
  ratingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 15,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4ade80',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
