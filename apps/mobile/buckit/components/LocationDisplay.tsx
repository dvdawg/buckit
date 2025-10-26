import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

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
  const [modalVisible, setModalVisible] = useState(false);

  if (!location) {
    return (
      <View style={[styles.container, style]}>
        <Ionicons name="location-outline" size={16} color="#9BA1A6" style={styles.icon} />
        <Text style={styles.noLocationText}>No location specified</Text>
      </View>
    );
  }

  const openMapModal = () => {
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.locationContainer} onPress={openMapModal}>
        <Ionicons name="location" size={16} color="#EF4444" style={styles.icon} />
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
        <Ionicons name="chevron-forward" size={16} color="#9BA1A6" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Location</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={location.coordinates}
                title={location.name}
                description={location.address}
              />
            </MapView>
          </View>

          <View style={styles.locationDetails}>
            <Text style={styles.locationDetailsTitle}>{location.name}</Text>
            {location.address && (
              <Text style={styles.locationDetailsAddress}>{location.address}</Text>
            )}
            <Text style={styles.locationDetailsCoordinates}>
              {location.coordinates.latitude.toFixed(6)}, {location.coordinates.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  icon: {
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    color: '#F9FAFB',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  closeButton: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  locationDetails: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  locationDetailsTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  locationDetailsAddress: {
    color: '#9BA1A6',
    fontSize: 16,
    marginBottom: 8,
  },
  locationDetailsCoordinates: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
