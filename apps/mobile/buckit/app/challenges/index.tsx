import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useItems } from '@/hooks/useItems';
import ChallengeDetailModal from '@/components/ChallengeDetailModal';
import ChallengeRatingModal from '@/components/ChallengeRatingModal';

export default function ChallengesIndex() {
  const router = useRouter();
  const { items, loading, refresh } = useItems();
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [challengeToRate, setChallengeToRate] = useState<any>(null);

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
    refresh();
  };


  const getUrgencyInfo = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return { text: 'Overdue', color: '#8EC5FC' };
      case 'due_soon':
        return { text: 'Due Soon', color: '#8EC5FC' };
      default:
        return { text: 'Anytime', color: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8EC5FC" />
          <Text style={styles.loadingText}>Loading challenges...</Text>
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
        <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>All Challenges</Text>
        <View style={styles.headerSpacer} />
      </View>

      {}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No Challenges Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first challenge to get started!</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/create-challenge')}
            >
              <Text style={styles.createButtonText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.challengesList}>
            {items.map((item) => {
              const urgencyInfo = getUrgencyInfo(item.urgency_level);
              
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.challengeCard}
                  onPress={() => handleChallengePress(item)}
                >
                  {}
                  <View style={styles.bucketNameContainer}>
                    <Text style={styles.bucketName} numberOfLines={1} ellipsizeMode="tail">
                      {item.bucket?.title || 'Unknown Bucket'}
                    </Text>
                    <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color }]}>
                      <Text style={styles.urgencyText}>{urgencyInfo.text}</Text>
                    </View>
                  </View>

                  {}
                  <View style={styles.challengeContent}>
                    {}
                    <TouchableOpacity 
                      style={styles.challengeIcon}
                      onPress={() => toggleChallengeCompletion(item)}
                    >
                      {item.is_completed ? (
                        <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color="#fff" />
                      )}
                    </TouchableOpacity>
                    
                    {}
                    <View style={styles.challengeInfo}>
                      <Text style={styles.challengeTitle} numberOfLines={2} ellipsizeMode="tail">
                        {item.title}
                      </Text>
                      
                      <View style={styles.challengeMeta}>
                        <View style={styles.challengeLocation}>
                          <Text style={styles.locationPin}>📍</Text>
                          <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                            {item.location_name || 'No location'}
                          </Text>
                        </View>
                        <View style={styles.challengeTargetDate}>
                          <Text style={styles.targetDatePin}>📅</Text>
                          <Text style={styles.targetDateText} numberOfLines={1} ellipsizeMode="tail">
                            {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'None yet!'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  bucketName: {
    fontSize: 12,
    color: '#9BA1A6',
    fontWeight: '500',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
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
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
});
