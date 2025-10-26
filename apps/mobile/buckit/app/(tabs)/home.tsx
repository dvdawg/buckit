import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useLocation } from '@/hooks/useLocation';
import ColdStartModal from '@/components/ColdStartModal';


export default function Home() {
  const { user, isSessionValid } = useSession();
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();
  const [showColdStart, setShowColdStart] = useState(false);
  const [posts, setPosts] = useState([
    {
      id: "1",
      user: {
        name: "Jenny",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786",
      },
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
      title: "At-Home Yoga",
      location: "Home Studio",
      likes: 12,
      comments: 3,
    },
    {
      id: "2", 
      user: {
        name: "Jenny",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786",
      },
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
      title: "Cloud Watching",
      location: "Golden Gate Park",
      likes: 8,
      comments: 1,
    },
  ]);

  // Recommendations
  const { 
    items: recommendations, 
    loading: recommendationsLoading, 
    error: recommendationsError,
    refetch: refetchRecommendations,
    logEvent,
    logView,
    logCompletion
  } = useRecommendations({
    lat: location?.latitude || 0,
    lon: location?.longitude || 0,
    radiusKm: 15,
    k: 20,
    enabled: !!location && !!user
  });

  // Check if user needs cold start
  useEffect(() => {
    if (user && !recommendationsLoading && recommendations.length === 0 && !recommendationsError) {
      setShowColdStart(true);
    }
  }, [user, recommendationsLoading, recommendations.length, recommendationsError]);

  // Pull to refresh functionality
  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh recommendations
      await refetchRecommendations();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would fetch fresh data here
      // For now, we'll just shuffle the existing posts to simulate new content
      setPosts(prevPosts => [...prevPosts].sort(() => Math.random() - 0.5));
    },
    minDuration: 1200, // 1.2 seconds minimum for smooth transition
  });

  useEffect(() => {
    // If no valid session, redirect to splash
    if (!user || !isSessionValid) {
      console.log('Home: No valid session, redirecting to splash');
      router.replace('/splash');
    }
  }, [user, isSessionValid, router]);

  // If no valid session, show loading
  if (!user || !isSessionValid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ColdStartModal
        visible={showColdStart}
        onComplete={(preferences) => {
          setShowColdStart(false);
          refetchRecommendations();
        }}
        onSkip={() => setShowColdStart(false)}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Buckit</Text>
      </View>

      {/* Posts Feed */}
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
        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendationsScroll}>
              {recommendations.slice(0, 10).map((rec, index) => (
                <TouchableOpacity
                  key={rec.id}
                  style={styles.recommendationCard}
                  onPress={() => {
                    logView(rec.id);
                    // Navigate to item detail
                    router.push(`/buckets/${rec.id}`);
                  }}
                >
                  <View style={styles.recommendationScore}>
                    <Text style={styles.scoreText}>{Math.round(rec.score * 100)}%</Text>
                  </View>
                  <Text style={styles.recommendationTitle} numberOfLines={2}>
                    Item {rec.id.slice(0, 8)}
                  </Text>
                  <View style={styles.reasonTags}>
                    {rec.reasons.trait > 0.5 && <Text style={styles.reasonTag}>Personal</Text>}
                    {rec.reasons.social > 0.3 && <Text style={styles.reasonTag}>Social</Text>}
                    {rec.reasons.appeal > 0.7 && <Text style={styles.reasonTag}>Popular</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {posts.map((post) => (
        <View key={post.id} style={styles.postContainer}>
          {/* User Profile Above Post */}
          <View style={styles.postUserProfile}>
            <Image source={{ uri: post.user.avatar }} style={styles.postUserAvatar} />
            <Text style={styles.postUserName}>{post.user.name}</Text>
          </View>

          {/* Post Image */}
          <View style={styles.postImageContainer}>
            <Image source={{ uri: post.image }} style={styles.postImage} />
            
            {/* Post Title Overlay */}
            <View style={styles.postTitleOverlay}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <View style={styles.locationContainer}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>{post.location}</Text>
              </View>
            </View>
            
            {/* Like Button */}
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="star-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
            />
          </View>
        </View>
        ))}
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
    paddingBottom: 100, // Space for floating tab bar
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  postContainer: {
    marginBottom: 20,
  },
  postUserProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  postUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
  },
  postImageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 500,
  },
  postTitleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontFamily: 'Poppins',
  },
  likeButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  commentInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  // Recommendations styles
  recommendationsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 16,
  },
  recommendationsScroll: {
    flexDirection: 'row',
  },
  recommendationCard: {
    width: 140,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationScore: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  recommendationTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins',
    marginBottom: 8,
  },
  reasonTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reasonTag: {
    backgroundColor: '#333',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'Poppins',
  },
});
