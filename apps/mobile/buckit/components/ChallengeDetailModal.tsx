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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import LocationPicker from '@/components/LocationPicker';
import ChallengeRatingModal from '@/components/ChallengeRatingModal';

const { width, height } = Dimensions.get('window');

interface ChallengeDetailModalProps {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
}

export default function ChallengeDetailModal({ visible, challengeId, onClose }: ChallengeDetailModalProps) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<any>(null);
  const [bucket, setBucket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

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
        // Initialize photos array from challenge data
        setPhotos(challengeData.photos || []);
        
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
      // Navigate to create challenge page with pre-filled data
      const params = new URLSearchParams({
        edit: 'true',
        challengeId: challenge.id,
        bucketId: challenge.bucket_id,
        title: challenge.title || '',
        description: challenge.description || '',
        location: challenge.location_name || challenge.location || '',
        targetDate: challenge.target_date ? new Date(challenge.target_date).toISOString().split('T')[0] : '',
      });
      router.push(`/create-challenge?${params.toString()}`);
      onClose(); // Close the modal
    }
  };


  const toggleChallengeCompletion = () => {
    if (!bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only complete challenges in buckets you own or collaborate on.');
      return;
    }
    
    if (challenge) {
      setRatingModalVisible(true);
    }
  };

  const handleRatingSuccess = () => {
    // Refresh challenge data
    if (challengeId) {
      fetchChallengeData();
    }
  };

  const handleRatingCancel = () => {
    setRatingModalVisible(false);
    setTempRating(0);
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageAsset: any) => {
    if (!challengeId || !bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only add photos to challenges in buckets you own or collaborate on.');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Get user ID
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Create a unique filename
      const fileExt = imageAsset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${challengeId}_${Date.now()}.${fileExt}`;
      const filePath = `challenge-photos/${fileName}`;

      // Use FormData approach for React Native compatibility
      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      // Get the Supabase URL from environment
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      // Upload using fetch with FormData
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/challenge-photos/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error:', errorText);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('challenge-photos')
        .getPublicUrl(filePath);

      // Update the challenge with the new photo
      const updatedPhotos = [...photos, publicUrl];
      const { error: updateError } = await supabase
        .from('items')
        .update({ photos: updatedPhotos })
        .eq('id', challengeId);

      if (updateError) {
        console.error('Error updating challenge photos:', updateError);
        Alert.alert('Error', 'Failed to save photo to challenge. Please try again.');
        return;
      }

      // Update local state
      setPhotos(updatedPhotos);
      setChallenge({ ...challenge, photos: updatedPhotos });
      Alert.alert('Success', 'Photo added to challenge!');
    } catch (error) {
      console.error('Error in uploadImage:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
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
                      <Text style={styles.modalTitle}>{challenge.title}</Text>
                      <TouchableOpacity 
                        style={[styles.modalCompletionBadge, !bucket?.can_edit && styles.modalCompletionBadgeDisabled]}
                        onPress={toggleChallengeCompletion}
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
                  </View>

                  {/* Details */}
                  <View style={styles.modalDetailsSection}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>🪣</Text>
                      <Text style={styles.modalDetailText}>{bucket?.title}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📍</Text>
                      <Text style={styles.modalDetailText}>{challenge.location_name || challenge.location}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalLocationPin}>📅</Text>
                      <Text style={styles.modalDetailText}>{challenge.target_date ? `Target: ${new Date(challenge.target_date).toLocaleDateString()}` : 'None yet!'}</Text>
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
                    <Text style={styles.modalDescriptionText}>
                      {challenge.description}
                    </Text>
                  </View>

                  {/* Photo Album */}
                  <View style={styles.modalPhotoAlbumSection}>
                    <Text style={styles.modalPhotoAlbumTitle}>
                      Photo Album ({photos.length})
                    </Text>
                    <View style={styles.modalPhotoGrid}>
                      {/* Upload Button - Only show if user can edit */}
                      {bucket?.can_edit && (
                        <TouchableOpacity 
                          style={[styles.uploadButton, uploadingPhoto && styles.uploadButtonDisabled]}
                          onPress={pickImage}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? (
                            <ActivityIndicator size="small" color="#8EC5FC" />
                          ) : (
                            <Ionicons name="add" size={24} color="#9BA1A6" />
                          )}
                          <Text style={styles.uploadText}>
                            {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      
                      {/* Existing Photos */}
                      {photos.map((photo: string, index: number) => (
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
            {bucket?.can_edit && (
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
      <ChallengeRatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSuccess={handleRatingSuccess}
        challenge={challenge}
      />
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
  uploadButtonDisabled: {
    opacity: 0.6,
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
});
