import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBuckets } from '@/hooks/useBuckets';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useBucketCollaborators } from '@/hooks/useBucketCollaborators';
import { useState, useEffect } from 'react';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with padding

export default function MyBuckets() {
  const router = useRouter();
  const { buckets, loading, refresh } = useBuckets();
  const { getCollaborators } = useBucketCollaborators();
  const [bucketCollaborators, setBucketCollaborators] = useState<{[key: string]: any[]}>({});

  // Fetch collaborators for all buckets
  useEffect(() => {
    const fetchAllCollaborators = async () => {
      if (buckets.length > 0) {
        const collaboratorsMap: {[key: string]: any[]} = {};
        
        for (const bucket of buckets) {
          try {
            const collaborators = await getCollaborators(bucket.id);
            collaboratorsMap[bucket.id] = collaborators;
          } catch (error) {
            console.error(`Error fetching collaborators for bucket ${bucket.id}:`, error);
            collaboratorsMap[bucket.id] = [];
          }
        }
        
        setBucketCollaborators(collaboratorsMap);
      }
    };
    
    fetchAllCollaborators();
  }, [buckets, getCollaborators]);

  // Pull to refresh functionality
  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh buckets data
      refresh();
      // Also refresh collaborators
      if (buckets.length > 0) {
        const collaboratorsMap: {[key: string]: any[]} = {};
        
        for (const bucket of buckets) {
          try {
            const collaborators = await getCollaborators(bucket.id);
            collaboratorsMap[bucket.id] = collaborators;
          } catch (error) {
            console.error(`Error fetching collaborators for bucket ${bucket.id}:`, error);
            collaboratorsMap[bucket.id] = [];
          }
        }
        
        setBucketCollaborators(collaboratorsMap);
      }
    },
    minDuration: 1000, // 1 second minimum for smooth transition
  });

  const handleBucketPress = (bucketId: string) => {
    router.push(`/buckets/${bucketId}`);
  };

  const handleAddBucket = () => {
    router.push('/create-bucket');
  };

  const renderBucketCard = (bucket: any) => {
    // Use cover_url if available, otherwise use a placeholder
    const imageSource = bucket.cover_url 
      ? { uri: bucket.cover_url }
      : { uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24' }; // Default placeholder

    const collaborators = bucketCollaborators[bucket.id] || [];
    const hasCollaborators = collaborators.length > 0;

    return (
      <TouchableOpacity
        key={bucket.id}
        style={styles.bucketCard}
        onPress={() => handleBucketPress(bucket.id)}
      >
        <Image source={imageSource} style={styles.bucketImage} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bucketGradient}
        />
        
        {/* Collaborators Section */}
        {hasCollaborators && (
          <View style={styles.collaboratorsSection}>
            <View style={styles.collaboratorsHeader}>
              <Ionicons name="people" size={14} color="#8EC5FC" />
              <Text style={styles.collaboratorsCount}>{collaborators.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collaboratorsList}>
              {collaborators.slice(0, 3).map((collaborator) => (
                <View key={collaborator.id} style={styles.collaboratorAvatar}>
                  {collaborator.avatar_url ? (
                    <Image source={{ uri: collaborator.avatar_url }} style={styles.collaboratorAvatarImage} />
                  ) : (
                    <View style={styles.collaboratorAvatarPlaceholder}>
                      <Text style={styles.collaboratorAvatarText}>
                        {collaborator.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {collaborators.length > 3 && (
                <View style={styles.moreCollaborators}>
                  <Text style={styles.moreCollaboratorsText}>+{collaborators.length - 3}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
        
        {/* Bucket Info */}
        <View style={styles.bucketInfo}>
          <View style={styles.bucketTitleRow}>
            <Text style={styles.bucketTitle}>{bucket.title}</Text>
            {bucket.is_collaborator && (
              <View style={styles.collaboratorIcon}>
                <Ionicons name="people" size={12} color="#8EC5FC" />
              </View>
            )}
          </View>
          <Text style={styles.bucketChallenges}>{bucket.challenge_count} Challenges</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-outline" size={64} color="#666" />
      <Text style={styles.emptyStateTitle}>No Buckets Yet</Text>
      <Text style={styles.emptyStateSubtitle}>Create your first bucket to get started!</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#8EC5FC" />
      <Text style={styles.loadingText}>Loading your buckets...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Navigation Header - No back button, tab bar persists */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>My Buckets</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddBucket}>
          <Ionicons name="add" size={24} color="#8EC5FC" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {loading ? (
          renderLoadingState()
        ) : buckets.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.gridContainer}>
            {buckets.map(renderBucketCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for tab bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    borderRadius: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    minHeight: 400, // Ensure minimum height for proper scrolling
  },
  bucketCard: {
    width: cardWidth,
    height: 280,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  bucketImage: {
    width: '100%',
    height: '100%',
  },
  bucketGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  participantInfo: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  bucketInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bucketTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bucketTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  collaboratorIcon: {
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    borderRadius: 8,
    padding: 4,
    marginTop: 2,
  },
  bucketChallenges: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Collaborator styles
  collaboratorsSection: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 8,
  },
  collaboratorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  collaboratorsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8EC5FC',
    marginLeft: 4,
  },
  collaboratorsList: {
    flexDirection: 'row',
  },
  collaboratorAvatar: {
    marginRight: 6,
  },
  collaboratorAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  collaboratorAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8EC5FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collaboratorAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  moreCollaborators: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(142, 197, 252, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCollaboratorsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8EC5FC',
  },
});
