import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useLocation } from '../../hooks/useLocation';
import { useFriendsFeed } from '@/hooks/useFriendsFeed';
import ColdStartModal from '@/components/ColdStartModal';
import FriendsCompletionCard from '@/components/FriendsCompletionCard';


export default function Home() {
  const { user, isSessionValid } = useSession();
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();
  const [showColdStart, setShowColdStart] = useState(false);
  
  // Friends feed data
  const { 
    completions, 
    loading: feedLoading, 
    error: feedError, 
    hasMore, 
    loadMore, 
    refresh: refreshFeed 
  } = useFriendsFeed();

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
      // Refresh both recommendations and friends feed
      await Promise.all([
        refetchRecommendations(),
        refreshFeed()
      ]);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
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
                    {rec.reasons.poprec > 0.7 && <Text style={styles.reasonTag}>Popular</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Friends Feed Section */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Friends' Activity</Text>
          
          {feedError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{feedError}</Text>
              <TouchableOpacity onPress={refreshFeed} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {feedLoading && completions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8EC5FC" />
              <Text style={styles.loadingText}>Loading friends' activity...</Text>
            </View>
          ) : completions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>
                When your friends complete challenges, you'll see them here!
              </Text>
            </View>
          ) : (
            completions.map((completion) => (
              <FriendsCompletionCard
                key={completion.completion_id}
                completion={completion}
                onPress={() => {
                  // Navigate to challenge detail
                  router.push(`/buckets/${completion.bucket_id}/challenges/${completion.item_id}`);
                }}
              />
            ))
          )}
          
          {/* Load More Button */}
          {hasMore && completions.length > 0 && (
            <TouchableOpacity 
              style={styles.loadMoreButton} 
              onPress={loadMore}
              disabled={feedLoading}
            >
              {feedLoading ? (
                <ActivityIndicator size="small" color="#8EC5FC" />
              ) : (
                <Text style={styles.loadMoreText}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
  // Friends feed styles
  feedSection: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#2a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontFamily: 'Poppins',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontFamily: 'Poppins',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadMoreText: {
    color: '#8EC5FC',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
});
