import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Image, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSession } from '@/hooks/useSession';
import { useMe } from '@/hooks/useMe';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const router = useRouter();
  const { user, isSessionValid, signOut } = useSession();
  const { me, loading, refresh } = useMe();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const countryCodes = [
    { code: '+1', country: 'US/CA' },
    { code: '+44', country: 'UK' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+81', country: 'Japan' },
    { code: '+86', country: 'China' },
    { code: '+91', country: 'India' },
    { code: '+61', country: 'Australia' },
    { code: '+55', country: 'Brazil' },
    { code: '+52', country: 'Mexico' },
  ];
  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    location: '',
    phone_number: '',
    birthday: '',
  });
  const [originalData, setOriginalData] = useState({
    full_name: '',
    handle: '',
    location: '',
    phone_number: '',
    birthday: '',
  });

  useEffect(() => {
    if (!user || !isSessionValid) {
      router.replace('/splash');
    }
  }, [user, isSessionValid, router]);

  useEffect(() => {
    if (me) {
      const userData = {
        full_name: me.full_name || '',
        handle: me.handle || '',
        location: me.location || '',
        phone_number: me.phone_number || '',
        birthday: me.birthday || '',
      };
      setFormData(userData);
      setOriginalData(userData);
    }
  }, [me]);

  const validateForm = () => {
    // Basic validation
    if (formData.handle && formData.handle.length < 3) {
      Alert.alert('Validation Error', 'Handle must be at least 3 characters long');
      return false;
    }
    
    if (formData.handle && !/^[a-zA-Z0-9_]+$/.test(formData.handle)) {
      Alert.alert('Validation Error', 'Handle can only contain letters, numbers, and underscores');
      return false;
    }

    // Phone number validation (optional but if provided, should be valid)
    if (formData.phone_number && !isValidPhoneNumber(formData.phone_number)) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }

    // Birthday validation (optional but if provided, should be valid date)
    if (formData.birthday && !isValidDate(formData.birthday)) {
      Alert.alert('Validation Error', 'Please enter a valid birthday (YYYY-MM-DD)');
      return false;
    }

    return true;
  };

  const isValidPhoneNumber = (phone: string) => {
    // Check if it's 10 digits (US phone number)
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const isValidDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      return false;
    }
    
    // Check if date is not in the future
    if (date > today) {
      return false;
    }
    
    // Check if date is not too far in the past (reasonable age limit)
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 120); // 120 years ago
    if (date < minDate) {
      return false;
    }
    
    return true;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFormData({ ...formData, birthday: formattedDate });
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // If no digits, return empty string
    if (digits.length === 0) {
      return '';
    }
    
    // Return just the digits (no formatting)
    return digits;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!me?.id) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Settings: Updating user data:', {
        id: me.id,
        full_name: formData.full_name.trim() || null,
        handle: formData.handle.trim() || null,
        location: formData.location.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        birthday: formData.birthday.trim() || null,
      });

      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name.trim() || null,
          handle: formData.handle.trim() || null,
          location: formData.location.trim() || null,
          phone_number: formData.phone_number.trim() || null,
          birthday: formData.birthday.trim() || null,
        })
        .eq('id', me.id);

      if (error) {
        console.error('Update error:', error);
        Alert.alert('Error', `Failed to update profile: ${error.message}`);
        return;
      }

      console.log('Settings: User data updated successfully');

      // Update original data to reflect the saved state
      setOriginalData({ ...formData });
      setIsEditing(false);
      
      // Refresh user data to ensure UI is updated
      refresh();
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    setFormData({ ...originalData });
    setIsEditing(false);
  };

  const hasChanges = () => {
    return (
      formData.full_name !== originalData.full_name ||
      formData.handle !== originalData.handle ||
      formData.location !== originalData.location ||
      formData.phone_number !== originalData.phone_number ||
      formData.birthday !== originalData.birthday
    );
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required', 
          'Permission to access camera roll is required to change your avatar. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      // Create a unique filename and determine proper MIME type
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${me?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Map file extensions to proper MIME types
      const mimeTypeMap: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp'
      };
      
      const contentType = mimeTypeMap[fileExt] || 'image/jpeg';

      // For React Native, we can use the imageUri directly with fetch
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
          contentType: contentType,
          upsert: true
        });

      if (error) {
        console.error('Upload error:', error);
        Alert.alert('Error', 'Failed to upload image');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user's avatar_url in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', me?.id);

      if (updateError) {
        console.error('Update error:', updateError);
        Alert.alert('Error', 'Failed to update avatar');
        return;
      }

      // Refresh user data
      refresh();
      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!user || !isSessionValid) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {me?.avatar_url ? (
              <Image source={{ uri: me.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#9BA1A6" />
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.changeAvatarButton}
            onPress={pickImage}
            disabled={isUploadingImage}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color="#9BA1A6" />
            ) : (
              <Text style={styles.changeAvatarText}>Change Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <TouchableOpacity 
          style={styles.formContainer}
          activeOpacity={1}
          onPress={closeDatePicker}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <TextInput
                style={styles.textInput}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter your full name"
                placeholderTextColor="#6b7280"
                editable={isEditing}
                onFocus={closeDatePicker}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Handle</Text>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <TextInput
                style={styles.textInput}
                value={formData.handle}
                onChangeText={(text) => setFormData({ ...formData, handle: text })}
                placeholder="Enter your handle"
                placeholderTextColor="#6b7280"
                editable={isEditing}
                onFocus={closeDatePicker}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <TextInput
                style={styles.textInput}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Enter your location"
                placeholderTextColor="#6b7280"
                editable={isEditing}
                onFocus={closeDatePicker}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.phoneInputWrapper}>
                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity 
                    style={[styles.countryCodeContainer, !isEditing && styles.countryCodeDisabled]}
                    onPress={isEditing ? () => setShowCountryPicker(!showCountryPicker) : undefined}
                    disabled={!isEditing}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                    {isEditing && <Ionicons name="chevron-down" size={16} color="#9BA1A6" />}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.phoneTextInput}
                    value={formData.phone_number}
                    onChangeText={(text) => setFormData({ ...formData, phone_number: formatPhoneNumber(text) })}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#6b7280"
                    editable={isEditing}
                    keyboardType="phone-pad"
                    onFocus={closeDatePicker}
                  />
                </View>
                <Modal
                  visible={showCountryPicker && isEditing}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowCountryPicker(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowCountryPicker(false)}
                  >
                    <View style={styles.countryPickerModal}>
                      <View style={styles.countryPickerHeader}>
                        <Text style={styles.countryPickerTitle}>Select Country Code</Text>
                        <TouchableOpacity 
                          onPress={() => setShowCountryPicker(false)}
                          style={styles.closeButton}
                        >
                          <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.countryPickerList}>
                        {countryCodes.map((country) => (
                          <TouchableOpacity
                            key={country.code}
                            style={[
                              styles.countryOption,
                              countryCode === country.code && styles.countryOptionSelected
                            ]}
                            onPress={() => {
                              setCountryCode(country.code);
                              setShowCountryPicker(false);
                            }}
                          >
                            <Text style={styles.countryOptionText}>{country.code}</Text>
                            <Text style={styles.countryOptionCountry}>{country.country}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Birthday</Text>
            <TouchableOpacity 
              style={[styles.textInput, styles.dateInput, !isEditing && styles.textInputDisabled]}
              onPress={isEditing ? openDatePicker : undefined}
              disabled={!isEditing}
              activeOpacity={1}
            >
              <Text style={[styles.dateText, !formData.birthday && styles.placeholderText]}>
                {formData.birthday || 'Select your birthday'}
              </Text>
              {isEditing && (
                <Ionicons name="calendar-outline" size={20} color="#9BA1A6" />
              )}
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={formData.birthday ? new Date(formData.birthday) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}
          </View>

        </TouchableOpacity>

        {/* Action Buttons */}
        <TouchableOpacity 
          style={styles.actionButtons}
          activeOpacity={1}
          onPress={closeDatePicker}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {isEditing ? (
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.saveButton, 
                    (!hasChanges() || isSaving) && styles.saveButtonDisabled
                  ]} 
                  onPress={handleSave}
                  disabled={!hasChanges() || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="mail-outline" size={20} color="#9BA1A6" />
            <Text style={styles.settingItemText}>Email</Text>
          </View>
          <View style={styles.settingItemRight}>
            <Text style={styles.settingItemValue}>{user.email}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#9BA1A6" />
            <Text style={styles.settingItemText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="notifications-outline" size={20} color="#9BA1A6" />
            <Text style={styles.settingItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </TouchableOpacity>
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#9BA1A6" />
            <Text style={styles.settingItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="information-circle-outline" size={20} color="#9BA1A6" />
            <Text style={styles.settingItemText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={async () => {
            try {
              console.log('Settings: Starting sign out...');
              await signOut();
              console.log('Settings: Sign out completed');
            } catch (error) {
              console.error('Settings: Sign out error:', error);
            }
          }}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  headerRight: {
    width: 40,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#EAEAEA',
    fontFamily: 'Poppins',
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  changeAvatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  changeAvatarText: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textInputDisabled: {
    opacity: 0.6,
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    color: '#6b7280',
  },
  actionButtons: {
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6b7280',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginLeft: 12,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemValue: {
    fontSize: 14,
    color: '#9BA1A6',
    marginRight: 8,
  },
  phoneInputWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 1,
    borderRightColor: '#4b5563',
  },
  countryCodeDisabled: {
    opacity: 0.6,
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  countryPickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    width: '100%',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  countryPickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  countryPickerList: {
    maxHeight: 300,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  countryOptionSelected: {
    backgroundColor: '#374151',
  },
  countryOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  countryOptionCountry: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: '#8EC5FC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
