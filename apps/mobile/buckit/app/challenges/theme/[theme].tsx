import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChallengesByTheme } from '@/hooks/useChallengesByTheme';
import ChallengeDetailModal from '@/components/ChallengeDetailModal';
import ChallengeRatingModal from '@/components/ChallengeRatingModal';

export default function ThemedChallengesScreen() {
  const router = useRouter();
  const { theme } = useLocalSearchParams<{ theme: string }>();
  const { challenges, loading, error, refetch } = useChallengesByTheme(theme || '', 50);
  
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [challengeToRate, setChallengeToRate] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleChallengePress = (challenge: any) => {
    setSelectedChallengeId(challenge.id);
    setChallengeModalVisible(true);
  };

  const handleCloseChallengeModal = () => {
    setChallengeModalVisible(false);
    setSelectedChallengeId(null);
  };

  const toggleChallengeCompletion = (challenge: any) => {
    setChallengeToRate(challenge);
    setRatingModalVisible(true);
  };

  const handleRatingSuccess = () => {
    refetch();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return '#4ade80';
    if (difficulty <= 3) return '#f59e0b';
    return '#ef4444';
  };

  const getDifficultyText = (difficulty: number) => {
    if (difficulty <= 2) return 'Easy';
    if (difficulty <= 3) return 'Medium';
    return 'Hard';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8EC5FC" />
          <Text style={styles.loadingText}>Loading {theme} challenges...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>
          {theme} Challenges
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {}
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
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>Error Loading Challenges</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : challenges.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No {theme} Challenges Yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to create a {theme.toLowerCase()} challenge!
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/create-challenge')}
            >
              <Text style={styles.createButtonText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.challengesList}>
            {challenges.map((challenge) => (
              <TouchableOpacity 
                key={challenge.id} 
                style={styles.challengeCard}
                onPress={() => handleChallengePress(challenge)}
              >
                {}
                <View style={styles.bucketNameContainer}>
                  <View style={styles.bucketInfo}>
                    <Text style={styles.bucketEmoji}>{challenge.bucket.emoji}</Text>
                    <Text style={styles.bucketName} numberOfLines={1} ellipsizeMode="tail">
                      {challenge.bucket.title}
                    </Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(challenge.difficulty) }]}>
                    <Text style={styles.difficultyText}>{getDifficultyText(challenge.difficulty)}</Text>
                  </View>
                </View>

                {}
                <View style={styles.challengeContent}>
                  {}
                  <TouchableOpacity 
                    style={styles.challengeIcon}
                    onPress={() => toggleChallengeCompletion(challenge)}
                  >
                    {challenge.is_completed ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                  
                  {}
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeTitle} numberOfLines={2} ellipsizeMode="tail">
                      {challenge.title}
                    </Text>
                    
                    {challenge.description && (
                      <Text style={styles.challengeDescription} numberOfLines={2} ellipsizeMode="tail">
                        {challenge.description}
                      </Text>
                    )}
                    
                    <View style={styles.challengeMeta}>
                      <View style={styles.challengeLocation}>
                        <Text style={styles.locationPin}>📍</Text>
                        <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                          {challenge.location_name || 'No location'}
                        </Text>
                      </View>
                      {(challenge.price_min > 0 || challenge.price_max > 0) && (
                        <View style={styles.challengePrice}>
                          <Text style={styles.pricePin}>💰</Text>
                          <Text style={styles.priceText}>
                            {challenge.price_min > 0 ? `$${challenge.price_min}` : 'Free'}
                            {challenge.price_max > challenge.price_min ? ` - $${challenge.price_max}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {}
      <ChallengeDetailModal
        visible={challengeModalVisible}
        challengeId={selectedChallengeId}
        onClose={handleCloseChallengeModal}
      />

      {}
      <ChallengeRatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSuccess={handleRatingSuccess}
        challenge={challengeToRate}
      />
    </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Poppins',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9BA1A6',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  challengesList: {
    gap: 12,
  },
  challengeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  bucketNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bucketEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  bucketName: {
    fontSize: 12,
    color: '#9BA1A6',
    fontWeight: '500',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  challengeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
    fontSize: 14,
    color: '#9BA1A6',
    marginBottom: 8,
    lineHeight: 18,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  challengePrice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricePin: {
    fontSize: 12,
    marginRight: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#8EC5FC',
    fontWeight: '500',
  },
});
