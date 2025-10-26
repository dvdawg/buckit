import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    category: '',
  });

  const handleSave = () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in the required fields');
      return;
    }
    
    // TODO: Save challenge to database
    Alert.alert('Success', 'Challenge created successfully!');
    router.back();
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#8EC5FC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Challenge</Text>
        <TouchableOpacity style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Editable Challenge Card - Same as existing Mt. Tam Hike card but with editable fields */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <TextInput
              style={styles.challengeTitleInput}
              placeholder="Your Challenge Title"
              placeholderTextColor="#9BA1A6"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
            />
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.statusText}>Draft</Text>
            </View>
          </View>

          <View style={styles.challengeDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="folder" size={16} color="#60A5FA" />
              <TextInput
                style={styles.detailInput}
                placeholder="Category"
                placeholderTextColor="#9BA1A6"
                value={formData.category}
                onChangeText={(value) => updateFormData('category', value)}
              />
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color="#EF4444" />
              <TextInput
                style={styles.detailInput}
                placeholder="Location"
                placeholderTextColor="#9BA1A6"
                value={formData.location}
                onChangeText={(value) => updateFormData('location', value)}
              />
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.detailText}>
                Satisfaction: 0/5
              </Text>
            </View>
          </View>

          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe your challenge..."
            placeholderTextColor="#9BA1A6"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.photoSection}>
            <Text style={styles.photoTitle}>Photo Album (0)</Text>
            <View style={styles.photoGrid}>
              <TouchableOpacity style={styles.addPhotoButton}>
                <Ionicons name="add" size={24} color="#fff" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <LinearGradient
            colors={['#8EC5FC', '#E0C3FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Create Challenge</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  challengeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeTitleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  statusBadge: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  challengeDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  detailInput: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    flex: 1,
  },
  descriptionInput: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    textAlignVertical: 'top',
  },
  ratingText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  photoSection: {
    marginTop: 16,
  },
  photoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#fff',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  addPhotoText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 16,
    marginBottom: 40,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
