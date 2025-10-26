import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useItems } from '@/hooks/useItems';
import ChallengeModal from '@/components/ChallengeModal';

export default function ChallengesIndex() {
  const router = useRouter();
  const { items, loading } = useItems();
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const handleChallengePress = (challenge: any) => {
    setSelectedChallengeId(challenge.id);
    setChallengeModalVisible(true);
  };

  const handleCloseChallengeModal = () => {
    setChallengeModalVisible(false);
    setSelectedChallengeId(null);
  };

  const getUrgencyInfo = (urgency: string) => {
    switch (urgency) {
      case 'overdue':
        return { text: 'Overdue', color: '#ef4444' };
      case 'due_soon':
        return { text: 'Due Soon', color: '#f59e0b' };
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Challenges</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
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
                  <View style={styles.challengeHeader}>
                    <View style={styles.challengeBucketInfo}>
                      <Text style={styles.challengeBucketEmoji}>{item.bucket?.emoji || '📝'}</Text>
                      <Text style={styles.challengeBucketName} numberOfLines={1} ellipsizeMode="tail">
                        {item.bucket?.title || 'Unknown Bucket'}
                      </Text>
                    </View>
                    <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color }]}>
                      <Text style={styles.urgencyText}>{urgencyInfo.text}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.challengeTitle} numberOfLines={2} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                  
                  <View style={styles.challengeFooter}>
                    <Text style={styles.challengeLocation} numberOfLines={1} ellipsizeMode="tail">
                      📍 {item.location_name || 'No location'}
                    </Text>
                    <Text style={styles.dueDateText} numberOfLines={1} ellipsizeMode="tail">
                      {item.deadline ? new Date(item.deadline).toLocaleDateString() : 'None yet!'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Challenge Modal */}
      <ChallengeModal
        visible={challengeModalVisible}
        challengeId={selectedChallengeId}
        onClose={handleCloseChallengeModal}
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
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
    paddingBottom: 100, // Space for floating tab bar
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeBucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  challengeBucketEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  challengeBucketName: {
    fontSize: 12,
    color: '#9BA1A6',
    fontWeight: '500',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeLocation: {
    fontSize: 12,
    color: '#9BA1A6',
    flex: 1,
    marginRight: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#9BA1A6',
    flexShrink: 0,
  },
});
