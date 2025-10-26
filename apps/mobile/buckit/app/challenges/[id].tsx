import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChallengeDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [bucket, setBucket] = useState<any>(null);

  useEffect(() => {
    fetchChallengeData();
  }, [id]);

  const fetchChallengeData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user ID
      const { data: uid } = await supabase.rpc('me_user_id');
      if (!uid) {
        setLoading(false);
        return;
      }

      // Fetch the challenge data
      const { data: challengeData, error: challengeError } = await supabase
        .from('items')
        .select(`
          *,
          bucket: buckets!items_bucket_id_fkey (
            id,
            title,
            emoji,
            color
          )
        `)
        .eq('id', id)
        .eq('owner_id', uid)
        .single();

      if (challengeError) {
        console.error('Error fetching challenge:', challengeError);
        setLoading(false);
        return;
      }

      if (challengeData) {
        setChallenge(challengeData);
        setBucket(challengeData.bucket);
        
        // If we have bucket data, redirect to the proper bucket challenge route
        if (challengeData.bucket?.id) {
          router.replace(`/buckets/${challengeData.bucket.id}/challenge?challengeId=${id}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error in fetchChallengeData:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8EC5FC" />
          <Text style={styles.loadingText}>Loading challenge...</Text>
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Challenge Not Found</Text>
          <Text style={styles.errorText}>This challenge could not be found or you don't have access to it.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Challenge Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        {bucket && (
          <View style={styles.bucketInfo}>
            <Text style={styles.bucketEmoji}>{bucket.emoji}</Text>
            <Text style={styles.bucketName}>{bucket.title}</Text>
          </View>
        )}
        {challenge.description && (
          <Text style={styles.description}>{challenge.description}</Text>
        )}
        {challenge.location_name && (
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#ef4444" />
            <Text style={styles.detailText}>{challenge.location_name}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#f59e0b" />
          <Text style={styles.detailText}>
            {challenge.deadline ? `Due: ${new Date(challenge.deadline).toLocaleDateString()}` : 'None yet!'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#9BA1A6',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8EC5FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  bucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bucketEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  bucketName: {
    fontSize: 16,
    color: '#8EC5FC',
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#9BA1A6',
    lineHeight: 24,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
});
