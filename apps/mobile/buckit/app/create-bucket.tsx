import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import BucketVisibilitySelector from '@/components/BucketVisibilitySelector';
import FriendsSelectionModal from '@/components/FriendsSelectionModal';
import { useBucketCollaborators } from '@/hooks/useBucketCollaborators';

export default function CreateBucketScreen() {
  const router = useRouter();
  const { edit, bucketId, title, description, coverUrl, visibility } = useLocalSearchParams();
  const isEditMode = edit === 'true';
  
  const [formData, setFormData] = useState({
    title: (title as string) || '',
    description: (description as string) || '',
    photo: (coverUrl as string) || null,
    visibility: (visibility as 'public' | 'private') || 'private',
    invitedFriends: [] as Array<{id: string, full_name: string, handle: string, avatar_url?: string}>,
  });
  const [loading, setLoading] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const { getCollaborators, removeCollaborator } = useBucketCollaborators();
  const [existingCollaborators, setExistingCollaborators] = useState<any[]>([]);

  // Fetch existing collaborators when in edit mode
  useEffect(() => {
    const fetchExistingCollaborators = async () => {
      if (isEditMode && bucketId) {
        try {
          const collaborators = await getCollaborators(bucketId as string);
          setExistingCollaborators(collaborators);
        } catch (error) {
          console.error('Error fetching existing collaborators:', error);
        }
      }
    };
    fetchExistingCollaborators();
  }, [isEditMode, bucketId, getCollaborators]);

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!bucketId) return;
    
    try {
      const success = await removeCollaborator(bucketId as string, collaboratorId);
      if (success) {
        // Remove from local state
        setExistingCollaborators(prev => 
          prev.filter(collab => collab.user_id !== collaboratorId)
        );
        Alert.alert('Success', 'Collaborator removed successfully');
      } else {
        Alert.alert('Error', 'Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator');
    }
  };

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
      if (isEditMode && bucketId) {
        // Update existing bucket
        console.log('Updating bucket using direct update...');
        
        const { error } = await supabase
          .from('buckets')
          .update({
            title: formData.title,
            description: formData.description,
            cover_url: formData.photo,
            visibility: formData.visibility
          })
          .eq('id', bucketId);

        if (error) {
          console.error('Error updating bucket:', error);
          Alert.alert('Error', `Failed to update bucket: ${error.message}`);
          return;
        }

        console.log('Bucket updated successfully');
        Alert.alert('Success', 'Bucket updated successfully!');
        router.back();
      } else {
        // Create new bucket
        console.log('Creating bucket using RPC function...');
        
        const { data, error } = await supabase.rpc('create_bucket_secure', {
          p_title: formData.title,
          p_description: formData.description || null,
          p_visibility: formData.visibility
        });

        if (error) {
          console.error('Error creating bucket:', error);
          Alert.alert('Error', `Failed to create bucket: ${error.message}`);
          return;
        }

        // Update the bucket with cover photo
        if (data && formData.photo) {
          const { error: updateError } = await supabase
            .from('buckets')
            .update({ cover_url: formData.photo })
            .eq('id', data);
          
          if (updateError) {
            console.error('Error updating bucket photo:', updateError);
            // Don't fail the whole operation, just log the error
          }
        }

        console.log('Bucket created successfully with ID:', data);
        
        // Add collaborators if any were selected
        if (formData.invitedFriends.length > 0 && data) {
          console.log('Adding collaborators...');
          for (const friend of formData.invitedFriends) {
            try {
              const { error: collaboratorError } = await supabase.rpc('add_bucket_collaborator', {
                p_bucket_id: data,
                p_user_id: friend.id
              });
              
              if (collaboratorError) {
                console.error('Error adding collaborator:', friend.full_name, collaboratorError);
                // Don't fail the whole operation, just log the error
              } else {
                console.log('Added collaborator:', friend.full_name);
              }
            } catch (error) {
              console.error('Unexpected error adding collaborator:', friend.full_name, error);
            }
          }
        }
        
        Alert.alert('Success', 'Bucket created successfully!');
        router.back();
      }
    } catch (error) {
      console.error('Error saving bucket:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} bucket. Please try again.`);
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

  const handleFriendsSelected = (selectedFriends: Array<{id: string, full_name: string, handle: string, avatar_url?: string}>) => {
    setFormData(prev => ({
      ...prev,
      invitedFriends: selectedFriends
    }));
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
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Bucket' : 'Create Bucket'}</Text>
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
            <Text style={styles.inputLabel}>Visibility</Text>
            <BucketVisibilitySelector
              selectedVisibility={formData.visibility}
              onVisibilityChange={(visibility) => updateFormData('visibility', visibility)}
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
                      {friend.avatar_url ? (
                        <Image 
                          source={{ uri: friend.avatar_url }} 
                          style={styles.friendAvatar} 
                        />
                      ) : (
                        <View style={styles.friendAvatarPlaceholder}>
                          <Text style={styles.friendAvatarText}>
                            {friend.full_name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.friendName}>{friend.full_name}</Text>
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

          {/* Debug Section (Edit Mode Only) */}
          {isEditMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Debug Info</Text>
              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>Bucket ID: {bucketId}</Text>
                <Text style={styles.debugText}>Collaborators Count: {existingCollaborators.length}</Text>
                <Text style={styles.debugText}>Raw Data: {JSON.stringify(existingCollaborators, null, 2)}</Text>
              </View>
            </View>
          )}

          {/* Existing Collaborators Section (Edit Mode Only) */}
          {isEditMode && existingCollaborators.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Collaborators</Text>
              <View style={styles.collaboratorsContainer}>
                {existingCollaborators.map((collaborator) => (
                  <View key={collaborator.id} style={styles.collaboratorItem}>
                    <View style={styles.collaboratorInfo}>
                      {collaborator.avatar_url ? (
                        <Image 
                          source={{ uri: collaborator.avatar_url }} 
                          style={styles.collaboratorAvatar} 
                        />
                      ) : (
                        <View style={styles.collaboratorAvatarPlaceholder}>
                          <Text style={styles.collaboratorAvatarText}>
                            {collaborator.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.collaboratorDetails}>
                        <Text style={styles.collaboratorName}>{collaborator.full_name}</Text>
                        <Text style={styles.collaboratorHandle}>@{collaborator.handle}</Text>
                        <Text style={styles.collaboratorRole}>Role: {collaborator.role}</Text>
                        <Text style={styles.collaboratorStatus}>✓ Active Collaborator</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveCollaborator(collaborator.user_id)}
                      style={styles.removeCollaboratorButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
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
            <Text style={styles.saveButtonText}>{isEditMode ? 'Update Bucket' : 'Create Bucket'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Friends Selection Modal */}
      <FriendsSelectionModal
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        onConfirm={handleFriendsSelected}
        initialSelectedFriends={formData.invitedFriends}
      />
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
  friendAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
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
  // Collaborator styles
  collaboratorsContainer: {
    marginTop: 8,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 197, 252, 0.2)',
  },
  collaboratorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collaboratorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  collaboratorAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  collaboratorAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  collaboratorDetails: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  collaboratorHandle: {
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 2,
  },
  collaboratorRole: {
    fontSize: 12,
    color: '#8EC5FC',
    marginBottom: 2,
  },
  collaboratorStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  removeCollaboratorButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  // Debug styles
  debugContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#9BA1A6',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
