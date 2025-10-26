import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Animated, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useState, useRef, useEffect } from 'react';
import { useBucket } from '@/hooks/useBucket';
import { useSharedCompletions } from '@/hooks/useSharedCompletions';
import { supabase } from '@/lib/supabase';
import LocationPicker from '@/components/LocationPicker';
import SharedPhotoAlbum from '@/components/SharedPhotoAlbum';
import CompletionRatingModal from '@/components/CompletionRatingModal';
import ChallengeDetailModal from '@/components/ChallengeDetailModal';
import ViewOnlyChallengeCard from '@/components/ViewOnlyChallengeCard';
import ViewOnlyChallengeModal from '@/components/ViewOnlyChallengeModal';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useBucketCollaborators } from '@/hooks/useBucketCollaborators';

const { width, height } = Dimensions.get('window');

export default function BucketDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { bucket, items, loading, error, recalculateCount } = useBucket(id as string);
  const { 
    completions, 
    stats, 
    rateCompletion, 
    getPhotosForItem, 
    getAverageRatingForItem 
  } = useSharedCompletions(id as string);
  const { getCollaborators } = useBucketCollaborators();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [challengeToRate, setChallengeToRate] = useState<any>(null);
  const [tempRating, setTempRating] = useState(0);
  const [completionRatingModalVisible, setCompletionRatingModalVisible] = useState(false);
  const [completionToRate, setCompletionToRate] = useState<any>(null);
  const [challengeDetailModalVisible, setChallengeDetailModalVisible] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [isEditingChallenge, setIsEditingChallenge] = useState(false);
  const [editingData, setEditingData] = useState({
    title: '',
    description: '',
    location: '',
    targetDate: '',
  });
  const [editingLocation, setEditingLocation] = useState<{
    name: string;
    coordinates: { latitude: number; longitude: number };
    address?: string;
  } | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  
  // Pull to refresh functionality
  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      // Recalculate count and refresh data
      await recalculateCount();
      // Also refresh collaborators
      if (id) {
        const collabs = await getCollaborators(id as string);
        setCollaborators(collabs);
      }
    },
    minDuration: 1000, // 1 second minimum for smooth transition
  });

  // Fetch collaborators when component mounts
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (id) {
        const collabs = await getCollaborators(id as string);
        setCollaborators(collabs);
      }
    };
    fetchCollaborators();
  }, [id, getCollaborators]);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;

  // Transform items to challenges format for compatibility
  useEffect(() => {
    if (items) {
      const transformedChallenges = items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        location: item.location_name || '',
        targetDate: item.deadline || '',
        is_completed: item.is_completed,
        satisfaction_rating: item.satisfaction_rating,
        photos: [], // TODO: Add photo support later
      }));
      setChallenges(transformedChallenges);
    }
  }, [items]);

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
    router.push(`/create-challenge?bucketId=${id}`);
  };


  const handleEditToggle = () => {
    if (bucket) {
      // Navigate to create bucket page with pre-filled data
      const params = new URLSearchParams({
        edit: 'true',
        bucketId: bucket.id,
        title: bucket.title || '',
        description: bucket.description || '',
        coverUrl: bucket.cover_url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        visibility: bucket.visibility || 'private',
      });
      router.push(`/create-bucket?${params.toString()}`);
    }
  };

  const handleRatingSubmit = async () => {
    if (tempRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    if (!challengeToRate) {
      Alert.alert('Error', 'No challenge selected for rating.');
      return;
    }

    try {
      // Get user ID
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Use the secure RPC function to update satisfaction rating
      const { error } = await supabase.rpc('update_item_satisfaction_rating', {
        p_item_id: challengeToRate.id,
        p_satisfaction_rating: tempRating,
        p_is_completed: true
      });

      if (error) {
        console.error('Error updating item rating:', error);
        Alert.alert('Error', 'Failed to save rating. Please try again.');
        return;
      }

      // Update local state
      setChallenges(prevChallenges => 
        prevChallenges.map(challenge => 
          challenge.id === challengeToRate.id 
            ? { 
                ...challenge, 
                completed: true,
                satisfaction: tempRating
              }
            : challenge
        )
      );
      
      // Update selected challenge if it's the one being rated
      if (selectedChallenge && selectedChallenge.id === challengeToRate.id) {
        setSelectedChallenge((prev: any) => ({
          ...prev,
          completed: true,
          satisfaction: tempRating
        }));
      }

      // Close modal and reset
      setRatingModalVisible(false);
      setChallengeToRate(null);
      setTempRating(0);
      
      Alert.alert('Challenge Completed!', `You rated "${challengeToRate.title}" ${tempRating} star${tempRating !== 1 ? 's' : ''}!`);
      
      // Refresh the bucket data to get updated counts
      if (recalculateCount) {
        await recalculateCount();
      }
    } catch (error) {
      console.error('Error in handleRatingSubmit:', error);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleRatingCancel = () => {
    setRatingModalVisible(false);
    setChallengeToRate(null);
    setTempRating(0);
  };

  const handleEditChallenge = () => {
    // Only allow editing if user can edit the bucket
    if (!bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only edit challenges in buckets you own or collaborate on.');
      return;
    }
    
    if (selectedChallenge) {
      setIsEditingChallenge(true);
      setEditingData({
        title: selectedChallenge.title,
        description: selectedChallenge.description,
        location: selectedChallenge.location,
        targetDate: selectedChallenge.targetDate,
      });
      // Initialize location data if available
      if (selectedChallenge.location_name) {
        setEditingLocation({
          name: selectedChallenge.location_name,
          coordinates: selectedChallenge.location_point ? {
            latitude: selectedChallenge.location_point.latitude || 0,
            longitude: selectedChallenge.location_point.longitude || 0,
          } : { latitude: 0, longitude: 0 },
          address: selectedChallenge.location_name,
        });
      } else {
        setEditingLocation(null);
      }
    }
  };

  const handleSaveChallenge = async () => {
    if (!selectedChallenge) return;

    try {
      // Update the challenge in the database
      const { error } = await supabase.rpc('update_item_secure', {
        p_item_id: selectedChallenge.id,
        p_title: editingData.title,
        p_description: editingData.description,
        p_location_name: editingLocation?.name || editingData.location,
        p_location_point: editingLocation ? 
          `POINT(${editingLocation.coordinates.longitude} ${editingLocation.coordinates.latitude})` : 
          null
      });

      if (error) {
        console.error('Error updating challenge:', error);
        Alert.alert('Error', 'Failed to update challenge. Please try again.');
        return;
      }

      // Update local state
      setChallenges(prevChallenges => 
        prevChallenges.map(challenge => 
          challenge.id === selectedChallenge.id 
            ? { 
                ...challenge, 
                title: editingData.title,
                description: editingData.description,
                location: editingData.location,
                location_name: editingLocation?.name || editingData.location,
                location_point: editingLocation?.coordinates,
                targetDate: editingData.targetDate,
              }
            : challenge
        )
      );
      
      // Update selected challenge
      setSelectedChallenge((prev: any) => ({
        ...prev,
        title: editingData.title,
        description: editingData.description,
        location: editingData.location,
        location_name: editingLocation?.name || editingData.location,
        location_point: editingLocation?.coordinates,
        targetDate: editingData.targetDate,
      }));

      setIsEditingChallenge(false);
      setEditingData({ title: '', description: '', location: '', targetDate: '' });
      setEditingLocation(null);
      Alert.alert('Challenge Updated', 'Your challenge has been updated successfully!');
    } catch (error) {
      console.error('Error updating challenge:', error);
      Alert.alert('Error', 'Failed to update challenge. Please try again.');
    }
  };

  const handleCancelEditChallenge = () => {
    setIsEditingChallenge(false);
    setEditingData({ title: '', description: '', location: '', targetDate: '' });
    setEditingLocation(null);
  };

  const updateEditingData = (field: string, value: string) => {
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const toggleChallengeCompletion = async (challengeId: string) => {
    // Only allow challenge completion if user can edit the bucket
    if (!bucket?.can_edit) {
      Alert.alert('Access Denied', 'You can only complete challenges in buckets you own or collaborate on.');
      return;
    }
    
    const challenge = challenges.find(c => c.id === challengeId);
    
    if (challenge && !challenge.is_completed) {
      // If completing for the first time, show rating modal directly
      setCompletionToRate({
        id: challengeId, // Use challengeId as temporary ID for rating
        completed_by_name: 'You',
        user_rating: 0,
        user_review: ''
      });
      setCompletionRatingModalVisible(true);
    } else {
      // If uncompleting, update database and local state
      try {
        // Get user ID
        const { data: uid } = await supabase.rpc('me_user_id');
        if (!uid) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        // Use the secure RPC function to uncomplete the item
        const { error } = await supabase.rpc('uncomplete_item', {
          p_item_id: challengeId
        });

        if (error) {
          console.error('Error updating item completion:', error);
          Alert.alert('Error', 'Failed to update challenge. Please try again.');
          return;
        }

        // Update local state
        setChallenges(prevChallenges => 
          prevChallenges.map(challenge => 
            challenge.id === challengeId 
              ? { 
                  ...challenge, 
                  is_completed: false,
                  satisfaction_rating: null
                }
              : challenge
          )
        );
        
        // Update selected challenge if it's the one being toggled
        if (selectedChallenge && selectedChallenge.id === challengeId) {
          setSelectedChallenge((prev: any) => ({
            ...prev,
            is_completed: false,
            satisfaction_rating: null
          }));
        }

        // Refresh the bucket data to get updated counts
        if (recalculateCount) {
          await recalculateCount();
        }
      } catch (error) {
        console.error('Error in toggleChallengeCompletion:', error);
        Alert.alert('Error', 'Failed to update challenge. Please try again.');
      }
    }
  };

  const handleChallengePress = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
    setChallengeDetailModalVisible(true);
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

  // Only show loading screen on initial load, not during refresh
  if (loading && !bucket) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8EC5FC" />
          <Text style={styles.loadingText}>Loading bucket...</Text>
        </View>
      </View>
    );
  }

  if (error || !bucket) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Bucket not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Image source={{ uri: bucket?.cover_url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4' }} style={styles.headerImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
          style={styles.headerGradient}
        />
        
        {/* Navigation */}
        <View style={styles.headerNav}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRightButtons}>
            {bucket?.can_edit && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditToggle}
              >
                <Ionicons name="create-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            {bucket?.can_edit && (
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={() => router.push(`/invite-friends?bucketId=${bucket.id}`)}
              >
                <Ionicons name="people" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bucket Info */}
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketTitle}>{bucket?.title}</Text>
          <Text style={styles.bucketDescription}>{bucket?.description}</Text>
          {bucket?.is_collaborator && (
            <View style={styles.collaborationBadge}>
              <Ionicons name="people" size={16} color="#8EC5FC" />
              <Text style={styles.collaborationText}>Collaborating</Text>
            </View>
          )}
          <View style={styles.bucketMeta}>
            <Text style={styles.createdDate}>Created {new Date(bucket?.created_at).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {/* Collaborators Section */}
      {collaborators.length > 0 && (
        <View style={styles.collaboratorsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color="#8EC5FC" />
            <Text style={styles.sectionTitle}>Collaborators</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collaboratorsList}>
            {collaborators.map((collaborator) => (
              <View key={collaborator.id} style={styles.collaboratorCard}>
                <View style={styles.collaboratorAvatar}>
                  {collaborator.avatar_url ? (
                    <Image source={{ uri: collaborator.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {collaborator.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </Text>
                  )}
                </View>
                <Text style={styles.collaboratorName} numberOfLines={1}>
                  {collaborator.full_name || 'Unknown'}
                </Text>
                <Text style={styles.collaboratorHandle} numberOfLines={1}>
                  @{collaborator.handle || 'unknown'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Challenges List */}
      <ScrollView 
        style={styles.challengesSection} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8EC5FC"
            colors={["#8EC5FC"]}
          />
        }
      >
        {challenges.map((challenge) => {
          if (bucket?.can_edit) {
            // Use interactive challenge card for collaborators
            return (
          <TouchableOpacity
            key={challenge.id}
            style={styles.challengeCard}
            onPress={() => handleChallengePress(challenge.id)}
          >
            {/* Completion Status & Icon */}
            <TouchableOpacity 
              style={[styles.challengeIcon, !bucket?.can_edit && styles.challengeIconDisabled]}
              onPress={(e) => {
                e.stopPropagation();
                if (bucket?.can_edit) {
                  toggleChallengeCompletion(challenge.id);
                }
              }}
              disabled={!bucket?.can_edit}
            >
              {challenge.is_completed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
            
            {/* Challenge Info */}
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeDescription}>{challenge.description}</Text>
              <View style={styles.challengeLocation}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>{challenge.location || 'No location set'}</Text>
              </View>
              <View style={styles.challengeTargetDate}>
                <Text style={styles.targetDatePin}>📅</Text>
                <Text style={styles.targetDateText}>{challenge.targetDate ? `Target: ${new Date(challenge.targetDate).toLocaleDateString()}` : 'None yet!'}</Text>
              </View>
              
              {/* Additional Info Row */}
              <View style={styles.challengeMeta}>
                {/* Satisfaction Rating */}
                {challenge.is_completed && challenge.satisfaction_rating && (
                  <View style={styles.satisfactionContainer}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.satisfactionText}>{challenge.satisfaction_rating}/5</Text>
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
              
              {/* Shared Completions Info */}
              {(() => {
                const itemCompletions = completions.filter(c => c.item_id === challenge.id);
                const photos = getPhotosForItem(challenge.id);
                const averageRating = getAverageRatingForItem(challenge.id);
                
                if (itemCompletions.length > 0) {
                  return (
                    <View style={styles.sharedCompletionsContainer}>
                      <View style={styles.sharedCompletionsHeader}>
                        <Text style={styles.sharedCompletionsTitle}>
                          Shared Completions ({itemCompletions.length})
                        </Text>
                        {averageRating && (
                          <View style={styles.averageRatingContainer}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={styles.averageRatingText}>
                              {averageRating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {photos.length > 0 && (
                        <View style={styles.sharedPhotosPreview}>
                          <Ionicons name="camera" size={12} color="#9BA1A6" />
                          <Text style={styles.sharedPhotosText}>
                            {photos.length} photo{photos.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                }
                return null;
              })()}
            </View>
            
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
            );
          } else {
            // Use view-only challenge card for non-collaborators
            return (
              <ViewOnlyChallengeCard
                key={challenge.id}
                challenge={challenge}
                onPress={() => handleChallengePress(challenge.id)}
              />
            );
          }
        })}
      </ScrollView>

      {/* Shared Photo Album */}
      {completions.length > 0 && (
        <View style={styles.photoAlbumSection}>
          <SharedPhotoAlbum
            photos={completions
              .filter(c => c.photo_url)
              .map(c => ({
                id: c.id,
                url: c.photo_url,
                caption: c.caption,
                completed_by: c.completed_by_name,
                completed_by_avatar: c.completed_by_avatar,
                created_at: c.created_at,
                user_rating: c.user_rating,
                user_review: c.user_review
              }))}
            onRatePhoto={(photoId, rating, review) => {
              rateCompletion(photoId, rating, review);
            }}
            onAddPhoto={async (photoUrl, caption) => {
              // Add photo to the shared album without completing any challenges
              // Photos can be added to the album independently of challenge completion
              try {
                // This would add the photo to the shared album
                // For now, we'll just show a message that photos can be added
                Alert.alert('Photo Added', 'Photo added to the shared album!');
              } catch (error) {
                console.error('Error adding photo:', error);
                Alert.alert('Error', 'Failed to add photo. Please try again.');
              }
            }}
            canAddPhotos={true}
          />
        </View>
      )}

      {/* Floating Add Button - Only show if user can edit */}
      {bucket?.can_edit && (
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddItem}>
          <Ionicons name="add" size={24} color="#8EC5FC" />
        </TouchableOpacity>
      )}

      {/* View Only Challenge Modal for non-editable buckets */}
      {!bucket?.can_edit && (
        <ViewOnlyChallengeModal
          visible={modalVisible}
          challenge={selectedChallenge}
          bucketTitle={bucket?.title}
          onClose={handleCloseModal}
        />
      )}

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRatingCancel}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate Your Experience</Text>
              <Text style={styles.ratingModalSubtitle}>
                How satisfied were you with "{challengeToRate?.title}"?
              </Text>
            </View>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setTempRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons 
                    name={star <= tempRating ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= tempRating ? "#f59e0b" : "#9BA1A6"} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.ratingModalActions}>
              <TouchableOpacity 
                style={styles.ratingCancelButton} 
                onPress={handleRatingCancel}
              >
                <Text style={styles.ratingCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.ratingSubmitButton} 
                onPress={handleRatingSubmit}
              >
                <LinearGradient
                  colors={['#8EC5FC', '#E0C3FC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ratingSubmitGradient}
                >
                  <Text style={styles.ratingSubmitButtonText}>Submit Rating</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Completion Rating Modal */}
      <CompletionRatingModal
        visible={completionRatingModalVisible}
        onClose={() => setCompletionRatingModalVisible(false)}
        onRate={async (rating, review) => {
          if (completionToRate) {
            try {
              // Use the update_item_satisfaction_rating function directly
              const { error } = await supabase.rpc('update_item_satisfaction_rating', {
                p_item_id: completionToRate.id,
                p_satisfaction_rating: rating,
                p_is_completed: true
              });

              if (error) {
                console.error('Error updating satisfaction rating:', error);
                Alert.alert('Error', 'Failed to save rating. Please try again.');
                return;
              }

              // Update local state
              setChallenges(prev => 
                prev.map(c => 
                  c.id === completionToRate.id 
                    ? { ...c, is_completed: true, satisfaction_rating: rating }
                    : c
                )
              );

              // Update selected challenge if it's the one being rated
              if (selectedChallenge && selectedChallenge.id === completionToRate.id) {
                setSelectedChallenge((prev: any) => ({
                  ...prev,
                  is_completed: true,
                  satisfaction_rating: rating
                }));
              }

              // Refresh the bucket data
              if (recalculateCount) {
                await recalculateCount();
              }

              setCompletionToRate(null);
              Alert.alert('Success', 'Challenge completed!');
            } catch (error) {
              console.error('Error in rating submission:', error);
              Alert.alert('Error', 'Failed to complete challenge. Please try again.');
            }
          }
        }}
        currentRating={completionToRate?.user_rating}
        currentReview={completionToRate?.user_review}
        completedByName={completionToRate?.completed_by_name}
      />

      {/* Challenge Detail Modal */}
      <ChallengeDetailModal
        visible={challengeDetailModalVisible}
        challengeId={selectedChallengeId}
        onClose={() => {
          setChallengeDetailModalVisible(false);
          setSelectedChallengeId(null);
        }}
      />
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
    height: 150,
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
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
    alignItems: 'flex-start',
  },
  bucketTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bucketDescription: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'left',
    marginBottom: 12,
    lineHeight: 22,
  },
  collaborationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  collaborationText: {
    fontSize: 14,
    color: '#8EC5FC',
    fontWeight: '600',
    marginLeft: 6,
  },
  bucketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 16,
    color: '#9BA1A6',
  },
  // Rating modal styles
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ratingModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  ratingModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 22,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  ratingCancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  ratingCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSubmitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingSubmitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ratingSubmitButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
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
  challengeIconDisabled: {
    opacity: 0.5,
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
  challengeDescription: {
    fontSize: 13,
    color: '#B0B0B0',
    lineHeight: 18,
    marginBottom: 6,
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
  challengeTargetDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  targetDatePin: {
    fontSize: 12,
    marginRight: 4,
  },
  targetDateText: {
    fontSize: 14,
    color: '#8EC5FC',
    fontWeight: '500',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8EC5FC',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitleSection: {
    flex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalCompletionBadgeDisabled: {
    opacity: 0.5,
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
  modalDescriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalDescriptionText: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 24,
  },
  // Modal editing styles
  modalTitleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDetailInput: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  modalDescriptionInput: {
    fontSize: 16,
    color: '#B0B0B0',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalPhotoAlbumSection: {
    marginBottom: 20,
  },
  photoAlbumSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sharedCompletionsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 197, 252, 0.2)',
  },
  sharedCompletionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sharedCompletionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8EC5FC',
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRatingText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
    fontWeight: '500',
  },
  sharedPhotosPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedPhotosText: {
    fontSize: 11,
    color: '#9BA1A6',
    marginLeft: 4,
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
  modalEditButton: {
    position: 'absolute',
    top: 16,
    right: 64,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLocationPicker: {
    flex: 1,
  },
  // Collaborators section styles
  collaboratorsSection: {
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  collaboratorsList: {
    flexDirection: 'row',
  },
  collaboratorCard: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80,
  },
  collaboratorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  collaboratorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  collaboratorHandle: {
    fontSize: 12,
    color: '#9BA1A6',
    textAlign: 'center',
  },
});
