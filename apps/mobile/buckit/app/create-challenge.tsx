import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useBuckets } from '@/hooks/useBuckets';
import LocationPicker from '@/components/LocationPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path } from 'react-native-svg';

const BucketIcon = ({ size = 20, color = '#8EC5FC' }) => (
  <Svg width={size} height={size * 0.6} viewBox="0 0 159 171" fill="none">
    <Path 
      d="M20.0024 5H138.036C147.013 5.00009 153.979 12.8323 152.933 21.748L137.565 152.748C136.678 160.304 130.275 166 122.667 166H35.3716C27.7635 166 21.3597 160.304 20.4731 152.748L5.10498 21.748C4.05899 12.8323 11.0256 5.00009 20.0024 5Z" 
      fill={color}
    />
  </Svg>
);

export default function CreateChallengeScreen() {
  const router = useRouter();
  const { bucketId } = useLocalSearchParams();
  const { buckets, loading: bucketsLoading } = useBuckets();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    targetDate: null as Date | null,
    bucketId: bucketId as string || '',
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number };
    address?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Please enter a challenge title');
      return;
    }
    
    if (!formData.description) {
      Alert.alert('Error', 'Please enter a description for your challenge');
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
        p_location_name: selectedLocation?.name || formData.location,
        p_location_point: selectedLocation ? 
          `POINT(${selectedLocation.coordinates.longitude} ${selectedLocation.coordinates.latitude})` : 
          null,
        p_target_date: formData.targetDate ? formData.targetDate.toISOString() : null
      });

      // If we have a target date, update the item with the deadline
      if (data && formData.targetDate) {
        const { error: updateError } = await supabase
          .from('items')
          .update({ deadline: formData.targetDate.toISOString().split('T')[0] })
          .eq('id', data);
        
        if (updateError) {
          console.error('Error updating deadline:', updateError);
          // Don't fail the whole operation, just log the error
        }
      }

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

  const updateFormData = (key: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const selectBucket = (bucketId: string) => {
    // Don't allow changing bucket if it was pre-selected
    if (bucketId && formData.bucketId === bucketId) {
      return;
    }
    setFormData(prev => ({ ...prev, bucketId }));
    setShowBucketModal(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'None yet!';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      updateFormData('targetDate', selectedDate);
    }
  };

  const clearTargetDate = () => {
    setFormData(prev => ({ ...prev, targetDate: null }));
    setShowDatePicker(false);
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
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Hike Mt. Tam"
              placeholderTextColor="#9BA1A6"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bucket *</Text>
            {bucketId ? (
              <View style={[styles.bucketButton, styles.bucketButtonDisabled]}>
                <BucketIcon size={20} color="#8EC5FC" />
                <Text style={styles.bucketButtonText}>
                  {buckets.find(b => b.id === formData.bucketId)?.title || 'Loading...'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.bucketButton}
                onPress={() => setShowBucketModal(true)}
              >
                <BucketIcon size={20} color="#8EC5FC" />
                <Text style={styles.bucketButtonText}>
                  {formData.bucketId ? 
                    buckets.find(b => b.id === formData.bucketId)?.title || 'Select Bucket' : 
                    'Select Bucket'
                  }
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#8EC5FC" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Adventure, Fitness, Learning"
              placeholderTextColor="#9BA1A6"
              value={formData.category}
              onChangeText={(value) => updateFormData('category', value)}
              maxLength={25}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <LocationPicker
              value={selectedLocation}
              onLocationSelect={(location) => {
                setSelectedLocation(location);
                updateFormData('location', location?.name || '');
              }}
              placeholder="Search for a location..."
              style={styles.locationPicker}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#8EC5FC" />
              <Text style={[styles.dateButtonText, !formData.targetDate && styles.noDateText]}>
                {formatDate(formData.targetDate)}
              </Text>
              {formData.targetDate ? (
                <TouchableOpacity 
                  style={styles.clearDateButton}
                  onPress={clearTargetDate}
                >
                  <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="chevron-forward" size={16} color="#8EC5FC" />
              )}
            </TouchableOpacity>
          </View>

          {/* Date Picker - Shows when showDatePicker is true */}
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={formData.targetDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
              <View style={styles.datePickerActions}>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your challenge..."
              placeholderTextColor="#9BA1A6"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>Create Challenge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Bucket Selection Modal - Only show if no bucket pre-selected */}
      {!bucketId && (
        <Modal
          visible={showBucketModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBucketModal(false)}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bucket</Text>
              <TouchableOpacity 
                onPress={() => setShowBucketModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.bucketsList}>
              {bucketsLoading ? (
                <ActivityIndicator color="#8EC5FC" style={styles.loadingIndicator} />
              ) : buckets.length === 0 ? (
                <Text style={styles.noBucketsText}>No buckets available. Create a bucket first.</Text>
              ) : (
                buckets.map((bucket) => (
                  <TouchableOpacity
                    key={bucket.id}
                    style={[styles.bucketItem, formData.bucketId === bucket.id && styles.bucketItemSelected]}
                    onPress={() => selectBucket(bucket.id)}
                  >
                    <BucketIcon size={24} color="#8EC5FC" />
                    <Text style={styles.bucketItemName}>{bucket.title}</Text>
                    {formData.bucketId === bucket.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#8EC5FC" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
        </Modal>
      )}

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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  bucketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bucketButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.7,
  },
  bucketButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 56,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#8EC5FC',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  bucketsList: {
    maxHeight: 400,
  },
  bucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  bucketItemSelected: {
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
  },
  bucketItemName: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  noBucketsText: {
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  noDateText: {
    color: '#9BA1A6',
    fontStyle: 'italic',
  },
  clearDateButton: {
    padding: 4,
  },
  datePickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  datePickerButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 8,
  },
  datePickerButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationPicker: {
    flex: 1,
  },
});