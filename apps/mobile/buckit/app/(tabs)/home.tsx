import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useLocation } from '../../hooks/useLocation';
import { useFriendsFeed } from '@/hooks/useFriendsFeed';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import ColdStartModal from '@/components/ColdStartModal';
import FriendsCompletionCard from '@/components/FriendsCompletionCard';


export default function Home() {
  const { user, isSessionValid } = useSession();
  const router = useRouter();
  const { location, loading: locationLoading } = useLocation();
  const { needsPreferences, loading: preferencesLoading } = useUserPreferences();
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

  // Recommendations removed - now only on explore page

  // Check if user needs cold start (only if preferences not completed)
  useEffect(() => {
    if (user && !preferencesLoading && needsPreferences) {
      setShowColdStart(true);
    }
  }, [user, preferencesLoading, needsPreferences]);

  // Pull to refresh functionality
  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh friends feed
      await refreshFeed();
      
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
        {/* Recommendations moved to explore page */}
        
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 16,
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
