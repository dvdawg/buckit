import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useRecommendations } from '@/hooks/use-recommendations';
import { useLocation } from '@/hooks/useLocation';
import { usePopularThemes } from '@/hooks/usePopularThemes';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Custom Bucket Icon Component (Filled)
const BucketIcon = ({ size = 14, color = '#8EC5FC' }) => (
  <Svg width={size} height={size * 0.6} viewBox="0 0 159 171" fill="none">
    <Path 
      d="M20.0024 5H138.036C147.013 5.00009 153.979 12.8323 152.933 21.748L137.565 152.748C136.678 160.304 130.275 166 122.667 166H35.3716C27.7635 166 21.3597 160.304 20.4731 152.748L5.10498 21.748C4.05899 12.8323 11.0256 5.00009 20.0024 5Z" 
      fill={color}
    />
  </Svg>
);

// Dummy data for recommended content
const recommendedContent = [
  {
    id: '1',
    type: 'bucket',
    title: 'Photography Adventures',
    description: 'Capture stunning moments and improve your photography skills',
    category: 'Creative',
    applicabilityScore: 95,
    cover: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
    challenges: 8,
    participants: 1247,
  },
  {
    id: '2',
    type: 'challenge',
    title: 'Learn Spanish in 30 Days',
    description: 'Master basic Spanish conversation through daily practice',
    category: 'Learning',
    applicabilityScore: 88,
    location: 'Online',
    difficulty: 'Beginner',
    estimatedTime: '30 days',
  },
  {
    id: '3',
    type: 'bucket',
    title: 'Fitness Transformation',
    description: 'Complete fitness journey with workout routines and nutrition plans',
    category: 'Health',
    applicabilityScore: 92,
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    challenges: 12,
    participants: 2156,
  },
  {
    id: '4',
    type: 'challenge',
    title: 'Cook 10 New Cuisines',
    description: 'Explore world flavors by cooking dishes from different countries',
    category: 'Cooking',
    applicabilityScore: 85,
    location: 'Home',
    difficulty: 'Intermediate',
    estimatedTime: '2 months',
  },
  {
    id: '5',
    type: 'bucket',
    title: 'Digital Nomad Life',
    description: 'Build skills and experiences for remote work and travel',
    category: 'Lifestyle',
    applicabilityScore: 78,
    cover: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
    challenges: 15,
    participants: 892,
  },
  {
    id: '6',
    type: 'challenge',
    title: 'Read 12 Books This Year',
    description: 'Expand your knowledge with a diverse reading list',
    category: 'Learning',
    applicabilityScore: 90,
    location: 'Anywhere',
    difficulty: 'Beginner',
    estimatedTime: '1 year',
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { location, loading: locationLoading } = useLocation();

  // Get real recommendations
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
    enabled: !!location
  });

  // Get popular themes
  const { 
    themes: popularThemes, 
    loading: themesLoading, 
    error: themesError,
    refetch: refetchThemes
  } = usePopularThemes();

  // Pull to refresh functionality
  const { refreshing, onRefresh } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([refetchRecommendations(), refetchThemes()]);
    },
    minDuration: 1200, // 1.2 seconds minimum for smooth transition
  });

  const getApplicabilityColor = (score: number) => {
    if (score >= 90) return '#4ade80'; // Green
    if (score >= 80) return '#8EC5FC'; // Light blue
    if (score >= 70) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getApplicabilityText = (score: number) => {
    if (score >= 90) return 'Perfect Match';
    if (score >= 80) return 'Great Fit';
    if (score >= 70) return 'Good Match';
    return 'Consider';
  };

  const renderBucketCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.recommendedCard}
      onPress={() => router.push(`/buckets/${item.id}`)}
    >
      <Image source={{ uri: item.cover }} style={styles.cardImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.cardGradient}
      />
      
      {/* Applicability Score */}
      <View style={[styles.applicabilityBadge, { backgroundColor: getApplicabilityColor(item.applicabilityScore) }]}>
        <Text style={styles.applicabilityScore}>{item.applicabilityScore}%</Text>
        <Text style={styles.applicabilityText}>{getApplicabilityText(item.applicabilityScore)}</Text>
      </View>

      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
        
        {/* Stats */}
        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
            <Text style={styles.statText}>{item.challenges} Challenges</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#8EC5FC" />
            <Text style={styles.statText}>{item.participants.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderChallengeCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      style={styles.challengeCard}
      onPress={() => router.push(`/challenges/${item.id}`)}
    >
      {/* Rating Badge - Top Right Corner */}
      <View style={[styles.challengeApplicabilityBadge, { backgroundColor: getApplicabilityColor(item.applicabilityScore) }]}>
        <Text style={styles.applicabilityScore}>{item.applicabilityScore}%</Text>
      </View>

      <View style={styles.challengeHeader}>
        <Text style={styles.challengeTitle}>{item.title}</Text>
        <Text style={styles.challengeDescription}>{item.description}</Text>
      </View>

      <View style={styles.challengeDetails}>
        <View style={styles.challengeMeta}>
          <View style={styles.metaItem}>
            <BucketIcon size={14} color="#8EC5FC" />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color="#ef4444" />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={14} color="#f59e0b" />
            <Text style={styles.metaText}>{item.estimatedTime}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>Explore</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9BA1A6" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for your next challenge"
          placeholderTextColor="#9BA1A6"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories Section */}
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
            progressViewOffset={0}
          />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
        </View>

        {/* Dynamic Popular Categories */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Popular Categories</Text>
        </View>

        {themesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8EC5FC" />
            <Text style={styles.loadingText}>Loading themes...</Text>
          </View>
        ) : themesError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load themes</Text>
            <TouchableOpacity onPress={refetchThemes} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {popularThemes.slice(0, 6).map((theme, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.categoryCard}
                onPress={() => router.push(`/challenges/theme/${encodeURIComponent(theme.theme)}`)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: theme.color }]}>
                  <Text style={styles.categoryEmoji}>{theme.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{theme.theme}</Text>
                <View style={[styles.popularityBadge, { backgroundColor: getApplicabilityColor(theme.popularity_score) }]}>
                  <Text style={styles.popularityScore}>{theme.popularity_score}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Additional Popular Themes */}
        {popularThemes.length > 6 && (
          <>
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>More Popular Themes</Text>
            </View>

            <View style={styles.nicheCategoriesGrid}>
              {popularThemes.slice(6).map((theme, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.nicheCategoryCard}
                  onPress={() => router.push(`/challenges/theme/${encodeURIComponent(theme.theme)}`)}
                >
                  <View style={styles.nicheCategoryHeader}>
                    <View style={[styles.nicheCategoryIcon, { backgroundColor: theme.color }]}>
                      <Text style={styles.nicheCategoryEmoji}>{theme.icon}</Text>
                    </View>
                    <View style={[styles.confidenceBadge, { backgroundColor: getApplicabilityColor(theme.popularity_score) }]}>
                      <Text style={styles.confidenceScore}>{theme.popularity_score}%</Text>
                    </View>
                  </View>
                  <Text style={styles.nicheCategoryName}>{theme.theme}</Text>
                  <Text style={styles.themeStats}>
                    {theme.challenge_count} challenges • {theme.completion_rate}% completion
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Recommended Content Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <Text style={styles.sectionSubtitle}>
            Based on your interests and activity
          </Text>
        </View>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {recommendationsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
          ) : recommendationsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load recommendations</Text>
              <TouchableOpacity onPress={refetchRecommendations} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : recommendations.length > 0 ? (
            recommendations.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.challengeCard}
                onPress={() => {
                  logView(item.id);
                  // Navigate to item details
                  router.push(`/buckets/${item.id}`);
                }}
              >
                {/* Score Badge - Top Right Corner */}
                <View style={[styles.challengeApplicabilityBadge, { backgroundColor: getApplicabilityColor(item.score ? Math.round(item.score * 100) : 0) }]}>
                  <Text style={styles.applicabilityScore}>{item.score ? Math.round(item.score * 100) : 0}%</Text>
                </View>

                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeTitle}>Recommended Item</Text>
                  <Text style={styles.challengeDescription}>Score: {item.score ? item.score.toFixed(2) : 'N/A'}</Text>
                </View>

                <View style={styles.challengeDetails}>
                  <View style={styles.challengeMeta}>
                    <View style={styles.metaItem}>
                      <BucketIcon size={14} color="#8EC5FC" />
                      <Text style={styles.metaText}>Recommendation</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location" size={14} color="#ef4444" />
                      <Text style={styles.metaText}>Nearby</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={14} color="#f59e0b" />
                      <Text style={styles.metaText}>Available</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recommendations found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#D1D1D1',
    fontFamily: 'Poppins',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100, // Space for floating tab bar
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#A0A0A0',
    fontFamily: 'Poppins',
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#EAEAEA',
    fontFamily: 'Poppins',
    marginBottom: 16,
  },
  contentGrid: {
    gap: 16,
  },
  recommendedCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  applicabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  applicabilityScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  applicabilityText: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#D1D1D1',
    fontFamily: 'Poppins',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  challengeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  challengeApplicabilityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  challengeHeader: {
    marginBottom: 12,
    paddingRight: 60, // Space for the rating badge
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#D1D1D1',
    fontFamily: 'Poppins',
    lineHeight: 18,
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  categoryCard: {
    width: (width - 60) / 3,
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginTop: 4,
  },
  popularityBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 30,
    alignItems: 'center',
  },
  popularityScore: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  // Niche categories styles
  nicheCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  nicheCategoryCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  nicheCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nicheCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nicheCategoryEmoji: {
    fontSize: 20,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  nicheCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    textAlign: 'center',
    marginBottom: 4,
  },
  themeStats: {
    fontSize: 12,
    color: '#9BA1A6',
    fontFamily: 'Poppins',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9BA1A6',
    fontFamily: 'Poppins',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontFamily: 'Poppins',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9BA1A6',
    fontFamily: 'Poppins',
  },
});