import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

export default function CreateBucketScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    photo: null as string | null,
    invitedFriends: [] as Array<{id: string, name: string, avatar?: string}>,
  });
  const [loading, setLoading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  // Dummy friends data - in real app this would come from your friends list
  const friends = [
    { id: '1', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
    { id: '2', name: 'Sarah Johnson', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' },
    { id: '3', name: 'Mike Rodriguez', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { id: '4', name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
    { id: '5', name: 'David Kim', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
  ];

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Please enter a bucket title');
      return;
    }
    
    if (!formData.photo) {
      Alert.alert('Error', 'Please select a photo for your bucket');
      return;
    }
    
    if (!formData.description) {
      Alert.alert('Error', 'Please enter a description for your bucket');
      return;
    }
    
    setLoading(true);
    try {
      // Use the existing RPC function instead of direct table insert
      // This bypasses RLS policies by using a SECURITY DEFINER function
      console.log('Creating bucket using RPC function...');
      
      const { data, error } = await supabase.rpc('create_bucket_secure', {
        p_title: formData.title,
        p_description: formData.description || null,
        p_visibility: 'private'
      });

      if (error) {
        console.error('Error creating bucket:', error);
        Alert.alert('Error', `Failed to create bucket: ${error.message}`);
        return;
      }

      console.log('Bucket created successfully with ID:', data);
      Alert.alert('Success', 'Bucket created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating bucket:', error);
      Alert.alert('Error', 'Failed to create bucket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to select a photo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
    }
  };

  const toggleFriend = (friend: {id: string, name: string, avatar?: string}) => {
    setFormData(prev => {
      const isSelected = prev.invitedFriends.some(f => f.id === friend.id);
      if (isSelected) {
        return {
          ...prev,
          invitedFriends: prev.invitedFriends.filter(f => f.id !== friend.id)
        };
      } else {
        return {
          ...prev,
          invitedFriends: [...prev.invitedFriends, friend]
        };
      }
    });
  };

  const removeFriend = (friendId: string) => {
    setFormData(prev => ({
      ...prev,
      invitedFriends: prev.invitedFriends.filter(f => f.id !== friendId)
    }));
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
        <Text style={styles.headerTitle}>Create Bucket</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo Upload Section */}
        <View style={styles.photoSection}>
          <Text style={styles.photoLabel}>Cover *</Text>
          <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
            {formData.photo ? (
              <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#8EC5FC" />
                <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Adventure Goals"
              placeholderTextColor="#9BA1A6"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your bucket list..."
              placeholderTextColor="#9BA1A6"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Invite Friends</Text>
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={() => setShowFriendsModal(true)}
            >
              <Ionicons name="people" size={20} color="#8EC5FC" />
              <Text style={styles.inviteButtonText}>
                {formData.invitedFriends.length > 0 
                  ? `${formData.invitedFriends.length} friend${formData.invitedFriends.length > 1 ? 's' : ''} selected`
                  : 'Select friends to invite'
                }
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#8EC5FC" />
            </TouchableOpacity>
            
            {/* Selected Friends Preview */}
            {formData.invitedFriends.length > 0 && (
              <View style={styles.selectedFriendsContainer}>
                <Text style={styles.selectedFriendsLabel}>Invited:</Text>
                <View style={styles.selectedFriendsList}>
                  {formData.invitedFriends.map((friend) => (
                    <View key={friend.id} style={styles.selectedFriendItem}>
                      <Image 
                        source={{ uri: friend.avatar || 'https://via.placeholder.com/30' }} 
                        style={styles.friendAvatar} 
                      />
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <TouchableOpacity 
                        onPress={() => removeFriend(friend.id)}
                        style={styles.removeFriendButton}
                      >
                        <Ionicons name="close" size={16} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
            <Text style={styles.saveButtonText}>Create Bucket</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Friends Selection Modal */}
      <Modal
        visible={showFriendsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Friends</Text>
              <TouchableOpacity 
                onPress={() => setShowFriendsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.friendsList}>
              {friends.map((friend) => {
                const isSelected = formData.invitedFriends.some(f => f.id === friend.id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                    onPress={() => toggleFriend(friend)}
                  >
                    <Image 
                      source={{ uri: friend.avatar }} 
                      style={styles.friendItemAvatar} 
                    />
                    <Text style={styles.friendItemName}>{friend.name}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#8EC5FC" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => setShowFriendsModal(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  photoSection: {
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#8EC5FC',
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#8EC5FC',
    marginTop: 8,
    fontWeight: '500',
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
  // Friends invitation styles
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inviteButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  selectedFriendsContainer: {
    marginTop: 12,
  },
  selectedFriendsLabel: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 8,
  },
  selectedFriendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  friendName: {
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  removeFriendButton: {
    padding: 2,
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
  friendsList: {
    maxHeight: 400,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
  },
  friendItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendItemName: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  doneButton: {
    backgroundColor: '#8EC5FC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
