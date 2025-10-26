import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '@/lib/supabase';
import LocationPicker from '@/components/LocationPicker';

const { width, height } = Dimensions.get('window');

interface ChallengeDetailModalProps {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
}

export default function ChallengeDetailModal({ visible, challengeId, onClose }: ChallengeDetailModalProps) {
  const [challenge, setChallenge] = useState<any>(null);
  const [bucket, setBucket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [isEditingChallenge, setIsEditingChallenge] = useState(false);
  const [editingData, setEditingData] = useState({
    title: '',
    description: '',
    location: '',
    targetDate: '',
  });
  const [editingLocation, setEditingLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number };
    address?: string;
  } | null>(null);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && challengeId) {
      fetchChallengeData();
      // Start expand animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(blurAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible) {
      // Reset animations when closing
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      blurAnim.setValue(0);
    }
  }, [visible, challengeId]);

  const fetchChallengeData = async () => {
    if (!challengeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user ID
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      // First get the challenge data
      const { data: challengeData, error: challengeError } = await supabase
        .from('items')
        .select(`
          *,
          bucket_id
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
        
        // Now fetch the bucket data with permissions using the same RPC as bucket detail page
        const { data: bucketData, error: bucketError } = await supabase
          .rpc('get_bucket_by_id', {
            p_bucket_id: challengeData.bucket_id
          });

        if (bucketError) {
          console.error('Error fetching bucket:', bucketError);
          // Set basic bucket info without permissions
          setBucket({
            id: challengeData.bucket_id,
            title: 'Unknown Bucket',
            emoji: '🪣',
            color: '#8EC5FC',
            can_edit: false
          });
        } else if (bucketData && bucketData.length > 0) {
          setBucket(bucketData[0]);
        }
      }
    } catch (error) {
      console.error('Error in fetchChallengeData:', error);
      Alert.alert('Error', 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Start collapse animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleEditChallenge = () => {
    if (!bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only edit challenges in buckets you own or collaborate on.');
      return;
    }
    
    if (challenge) {
      setIsEditingChallenge(true);
      setEditingData({
        title: challenge.title,
        description: challenge.description || '',
        location: challenge.location_name || challenge.location || '',
        targetDate: challenge.target_date ? new Date(challenge.target_date).toISOString().split('T')[0] : '',
      });
      setEditingLocation(challenge.location_coordinates ? {
        name: challenge.location_name || challenge.location || '',
        coordinates: challenge.location_coordinates,
        address: challenge.location_name || challenge.location || ''
      } : null);
    }
  };

  const handleSaveChallenge = async () => {
    if (!challenge) return;

    try {
      // Update the challenge in the database
      const { error } = await supabase.rpc('update_item_secure', {
        p_item_id: challenge.id,
        p_title: editingData.title,
        p_description: editingData.description,
        p_location_name: editingLocation?.name || editingData.location,
        p_location_point: editingLocation ? 
          `POINT(${editingLocation.coordinates.longitude} ${editingLocation.coordinates.latitude})` : null,
        p_target_date: editingData.targetDate || null,
      });

      if (error) {
        console.error('Error updating challenge:', error);
        Alert.alert('Error', 'Failed to update challenge. Please try again.');
        return;
      }

      // Update local state
      setChallenge({
        ...challenge,
        title: editingData.title,
        description: editingData.description,
        location_name: editingLocation?.name || editingData.location,
        location: editingLocation?.name || editingData.location,
        location_coordinates: editingLocation?.coordinates,
        target_date: editingData.targetDate,
      });

      setIsEditingChallenge(false);
      Alert.alert('Success', 'Challenge updated successfully!');
    } catch (error) {
      console.error('Error in handleSaveChallenge:', error);
      Alert.alert('Error', 'Failed to update challenge. Please try again.');
    }
  };

  const handleCancelEditChallenge = () => {
    setIsEditingChallenge(false);
    setEditingData({ title: '', description: '', location: '', targetDate: '' });
    setEditingLocation(null);
  };

  const updateEditingData = (field: string, value: string) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChallengeCompletion = async (challengeId: string) => {
    if (!bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only complete challenges in buckets you own or collaborate on.');
      return;
    }
    
    const challengeToToggle = challenge;
    
    if (challengeToToggle && !challengeToToggle.is_completed) {
      // If completing for the first time, show rating modal
      setRatingModalVisible(true);
    } else if (challengeToToggle && challengeToToggle.is_completed) {
      // If uncompleting, update directly
      try {
        const { error } = await supabase
          .from('items')
          .update({ is_completed: false })
          .eq('id', challengeId);

        if (error) {
          console.error('Error uncompleting challenge:', error);
          Alert.alert('Error', 'Failed to uncomplete challenge');
          return;
        }

        // Update local state
        setChallenge({ ...challengeToToggle, is_completed: false });
        Alert.alert('Success', 'Challenge marked as incomplete');
      } catch (error) {
        console.error('Error in toggleChallengeCompletion:', error);
        Alert.alert('Error', 'Failed to update challenge. Please try again.');
      }
    }
  };

  const handleRatingSubmit = async () => {
    try {
      // Update challenge as completed
      const { error: updateError } = await supabase
        .from('items')
        .update({ 
          is_completed: true,
          satisfaction_rating: tempRating 
        })
        .eq('id', challengeId);

      if (updateError) {
        console.error('Error completing challenge:', updateError);
        Alert.alert('Error', 'Failed to complete challenge');
        return;
      }

      // Update local state
      setChallenge({ ...challenge, is_completed: true, satisfaction_rating: tempRating });
      setRatingModalVisible(false);
      setTempRating(0);
      Alert.alert('Success', 'Challenge completed!');
    } catch (error) {
      console.error('Error in handleRatingSubmit:', error);
      Alert.alert('Error', 'Failed to complete challenge');
    }
  };

  const handleRatingCancel = () => {
    setRatingModalVisible(false);
    setTempRating(0);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.blurContainer,
          {
            opacity: blurAnim,
          }
        ]}
      >
        <BlurView intensity={20} style={styles.blurView}>
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  { scale: scaleAnim },
                ],
                opacity: opacityAnim,
              }
            ]}
          >
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8EC5FC" />
                  <Text style={styles.loadingText}>Loading challenge...</Text>
                </View>
              ) : challenge ? (
                <>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleSection}>
                      {isEditingChallenge ? (
                        <TextInput
                          style={styles.modalTitleInput}
                          value={editingData.title}
                          onChangeText={(value) => updateEditingData('title', value)}
                          placeholder="Challenge Title"
                          placeholderTextColor="#9BA1A6"
                        />
                      ) : (
                        <Text style={styles.modalTitle}>{challenge.title}</Text>
                      )}
                      <TouchableOpacity 
                        style={[styles.modalCompletionBadge, !bucket?.can_edit && styles.modalCompletionBadgeDisabled]}
                        onPress={() => {
                          if (bucket?.can_edit) {
                            toggleChallengeCompletion(challenge.id);
                          }
                        }}
                        disabled={!bucket?.can_edit}
                      >
                        {challenge.is_completed ? (
                          <>
                            <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
                            <Text style={styles.modalCompletionText}>Completed</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="ellipse-outline" size={14} color="#9BA1A6" />
                            <Text style={styles.modalCompletionTextIncomplete}>Mark Complete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    {isEditingChallenge && (
                      <View style={styles.modalHeaderActions}>
                        <TouchableOpacity 
                          style={styles.modalActionButton}
                          onPress={handleSaveChallenge}
                        >
                          <Ionicons name="checkmark" size={20} color="#4ade80" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.modalActionButton}
                          onPress={handleCancelEditChallenge}
                        >
                          <Ionicons name="close" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  <View style={styles.modalDetailsSection}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>🪣</Text>
                      <Text style={styles.modalDetailText}>{bucket?.title}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📍</Text>
                      {isEditingChallenge ? (
                        <LocationPicker
                          value={editingLocation}
                          onLocationSelect={(location) => {
                            setEditingLocation(location);
                            updateEditingData('location', location?.name || '');
                          }}
                          placeholder="Location"
                          style={styles.modalLocationPicker}
                        />
                      ) : (
                        <Text style={styles.modalDetailText}>{challenge.location_name || challenge.location}</Text>
                      )}
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📅</Text>
                      {isEditingChallenge ? (
                        <TextInput
                          style={styles.modalDetailInput}
                          value={editingData.targetDate}
                          onChangeText={(value) => updateEditingData('targetDate', value)}
                          placeholder="Target Date (YYYY-MM-DD)"
                          placeholderTextColor="#9BA1A6"
                        />
                      ) : (
                        <Text style={styles.modalDetailText}>{challenge.target_date ? `Target: ${new Date(challenge.target_date).toLocaleDateString()}` : 'None yet!'}</Text>
                      )}
                    </View>
                    {challenge.is_completed && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalLocationPin}>⭐</Text>
                        <Text style={styles.modalDetailText}>Satisfaction: {challenge.satisfaction_rating || 5}/5</Text>
                      </View>
                    )}
                  </View>

                  {/* Separator */}
                  <View style={styles.modalSeparator} />

                  {/* Description */}
                  <View style={styles.modalDescriptionSection}>
                    <Text style={styles.modalDescriptionTitle}>Challenge Description</Text>
                    {isEditingChallenge ? (
                      <TextInput
                        style={styles.modalDescriptionInput}
                        value={editingData.description}
                        onChangeText={(value) => updateEditingData('description', value)}
                        placeholder="Challenge Description"
                        placeholderTextColor="#9BA1A6"
                        multiline
                        numberOfLines={4}
                      />
                    ) : (
                      <Text style={styles.modalDescriptionText}>
                        {challenge.description}
                      </Text>
                    )}
                  </View>

                  {/* Photo Album */}
                  <View style={styles.modalPhotoAlbumSection}>
                    <Text style={styles.modalPhotoAlbumTitle}>
                      Photo Album ({challenge.photos ? challenge.photos.length : 0})
                    </Text>
                    <View style={styles.modalPhotoGrid}>
                      {/* Upload Button */}
                      <TouchableOpacity style={styles.uploadButton}>
                        <Ionicons name="add" size={24} color="#9BA1A6" />
                        <Text style={styles.uploadText}>Add Photo</Text>
                      </TouchableOpacity>
                      
                      {/* Existing Photos */}
                      {challenge.photos && challenge.photos.map((photo: string, index: number) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.modalPhotoThumbnail}
                        />
                      ))}
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Challenge not found</Text>
                </View>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {/* Edit Button - Only show if user can edit */}
            {!isEditingChallenge && bucket?.can_edit && (
              <TouchableOpacity 
                style={styles.modalEditButton}
                onPress={handleEditChallenge}
              >
                <Ionicons name="create-outline" size={20} color="#8EC5FC" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </BlurView>
      </Animated.View>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRatingCancel}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate Your Experience</Text>
              <Text style={styles.ratingModalSubtitle}>
                How satisfied were you with "{challenge?.title}"?
              </Text>
            </View>

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
                    color={star <= tempRating ? "#fbbf24" : "#6b7280"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={styles.ratingCancelButton}
                onPress={handleRatingCancel}
              >
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingSubmitButton, tempRating === 0 && styles.ratingSubmitButtonDisabled]}
                onPress={handleRatingSubmit}
                disabled={tempRating === 0}
              >
                <Text style={styles.ratingSubmitText}>Complete Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    position: 'relative',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitleSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  modalTitleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  modalCompletionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  modalCompletionBadgeDisabled: {
    opacity: 0.5,
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
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDetailsSection: {
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalLocationPin: {
    fontSize: 12,
    marginRight: 8,
  },
  modalDetailText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  modalDetailInput: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
    flex: 1,
  },
  modalLocationPicker: {
    flex: 1,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  modalDescriptionSection: {
    marginBottom: 30,
  },
  modalDescriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalDescriptionText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  modalDescriptionInput: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
  },
  modalPhotoAlbumSection: {
    marginBottom: 20,
  },
  modalPhotoAlbumTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  modalPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  uploadButton: {
    width: (width * 0.9 - 60) / 3,
    height: (width * 0.9 - 60) / 3,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 4,
  },
  modalPhotoThumbnail: {
    width: (width * 0.9 - 60) / 3,
    height: (width * 0.9 - 60) / 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEditButton: {
    position: 'absolute',
    top: 16,
    right: 64,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  // Rating Modal Styles
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ratingModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  ratingModalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingCancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  ratingCancelText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSubmitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8EC5FC',
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#4a5568',
  },
  ratingSubmitText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
