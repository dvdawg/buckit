import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface VisibilityOption {
  value: 'public' | 'private';
  label: string;
  description: string;
  icon: string;
}

const visibilityOptions: VisibilityOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Everyone can see this bucket',
    icon: 'globe',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Only your friends can see this bucket',
    icon: 'people',
  },
];

interface BucketVisibilitySelectorProps {
  selectedVisibility: 'public' | 'private';
  onVisibilityChange: (visibility: 'public' | 'private') => void;
  disabled?: boolean;
}

export default function BucketVisibilitySelector({
  selectedVisibility,
  onVisibilityChange,
  disabled = false,
}: BucketVisibilitySelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = visibilityOptions.find(option => option.value === selectedVisibility);

  const handleSelect = (visibility: 'public' | 'private') => {
    onVisibilityChange(visibility);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.selectorContent}>
          <Ionicons 
            name={selectedOption?.icon as any} 
            size={20} 
            color={disabled ? '#6B7280' : '#8EC5FC'} 
          />
          <View style={styles.selectorText}>
            <Text style={[styles.selectorLabel, disabled && styles.selectorLabelDisabled]}>
              {selectedOption?.label}
            </Text>
            <Text style={[styles.selectorDescription, disabled && styles.selectorDescriptionDisabled]}>
              {selectedOption?.description}
            </Text>
          </View>
          {!disabled && (
            <Ionicons name="chevron-down" size={20} color="#9BA1A6" />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bucket Visibility</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#9BA1A6" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsList}>
              {visibilityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selectedVisibility === option.value && styles.optionSelected
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <View style={styles.optionContent}>
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={selectedVisibility === option.value ? '#8EC5FC' : '#9BA1A6'} 
                    />
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionLabel,
                        selectedVisibility === option.value && styles.optionLabelSelected
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={[
                        styles.optionDescription,
                        selectedVisibility === option.value && styles.optionDescriptionSelected
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                    {selectedVisibility === option.value && (
                      <Ionicons name="checkmark-circle" size={24} color="#8EC5FC" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  selectorText: {
    flex: 1,
    marginLeft: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  selectorLabelDisabled: {
    color: '#6B7280',
  },
  selectorDescription: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  selectorDescriptionDisabled: {
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  optionSelected: {
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: '#8EC5FC',
  },
  optionDescription: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  optionDescriptionSelected: {
    color: '#8EC5FC',
  },
});
