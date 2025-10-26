import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 60) / 3; // 3 photos per row with padding

interface Photo {
  id: string;
  url: string;
  caption: string;
  completed_by: string;
  completed_by_avatar: string;
  created_at: string;
  user_rating?: number;
  user_review?: string;
}

interface SharedPhotoAlbumProps {
  photos: Photo[];
  onRatePhoto: (photoId: string, rating: number, review?: string) => void;
  onAddPhoto?: (photoUrl: string, caption?: string) => void;
  loading?: boolean;
  canAddPhotos?: boolean;
}

export default function SharedPhotoAlbum({
  photos,
  onRatePhoto,
  onAddPhoto,
  loading = false,
  canAddPhotos = false,
}: SharedPhotoAlbumProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handlePhotoPress = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleRatePress = (photo: Photo) => {
    setSelectedPhoto(photo);
    setShowRatingModal(true);
  };

  const handleRate = (rating: number, review?: string) => {
    if (selectedPhoto) {
      onRatePhoto(selectedPhoto.id, rating, review);
    }
    setShowRatingModal(false);
  };

  const handleAddPhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
        return;
      }

      // Pick an image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUrl = result.assets[0].uri;
        if (onAddPhoto) {
          onAddPhoto(photoUrl, '');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const renderPhoto = (photo: Photo, index: number) => (
    <TouchableOpacity
      key={photo.id}
      style={styles.photoContainer}
      onPress={() => handlePhotoPress(photo)}
    >
      <Image source={{ uri: photo.url }} style={styles.photo} />
      <View style={styles.photoOverlay}>
        <View style={styles.photoInfo}>
          <Text style={styles.completedBy} numberOfLines={1}>
            {photo.completed_by}
          </Text>
          {photo.user_rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{photo.user_rating}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => handleRatePress(photo)}
        >
          <Ionicons 
            name={photo.user_rating ? "star" : "star-outline"} 
            size={16} 
            color={photo.user_rating ? "#FFD700" : "#fff"} 
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8EC5FC" />
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="camera-outline" size={48} color="#6B7280" />
        <Text style={styles.emptyTitle}>No Photos Yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete challenges to add photos to the album
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shared Photo Album</Text>
        <View style={styles.headerRight}>
          <Text style={styles.count}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>
          {canAddPhotos && onAddPhoto && (
            <TouchableOpacity 
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
            >
              <Ionicons name="camera" size={20} color="#8EC5FC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.photosGrid}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.photosContent}
      >
        {photos.map((photo, index) => renderPhoto(photo, index))}
      </ScrollView>

      {/* Photo Detail Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        {selectedPhoto && (
          <View style={styles.photoModalOverlay}>
            <View style={styles.photoModalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedPhoto(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              <Image source={{ uri: selectedPhoto.url }} style={styles.fullPhoto} />
              
              <View style={styles.photoDetails}>
                <View style={styles.photoHeader}>
                  <Image
                    source={{ uri: selectedPhoto.completed_by_avatar || 'https://via.placeholder.com/40x40/6B7280/FFFFFF?text=' + selectedPhoto.completed_by[0] }}
                    style={styles.avatar}
                  />
                  <View style={styles.photoInfo}>
                    <Text style={styles.completedByName}>{selectedPhoto.completed_by}</Text>
                    <Text style={styles.completedDate}>
                      {new Date(selectedPhoto.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.rateButtonLarge}
                    onPress={() => handleRatePress(selectedPhoto)}
                  >
                    <Ionicons 
                      name={selectedPhoto.user_rating ? "star" : "star-outline"} 
                      size={20} 
                      color={selectedPhoto.user_rating ? "#FFD700" : "#8EC5FC"} 
                    />
                  </TouchableOpacity>
                </View>
                
                {selectedPhoto.caption && (
                  <Text style={styles.caption}>{selectedPhoto.caption}</Text>
                )}
                
                {selectedPhoto.user_rating && (
                  <View style={styles.ratingDisplay}>
                    <View style={styles.ratingStars}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Ionicons
                          key={i}
                          name={i < selectedPhoto.user_rating! ? "star" : "star-outline"}
                          size={16}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                    {selectedPhoto.user_review && (
                      <Text style={styles.reviewText}>{selectedPhoto.user_review}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#9BA1A6',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  count: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  addPhotoButton: {
    padding: 8,
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(142, 197, 252, 0.3)',
  },
  photosGrid: {
    flex: 1,
  },
  photosContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoInfo: {
    flex: 1,
  },
  completedBy: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 10,
    color: '#FFD700',
    marginLeft: 2,
  },
  rateButton: {
    padding: 4,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullPhoto: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  photoDetails: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  completedByName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  completedDate: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 2,
  },
  rateButtonLarge: {
    padding: 8,
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    borderRadius: 20,
  },
  caption: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
  },
  ratingDisplay: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#fff',
    fontStyle: 'italic',
  },
});
