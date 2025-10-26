import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import LocationDisplay from '@/components/LocationDisplay';

const { width, height } = Dimensions.get('window');

export default function ChallengeDetail() {
  const router = useRouter();
  const { id, challengeId } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [bucket, setBucket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchChallengeData();
  }, [challengeId]);

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
        setPhotos(challengeData.photos || []);
      }
    } catch (error) {
      console.error('Error in fetchChallengeData:', error);
      Alert.alert('Error', 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
    router.back();
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
    try {
      const { error } = await supabase.rpc('uncomplete_item', {
        p_item_id: challengeId
      });

      if (error) {
        console.error('Error uncompleting challenge:', error);
        Alert.alert('Error', `Failed to update challenge: ${error.message}`);
        return;
      }

      setChallenge((prev: any) => ({
        ...prev,
        is_completed: false,
        satisfaction_rating: null,
        completed_at: null
      }));

      Alert.alert('Success', 'Challenge marked as incomplete');
    } catch (error) {
      console.error('Error in handleUncompleteChallenge:', error);
      Alert.alert('Error', 'Failed to update challenge');
    }
  };

  const handleRatingSubmit = async () => {
    if (tempRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    console.log('=== RATING SUBMIT DEBUG ===');
    console.log('Challenge ID:', challengeId);
    console.log('Temp Rating:', tempRating);
    console.log('Challenge data before update:', challenge);

    try {
      console.log('Testing database connection...');
      const { data: testData, error: testError } = await supabase.rpc('me_user_id');
      console.log('User ID test result:', { testData, testError });

      if (testError) {
        console.error('Database connection test failed:', testError);
        Alert.alert('Error', `Database connection failed: ${testError.message}`);
        return;
      }

      console.log('Calling update_item_satisfaction_rating RPC...');
      const { data: updateData, error } = await supabase.rpc('update_item_satisfaction_rating', {
        p_item_id: challengeId,
        p_satisfaction_rating: tempRating,
        p_is_completed: true
      });

      console.log('RPC call result:', { updateData, error });

      if (error) {
        console.error('Error updating challenge rating:', error);
        Alert.alert('Error', `Failed to save rating: ${error.message}`);
        return;
      }

      console.log('Verifying update by fetching item...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('items')
        .select('*')
        .eq('id', challengeId)
        .single();

      console.log('Verification result:', { verifyData, verifyError });

      setChallenge((prev: any) => ({
        ...prev,
        is_completed: true,
        satisfaction_rating: tempRating,
        completed_at: new Date().toISOString()
      }));

      setRatingModalVisible(false);
      setTempRating(0);

      Alert.alert('Challenge Completed!', `You rated "${challenge?.title}" ${tempRating} star${tempRating !== 1 ? 's' : ''}!`);
      console.log('=== RATING SUBMIT COMPLETE ===');
    } catch (error) {
      console.error('Error in handleRatingSubmit:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleRatingCancel = () => {
    setRatingModalVisible(false);
    setTempRating(0);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
        return;
      }

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
    if (!challengeId) {
      Alert.alert('Error', 'Challenge ID not found');
      return;
    }

    try {
      setUploadingPhoto(true);

      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const fileExt = imageAsset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${challengeId}_${Date.now()}.${fileExt}`;
      const filePath = `challenge-photos/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
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

      const { data: { publicUrl } } = supabase.storage
        .from('challenge-photos')
        .getPublicUrl(filePath);

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

  if (loading) {
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <BlurView intensity={20} style={styles.blurContainer}>
          <View style={styles.modalContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8EC5FC" />
              <Text style={styles.loadingText}>Loading challenge...</Text>
            </View>
          </View>
        </BlurView>
      </Modal>
    );
  }

  if (!challenge) {
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <BlurView intensity={20} style={styles.blurContainer}>
          <View style={styles.modalContainer}>
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#8EC5FC" />
              <Text style={styles.errorText}>Challenge not found</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView intensity={20} style={styles.blurContainer}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <TouchableOpacity 
                  style={styles.completionButton}
                  onPress={handleCompleteChallenge}
                >
                  {challenge.is_completed ? (
                    <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>


            {}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.locationPin}>🪣</Text>
                <Text style={styles.detailText}>{bucket?.title || 'Unknown Bucket'}</Text>
              </View>
              <View style={styles.detailRow}>
                <LocationDisplay
                  location={challenge.location_name ? {
                    name: challenge.location_name,
                    coordinates: challenge.location_point ? {
                      latitude: challenge.location_point.latitude || 0,
                      longitude: challenge.location_point.longitude || 0,
                    } : { latitude: 0, longitude: 0 },
                    address: challenge.location_name,
                  } : null}
                  style={styles.locationDisplay}
                />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.locationPin}>📅</Text>
                <Text style={styles.detailText}>
                  {challenge.deadline ? `Target: ${new Date(challenge.deadline).toLocaleDateString()}` : 'None yet!'}
                </Text>
              </View>
              {challenge.is_completed && challenge.satisfaction_rating && (
                <View style={styles.detailRow}>
                  <Text style={styles.locationPin}>⭐</Text>
                  <Text style={styles.detailText}>Satisfaction: {challenge.satisfaction_rating}/5</Text>
                </View>
              )}
            </View>

            {}
            <View style={styles.separator} />

            {}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>{challenge.description || 'No description available'}</Text>
            </View>

            {}
            <View style={styles.photoAlbumSection}>
              <Text style={styles.photoAlbumTitle}>Photo Album ({photos.length})</Text>
              <View style={styles.photoGrid}>
                <TouchableOpacity 
                  style={[styles.addPhotoButton, uploadingPhoto && styles.addPhotoButtonDisabled]}
                  onPress={pickImage}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#8EC5FC" />
                  ) : (
                    <Ionicons name="add" size={24} color="#9BA1A6" />
                  )}
                  <Text style={styles.addPhotoText}>
                    {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>
                
                {}
                {photos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.photoThumbnail}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>

      {}
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

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setTempRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons 
                    name={star <= tempRating ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= tempRating ? "#8EC5FC" : "#9BA1A6"} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingModalActions}>
              <TouchableOpacity 
                style={styles.ratingCancelButton} 
                onPress={handleRatingCancel}
              >
                <Text style={styles.ratingCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.ratingSubmitButton} 
                onPress={handleRatingSubmit}
              >
                <LinearGradient
                  colors={['#8EC5FC', '#E0C3FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ratingSubmitGradient}
                >
                  <Text style={styles.ratingSubmitButtonText}>Submit Rating</Text>
                </LinearGradient>
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
    flex: 1,
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
  header: {
    marginBottom: 20,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#fff',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  descriptionSection: {
    marginBottom: 30,
  },
  descriptionText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  photoAlbumSection: {
    marginBottom: 20,
  },
  photoAlbumTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoThumbnail: {
    width: (width * 0.9 - 60) / 3,
    height: (width * 0.9 - 60) / 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  closeButton: {
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
    marginTop: 16,
    marginBottom: 24,
  },
  closeButtonText: {
    color: '#8EC5FC',
    fontSize: 16,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionButton: {
    padding: 8,
  },
  addPhotoButton: {
    width: (width * 0.9 - 60) / 3,
    height: (width * 0.9 - 60) / 3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9BA1A6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(155, 161, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 4,
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  ratingCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSubmitButton: {
    flex: 1,
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
  ratingSubmitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ratingSubmitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  locationDisplay: {
    flex: 1,
  },
  addPhotoButtonDisabled: {
    opacity: 0.6,
  },
});
