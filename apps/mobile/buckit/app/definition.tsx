import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BucketLogo from '@/components/BucketLogo';

const { width, height } = Dimensions.get('window');

export default function DefinitionScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Show button after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Dictionary Definition */}
        <View style={styles.definitionContainer}>
          <Text style={styles.wordTitle}>Buckit</Text>
          
          <View style={styles.definitionSection}>
            <Text style={styles.partOfSpeech}>verb (buhk it)</Text>
            <Text style={styles.definition}>"the act of choosing experience over hesitation"</Text>
          </View>

          <View style={styles.definitionSection}>
            <Text style={styles.partOfSpeech}>noun (buhk it)</Text>
            <Text style={styles.definition}>"a collection of moments, experiences, or challenges one hopes to live"</Text>
          </View>
        </View>

        {/* Next Arrow */}
        <Animated.View style={[styles.arrowContainer, { opacity: buttonOpacity }]}>
          <TouchableOpacity style={styles.arrowButton} onPress={handleNext}>
            <Text style={styles.arrowText}>→</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  definitionContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  wordTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'left',
    fontFamily: 'Times New Roman',
  },
  definitionSection: {
    marginBottom: 24,
  },
  partOfSpeech: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#9BA1A6',
    marginBottom: 8,
    fontFamily: 'Times New Roman',
  },
  definition: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 26,
    fontWeight: '400',
    fontFamily: 'Times New Roman',
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingBottom: 0,
    paddingRight: 0,
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 32,
    color: '#4ade80',
    fontWeight: 'bold',
  },
});
