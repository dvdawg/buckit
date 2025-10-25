import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import BucketLogo from '@/components/BucketLogo';

const { width, height } = Dimensions.get('window');

export default function DefinitionScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

    // Navigate to login after 2.5 seconds
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

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
        {/* Buckit Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.buckitText}>Buckit</Text>
          <BucketLogo size={32} color="#fff" />
        </View>

        {/* Dictionary Definition */}
        <View style={styles.definitionContainer}>
          <Text style={styles.wordTitle}>Buckit</Text>
          
          <View style={styles.definitionSection}>
            <Text style={styles.partOfSpeech}>verb (buck it)</Text>
            <Text style={styles.definition}>"the act of choosing experience over hesitation"</Text>
          </View>

          <View style={styles.definitionSection}>
            <Text style={styles.partOfSpeech}>noun (buck it)</Text>
            <Text style={styles.definition}>"a collection of moments, experiences, or challenges one hopes to live"</Text>
          </View>
        </View>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  buckitText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    marginRight: 12,
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
  },
  definitionSection: {
    marginBottom: 24,
  },
  partOfSpeech: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#9BA1A6',
    marginBottom: 8,
  },
  definition: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 26,
    fontWeight: '400',
  },
});
