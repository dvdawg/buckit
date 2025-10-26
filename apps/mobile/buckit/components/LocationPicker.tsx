import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'expo-google-places-autocomplete';
import * as Location from 'expo-location';
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

interface LocationPickerProps {
  value?: LocationData | null;
  onLocationSelect: (location: LocationData | null) => void;
  placeholder?: string;
  style?: any;
}

export default function LocationPicker({
  value,
  onLocationSelect,
  placeholder = "Search for a location...",
  style
}: LocationPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value?.name || '');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(value);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        setCurrentLocation({
          name: `${address.name || address.street || 'Current Location'}, ${address.city || address.region || ''}`,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          address: `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.postalCode || ''}`.trim(),
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handlePlaceSelect = (data: any, details: any) => {
    if (details) {
      const location: LocationData = {
        name: details.name || details.formatted_address,
        coordinates: {
          latitude: details.geometry.location.lat,
          longitude: details.geometry.location.lng,
        },
        address: details.formatted_address,
      };
      setSelectedLocation(location);
      setSearchQuery(location.name);
    }
  };

  const handleCurrentLocationSelect = () => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      setSearchQuery(currentLocation.name);
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation);
    setModalVisible(false);
  };

  const handleClear = () => {
    setSelectedLocation(null);
    setSearchQuery('');
    onLocationSelect(null);
  };

  const openModal = () => {
    setModalVisible(true);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.inputContainer} onPress={openModal}>
        <Ionicons name="location" size={16} color="#EF4444" style={styles.icon} />
        <Text style={[styles.inputText, !selectedLocation && styles.placeholderText]}>
          {selectedLocation ? selectedLocation.name : placeholder}
        </Text>
        {selectedLocation && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#9BA1A6" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-down" size={16} color="#9BA1A6" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TouchableOpacity onPress={handleConfirm} disabled={!selectedLocation}>
              <Text style={[styles.confirmButton, !selectedLocation && styles.disabledButton]}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Search for a location..."
              onPress={handlePlaceSelect}
              query={{
                key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'YOUR_API_KEY',
                language: 'en',
                components: 'country:us', // You can modify this based on your target region
              }}
              fetchDetails={true}
              styles={{
                container: styles.autocompleteContainer,
                textInput: styles.autocompleteInput,
                listView: styles.autocompleteList,
                row: styles.autocompleteRow,
                description: styles.autocompleteDescription,
              }}
              textInputProps={{
                placeholderTextColor: '#9BA1A6',
                returnKeyType: 'search',
              }}
              enablePoweredByContainer={false}
              debounce={300}
            />
          </View>

          {currentLocation && (
            <TouchableOpacity style={styles.currentLocationButton} onPress={handleCurrentLocationSelect}>
              <Ionicons name="locate" size={20} color="#60A5FA" />
              <Text style={styles.currentLocationText}>Use Current Location</Text>
            </TouchableOpacity>
          )}

          {selectedLocation && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: selectedLocation.coordinates.latitude,
                  longitude: selectedLocation.coordinates.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
              >
                <Marker
                  coordinate={selectedLocation.coordinates}
                  title={selectedLocation.name}
                  description={selectedLocation.address}
                />
              </MapView>
            </View>
          )}

          {selectedLocation && (
            <View style={styles.selectedLocationInfo}>
              <Text style={styles.selectedLocationName}>{selectedLocation.name}</Text>
              {selectedLocation.address && (
                <Text style={styles.selectedLocationAddress}>{selectedLocation.address}</Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
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
  inputText: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 16,
  },
  placeholderText: {
    color: '#9BA1A6',
  },
  clearButton: {
    marginRight: 8,
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
  cancelButton: {
    color: '#9BA1A6',
    fontSize: 16,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
  },
  confirmButton: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    color: '#6B7280',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  autocompleteList: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  autocompleteRow: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  autocompleteDescription: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  currentLocationText: {
    color: '#60A5FA',
    fontSize: 16,
    marginLeft: 12,
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  selectedLocationInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1F2937',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectedLocationName: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedLocationAddress: {
    color: '#9BA1A6',
    fontSize: 14,
  },
});
