import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useRef, useEffect } from 'react';

// Dummy data for Jits bucket
const jitsBucket = {
  id: "1",
  title: "Jits",
  cover: "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
  createdDate: "09/25/2025",
  challenges: [
    {
      id: "1",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: true,
      satisfaction: 5,
      photos: [
        "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
      ],
    },
    {
      id: "2", 
      title: "Golden Gate Bridge Walk",
      location: "San Francisco",
      completed: true,
      satisfaction: 4,
      photos: [
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
      ],
    },
    {
      id: "3",
      title: "Muir Woods Trail", 
      location: "Mill Valley",
      completed: false,
      satisfaction: null,
      photos: [],
    },
    {
      id: "4",
      title: "Lands End Coastal Walk",
      location: "San Francisco", 
      completed: true,
      satisfaction: 3,
      photos: [
        "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      ],
    },
    {
      id: "5",
      title: "Angel Island Hike",
      location: "Tiburon",
      completed: false,
      satisfaction: null,
      photos: [],
    },
    {
      id: "6",
      title: "Point Reyes Lighthouse",
      location: "Point Reyes",
      completed: false,
      satisfaction: null,
      photos: [],
    },
  ],
};

const { width, height } = Dimensions.get('window');

export default function BucketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>(jitsBucket?.challenges || []);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  // For now, only handle Jits bucket (id: "1")
  const bucket = id === "1" ? jitsBucket : null;

  // Challenge data for modal
  const challenge = {
    id: "1",
    title: "Mt. Tam Hike",
    bucket: "Jits",
    location: "Mt Tamalpais",
    date: "12/18/2025",
    description: "Go to the Mill Valley Library, do some light gardening, and wander around.",
    photos: [
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
      "https://images.unsplash.com/photo-1604908177575-084b2d14c16d",
    ],
  };

  const handleBack = () => {
    router.back();
  };

  const handleAddItem = () => {
    // TODO: Open modal to add new item/challenge
    console.log('Add new item to bucket');
  };

  const toggleChallengeCompletion = (challengeId: string) => {
    setChallenges(prevChallenges => 
      prevChallenges.map(challenge => 
        challenge.id === challengeId 
          ? { 
              ...challenge, 
              completed: !challenge.completed,
              // If completing for the first time, add default satisfaction
              satisfaction: !challenge.completed && challenge.satisfaction === null ? 5 : challenge.satisfaction
            }
          : challenge
      )
    );
    
    // Update selected challenge if it's the one being toggled
    if (selectedChallenge && selectedChallenge.id === challengeId) {
      setSelectedChallenge((prev: any) => ({
        ...prev,
        completed: !prev.completed,
        satisfaction: !prev.completed && prev.satisfaction === null ? 5 : prev.satisfaction
      }));
    }
  };

  const handleChallengePress = (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (challenge) {
      setSelectedChallenge(challenge);
      setModalVisible(true);
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
    } else {
      console.log('Navigate to challenge:', challengeId);
    }
  };

  const handleCloseModal = () => {
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
      setModalVisible(false);
    });
  };

  if (!bucket) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Bucket not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Image source={{ uri: bucket.cover }} style={styles.headerImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.headerGradient}
        />
        
        {/* Navigation */}
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="people" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bucket Info */}
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketTitle}>{bucket.title}</Text>
          <View style={styles.bucketMeta}>
            <Text style={styles.createdDate}>Created {bucket.createdDate}</Text>
            <View style={styles.statusIcon}>
              <Ionicons name="ellipse" size={8} color="#fff" />
            </View>
          </View>
        </View>
      </View>

      {/* Challenges List */}
      <ScrollView style={styles.challengesSection} showsVerticalScrollIndicator={false}>
        {challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeCard}
            onPress={() => handleChallengePress(challenge.id)}
          >
            {/* Completion Status & Icon */}
            <TouchableOpacity 
              style={styles.challengeIcon}
              onPress={(e) => {
                e.stopPropagation();
                toggleChallengeCompletion(challenge.id);
              }}
            >
              {challenge.completed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            
            {/* Challenge Info */}
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <View style={styles.challengeLocation}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>{challenge.location}</Text>
              </View>
              
              {/* Additional Info Row */}
              <View style={styles.challengeMeta}>
                {/* Satisfaction Rating */}
                {challenge.completed && challenge.satisfaction && (
                  <View style={styles.satisfactionContainer}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.satisfactionText}>{challenge.satisfaction}/5</Text>
                  </View>
                )}
                
                {/* Photo Count */}
                {challenge.photos && challenge.photos.length > 0 && (
                  <View style={styles.photoCountContainer}>
                    <Ionicons name="camera" size={12} color="#9BA1A6" />
                    <Text style={styles.photoCountText}>{challenge.photos.length}</Text>
                  </View>
                )}
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddItem}>
        <Ionicons name="add" size={24} color="#000" />
      </TouchableOpacity>

      {/* Challenge Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
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
              {selectedChallenge && (
                <>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleSection}>
                      <Text style={styles.modalTitle}>{selectedChallenge.title}</Text>
                      <TouchableOpacity 
                        style={styles.modalCompletionBadge}
                        onPress={() => toggleChallengeCompletion(selectedChallenge.id)}
                      >
                        {selectedChallenge.completed ? (
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
                      <Text style={styles.modalDetailText}>{selectedChallenge.location}</Text>
                    </View>
                    {selectedChallenge.completed && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalLocationPin}>⭐</Text>
                        <Text style={styles.modalDetailText}>Satisfaction: {selectedChallenge.satisfaction || 5}/5</Text>
                        <View style={styles.satisfactionStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => {
                                const updatedChallenges = challenges.map(c => 
                                  c.id === selectedChallenge.id 
                                    ? { ...c, satisfaction: star }
                                    : c
                                );
                                setChallenges(updatedChallenges);
                                setSelectedChallenge((prev: any) => ({ ...prev, satisfaction: star }));
                              }}
                            >
                              <Ionicons 
                                name={star <= (selectedChallenge.satisfaction || 5) ? "star" : "star-outline"} 
                                size={20} 
                                color="#f59e0b" 
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Separator */}
                  <View style={styles.modalSeparator} />

                  {/* Description */}
                  <View style={styles.modalDescriptionSection}>
                    <Text style={styles.modalDescriptionText}>
                      {selectedChallenge.completed 
                        ? `Completed this challenge! ${selectedChallenge.satisfaction ? `Rated ${selectedChallenge.satisfaction}/5 stars.` : ''}`
                        : 'This challenge is waiting to be completed.'
                      }
                    </Text>
                  </View>

                  {/* Photo Album */}
                  <View style={styles.modalPhotoAlbumSection}>
                    <Text style={styles.modalPhotoAlbumTitle}>
                      Photo Album ({selectedChallenge.photos ? selectedChallenge.photos.length : 0})
                    </Text>
                    <View style={styles.modalPhotoGrid}>
                      {/* Upload Button */}
                      <TouchableOpacity style={styles.uploadButton}>
                        <Ionicons name="add" size={24} color="#9BA1A6" />
                        <Text style={styles.uploadText}>Add Photo</Text>
                      </TouchableOpacity>
                      
                      {/* Existing Photos */}
                      {selectedChallenge.photos && selectedChallenge.photos.map((photo: string, index: number) => (
                        <Image
                          key={index}
                          source={{ uri: photo }}
                          style={styles.modalPhotoThumbnail}
                        />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            </Animated.View>
          </BlurView>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerSection: {
    height: height * 0.6,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerNav: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  bucketTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bucketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 16,
    color: '#fff',
    marginRight: 8,
  },
  statusIcon: {
    width: 8,
    height: 8,
  },
  challengesSection: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
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
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  satisfactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  satisfactionText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 2,
    fontWeight: '600',
  },
  photoCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 161, 166, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  photoCountText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginLeft: 2,
    fontWeight: '600',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  // Modal styles
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
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
  modalHeader: {
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
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  modalDetailsSection: {
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  satisfactionStars: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 4,
  },
  modalLocationPin: {
    fontSize: 12,
    marginRight: 8,
  },
  modalDetailText: {
    fontSize: 16,
    color: '#fff',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#333',
    marginBottom: 20,
  },
  modalDescriptionSection: {
    marginBottom: 30,
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
    justifyContent: 'flex-start',
  },
  modalPhotoThumbnail: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  uploadButton: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9BA1A6',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(155, 161, 166, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 12,
    color: '#9BA1A6',
    marginTop: 4,
    textAlign: 'center',
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
});
