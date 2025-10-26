import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

export default function CreateBucketScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Error', 'Please enter a bucket title');
      return;
    }
    
    setLoading(true);
    try {
      // Use the existing RPC function instead of direct table insert
      // This bypasses RLS policies by using a SECURITY DEFINER function
      console.log('Creating bucket using RPC function...');
      
      const { data, error } = await supabase.rpc('create_bucket_secure', {
        p_title: formData.title,
        p_description: formData.description || null,
        p_visibility: 'private'
      });

      if (error) {
        console.error('Error creating bucket:', error);
        Alert.alert('Error', `Failed to create bucket: ${error.message}`);
        return;
      }

      console.log('Bucket created successfully with ID:', data);
      Alert.alert('Success', 'Bucket created successfully!');
      router.back();
    } catch (error) {
      console.error('Error creating bucket:', error);
      Alert.alert('Error', 'Failed to create bucket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#8EC5FC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Bucket</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bucket Card Preview */}
        <View style={styles.bucketCard}>
          <LinearGradient
            colors={['#8EC5FC', '#E0C3FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bucketGradient}
          >
            <View style={styles.bucketContent}>
              <View style={styles.bucketIcon}>
                <Ionicons name="folder" size={24} color="#000" />
              </View>
              <Text style={styles.bucketTitle}>
                {formData.title || 'Your Bucket Title'}
              </Text>
              <Text style={styles.bucketSubtitle}>
                {formData.description || 'Add a description...'}
              </Text>
              <Text style={styles.bucketCount}>0 Challenges</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bucket Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Adventure Goals"
              placeholderTextColor="#9BA1A6"
              value={formData.title}
              onChangeText={(value) => updateFormData('title', value)}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your bucket list..."
              placeholderTextColor="#9BA1A6"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={4}
              maxLength={300}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Adventure, Travel, Personal"
              placeholderTextColor="#9BA1A6"
              value={formData.category}
              onChangeText={(value) => updateFormData('category', value)}
              maxLength={30}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? ['#666', '#666'] : ['#8EC5FC', '#E0C3FC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>Create Bucket</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  bucketCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  bucketGradient: {
    padding: 20,
  },
  bucketContent: {
    alignItems: 'center',
  },
  bucketIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bucketTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  bucketSubtitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 12,
  },
  bucketCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    opacity: 0.8,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 16,
    marginBottom: 40,
    overflow: 'hidden',
    shadowColor: '#8EC5FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});
