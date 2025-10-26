import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useBuckets } from '@/hooks/useBuckets';

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { buckets, loading: bucketsLoading } = useBuckets();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    category: '',
    bucketId: '',
  });
  const [loading, setLoading] = useState(false);
  const [showBucketSelector, setShowBucketSelector] = useState(false);

  const handleSave = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in the required fields');
      return;
    }
    
    if (!formData.bucketId) {
      Alert.alert('Error', 'Please select a bucket for this challenge');
      return;
    }
    
    setLoading(true);
    try {
      // Use the existing RPC function instead of direct table insert
      // This bypasses RLS policies by using a SECURITY DEFINER function
      console.log('Creating challenge using RPC function...');
      
      const { data, error } = await supabase.rpc('create_item_secure', {
        p_bucket_id: formData.bucketId,
        p_title: formData.title,
        p_description: formData.description,
        p_category: formData.category,
        p_location: formData.location
      });

      if (error) {
        console.error('Error creating challenge:', error);
        Alert.alert('Error', `Failed to create challenge: ${error.message}`);
        return;
      }

      console.log('Challenge created successfully with ID:', data);
      Alert.alert('Success', 'Challenge created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
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

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Editable Challenge Card - Same as existing Mt. Tam Hike card but with editable fields */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <TextInput
              style={styles.challengeTitleInput}
              placeholder="Your Challenge Title"
              placeholderTextColor="#9BA1A6"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={60}
            />
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
              <Text style={styles.statusText}>Draft</Text>
            </View>
          </View>

          <View style={styles.challengeDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="folder" size={16} color="#60A5FA" />
              <TouchableOpacity 
                style={styles.bucketSelector}
                onPress={() => setShowBucketSelector(!showBucketSelector)}
              >
                <Text style={styles.bucketSelectorText}>
                  {formData.bucketId ? 
                    buckets.find(b => b.id === formData.bucketId)?.title || 'Select Bucket' : 
                    'Select Bucket'
                  }
                </Text>
                <Ionicons 
                  name={showBucketSelector ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#9BA1A6" 
                />
              </TouchableOpacity>
            </View>
            
            {showBucketSelector && (
              <View style={styles.bucketList}>
                {bucketsLoading ? (
                  <ActivityIndicator color="#60A5FA" />
                ) : buckets.length === 0 ? (
                  <Text style={styles.noBucketsText}>No buckets available. Create a bucket first.</Text>
                ) : (
                  buckets.map((bucket) => (
                    <TouchableOpacity
                      key={bucket.id}
                      style={[
                        styles.bucketOption,
                        formData.bucketId === bucket.id && styles.bucketOptionSelected
                      ]}
                      onPress={() => {
                        updateFormData('bucketId', bucket.id);
                        setShowBucketSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.bucketOptionText,
                        formData.bucketId === bucket.id && styles.bucketOptionTextSelected
                      ]}>
                        {bucket.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Ionicons name="pricetag" size={16} color="#60A5FA" />
              <TextInput
                style={styles.detailInput}
                placeholder="Category"
                placeholderTextColor="#9BA1A6"
                value={formData.category}
                onChangeText={(value) => updateFormData('category', value)}
                maxLength={25}
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
                maxLength={40}
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
            maxLength={500}
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
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#666', '#666'] : ['#8EC5FC', '#E0C3FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>Create Challenge</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  bucketSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    marginLeft: 8,
    paddingVertical: 4,
  },
  bucketSelectorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  bucketList: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    maxHeight: 150,
  },
  bucketOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  bucketOptionSelected: {
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
  },
  bucketOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  bucketOptionTextSelected: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  noBucketsText: {
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
});
