import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface ColdStartModalProps {
  visible: boolean;
  onComplete: (preferences: ColdStartPreferences) => void;
  onSkip: () => void;
}

interface ColdStartPreferences {
  selectedThemes: string[];
  priceComfort: 'low' | 'medium' | 'high';
  maxDistance: number;
}

const THEMES = [
  { id: 'adventure', name: 'Adventure', icon: '🏔️' },
  { id: 'food', name: 'Food & Dining', icon: '🍽️' },
  { id: 'culture', name: 'Culture & Arts', icon: '🎭' },
  { id: 'nature', name: 'Nature & Outdoors', icon: '🌿' },
  { id: 'nightlife', name: 'Nightlife', icon: '🌃' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'sports', name: 'Sports & Fitness', icon: '⚽' },
  { id: 'relaxation', name: 'Relaxation', icon: '🧘' },
];

const PRICE_OPTIONS = [
  { id: 'low', name: 'Budget-friendly', description: 'Under $25' },
  { id: 'medium', name: 'Moderate', description: '$25 - $100' },
  { id: 'high', name: 'Premium', description: '$100+' },
];

const DISTANCE_OPTIONS = [
  { id: 5, name: '5 km', description: 'Very close' },
  { id: 15, name: '15 km', description: 'Nearby' },
  { id: 30, name: '30 km', description: 'Within city' },
  { id: 50, name: '50 km', description: 'Day trip' },
];

export default function ColdStartModal({ visible, onComplete, onSkip }: ColdStartModalProps) {
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [priceComfort, setPriceComfort] = useState<'low' | 'medium' | 'high'>('medium');
  const [maxDistance, setMaxDistance] = useState<number>(15);
  const [loading, setLoading] = useState(false);

  const toggleTheme = (themeId: string) => {
    setSelectedThemes(prev => 
      prev.includes(themeId) 
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handleComplete = async () => {
    if (selectedThemes.length === 0) {
      Alert.alert('Please select at least one theme');
      return;
    }

    setLoading(true);
    try {
      // Initialize user trait vector based on selected preferences
      await initializeUserPreferences({
        selectedThemes,
        priceComfort,
        maxDistance
      });

      onComplete({
        selectedThemes,
        priceComfort,
        maxDistance
      });
    } catch (error) {
      console.error('Error initializing preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Buckit!</Text>
          <Text style={styles.subtitle}>
            Help us personalize your recommendations by telling us a bit about your preferences.
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Theme Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What interests you? (Select 3-5)</Text>
            <View style={styles.themeGrid}>
              {THEMES.map(theme => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    selectedThemes.includes(theme.id) && styles.themeCardSelected
                  ]}
                  onPress={() => toggleTheme(theme.id)}
                >
                  <Text style={styles.themeIcon}>{theme.icon}</Text>
                  <Text style={[
                    styles.themeName,
                    selectedThemes.includes(theme.id) && styles.themeNameSelected
                  ]}>
                    {theme.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Comfort */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's your typical budget?</Text>
            {PRICE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  priceComfort === option.id && styles.optionCardSelected
                ]}
                onPress={() => setPriceComfort(option.id as any)}
              >
                <Text style={[
                  styles.optionName,
                  priceComfort === option.id && styles.optionNameSelected
                ]}>
                  {option.name}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  priceComfort === option.id && styles.optionDescriptionSelected
                ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Max Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How far are you willing to travel?</Text>
            {DISTANCE_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  maxDistance === option.id && styles.optionCardSelected
                ]}
                onPress={() => setMaxDistance(option.id)}
              >
                <Text style={[
                  styles.optionName,
                  maxDistance === option.id && styles.optionNameSelected
                ]}>
                  {option.name}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  maxDistance === option.id && styles.optionDescriptionSelected
                ]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.completeButton, loading && styles.completeButtonDisabled]} 
            onPress={handleComplete}
            disabled={loading}
          >
            <Text style={styles.completeButtonText}>
              {loading ? 'Setting up...' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

async function initializeUserPreferences(preferences: ColdStartPreferences) {
  // Get prototype vectors for selected themes
  const prototypeVectors = await getPrototypeVectors(preferences.selectedThemes);
  
  // Create initial user vector by averaging prototype vectors
  const initialVector = averageVectors(prototypeVectors);
  
  // Store in user_vectors table
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_vectors')
    .upsert({
      user_id: user.id,
      emb: initialVector
    });

  if (error) throw error;

  // Store preferences in user profile or separate table
  await supabase
    .from('users')
    .update({
      preferences: {
        themes: preferences.selectedThemes,
        price_comfort: preferences.priceComfort,
        max_distance: preferences.maxDistance
      }
    })
    .eq('auth_id', user.id);
}

async function getPrototypeVectors(themes: string[]): Promise<number[][]> {
  // Get items that match the selected themes
  const { data: items } = await supabase
    .from('items')
    .select('embedding, embedding_vec')
    .in('bucket_id', themes) // Assuming themes map to bucket IDs
    .not('embedding', 'is', null)
    .limit(50);

  if (!items || items.length === 0) {
    // Fallback: return default vectors
    return [new Array(1536).fill(0.1)];
  }

  return items.map(item => item.embedding_vec || item.embedding).filter(Boolean);
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return new Array(1536).fill(0);
  
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  
  for (const vector of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += vector[i];
    }
  }
  
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }
  
  return result;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    width: '48%',
    aspectRatio: 1.2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#18357A',
  },
  themeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  themeNameSelected: {
    color: '#18357A',
  },
  optionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#18357A',
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionNameSelected: {
    color: '#18357A',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  optionDescriptionSelected: {
    color: '#8EC5FC',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  completeButton: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#18357A',
  },
  completeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
