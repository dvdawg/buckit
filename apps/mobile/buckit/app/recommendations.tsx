import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useRecommendations } from '../hooks/use-recommendations';
import { RecommendationCard } from '../components/RecommendationCard';
import * as Location from 'expo-location';

export default function RecommendationsScreen() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        });
      } catch (error) {
        setLocationError('Failed to get location');
        console.error('Location error:', error);
      }
    })();
  }, []);

  const {
    items,
    loading,
    error,
    refetch,
    logEvent,
    logView,
    logCompletion,
  } = useRecommendations({
    lat: location?.lat ?? 0,
    lon: location?.lon ?? 0,
    radiusKm: 15,
    k: 20,
    enabled: !!location,
  });

  const handleItemPress = (itemId: string) => {
    logView(itemId);
    
    Alert.alert('Item Details', `Navigate to item: ${itemId}`);
  };

  const handleLike = async (itemId: string) => {
    try {
      await logEvent({ itemId, eventType: 'like' });
      Alert.alert('Success', 'Item liked!');
    } catch (error) {
      Alert.alert('Error', 'Failed to like item');
    }
  };

  const handleSave = async (itemId: string) => {
    try {
      await logEvent({ itemId, eventType: 'save' });
      Alert.alert('Success', 'Item saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleComplete = async (itemId: string) => {
    try {
      await logEvent({ itemId, eventType: 'start' });
      await logCompletion(itemId, undefined, 'Completed via recommendations');
      Alert.alert('Success', 'Item completed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete item');
    }
  };

  if (locationError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Location Error: {locationError}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={refetch}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended for You</Text>
      <Text style={styles.subtitle}>
        Based on your preferences and location
      </Text>
      
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecommendationCard
            item={item}
            onPress={handleItemPress}
            onLike={handleLike}
            onSave={handleSave}
            onComplete={handleComplete}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading recommendations...' : 'No recommendations found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#F44336',
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
