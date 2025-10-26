import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationData {
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address?: string;
}

interface LocationDisplayProps {
  location: LocationData | null;
  style?: any;
}

export default function LocationDisplay({ location, style }: LocationDisplayProps) {
  if (!location) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="location-outline" size={16} color="#9BA1A6" style={styles.icon} />
        <Text style={styles.noLocationText}>No location set</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.locationContainer}>
        <Ionicons name="location" size={16} color="#8EC5FC" style={styles.icon} />
        <View style={styles.locationInfo}>
          <Text style={styles.locationName} numberOfLines={1}>
            {location.name}
          </Text>
          {location.address && location.address !== location.name && (
            <Text style={styles.locationAddress} numberOfLines={1}>
              {location.address}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  locationAddress: {
    color: '#9BA1A6',
    fontSize: 14,
    marginTop: 2,
  },
  noLocationText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontStyle: 'italic',
  },
});