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
      completed: false,
    },
    {
      id: "2", 
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "3",
      title: "Mt. Tam Hike", 
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "4",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais", 
      completed: false,
    },
    {
      id: "5",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
    {
      id: "6",
      title: "Mt. Tam Hike",
      location: "Mt Tamalpais",
      completed: false,
    },
  ],
};

const { width, height } = Dimensions.get('window');

export default function BucketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  
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

  const handleChallengePress = (challengeId: string) => {
    if (challengeId === "1") {
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
      // TODO: Handle other challenges
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
        {bucket.challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeCard}
            onPress={() => handleChallengePress(challenge.id)}
          >
            <View style={styles.challengeIcon}>
              <Ionicons name="ellipse-outline" size={24} color="#fff" />
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <View style={styles.challengeLocation}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>{challenge.location}</Text>
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
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{challenge.title}</Text>
              </View>

              {/* Details */}
              <View style={styles.modalDetailsSection}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLocationPin}>🪣</Text>
                  <Text style={styles.modalDetailText}>{challenge.bucket}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLocationPin}>📍</Text>
                  <Text style={styles.modalDetailText}>{challenge.location}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalLocationPin}>🎯</Text>
                  <Text style={styles.modalDetailText}>{challenge.date}</Text>
                </View>
              </View>

              {/* Separator */}
              <View style={styles.modalSeparator} />

              {/* Description */}
              <View style={styles.modalDescriptionSection}>
                <Text style={styles.modalDescriptionText}>{challenge.description}</Text>
              </View>

              {/* Photo Album */}
              <View style={styles.modalPhotoAlbumSection}>
                <Text style={styles.modalPhotoAlbumTitle}>Photo Album</Text>
                <View style={styles.modalPhotoGrid}>
                  {challenge.photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo }}
                      style={styles.modalPhotoThumbnail}
                    />
                  ))}
                </View>
              </View>
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
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9BA1A6',
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
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
    justifyContent: 'space-between',
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
});
