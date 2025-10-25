import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Dummy data for Mt. Tam Hike challenge
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

export default function ChallengeDetail() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(true);

  const handleClose = () => {
    setModalVisible(false);
    router.back();
  };

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
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
            </View>

            {/* Details */}
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.detailText}>{challenge.bucket}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.detailText}>{challenge.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.detailText}>{challenge.date}</Text>
              </View>
            </View>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>{challenge.description}</Text>
            </View>

            {/* Photo Album */}
            <View style={styles.photoAlbumSection}>
              <Text style={styles.photoAlbumTitle}>Photo Album</Text>
              <View style={styles.photoGrid}>
                {challenge.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.photoThumbnail}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
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
});
