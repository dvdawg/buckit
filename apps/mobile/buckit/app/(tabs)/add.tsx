import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AddScreen() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(true);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showMenu) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenu]);

  const handleCreateChallenge = () => {
    setShowMenu(false);
    router.push('/create-challenge');
  };

  const handleCreateBucket = () => {
    setShowMenu(false);
    router.push('/create-bucket');
  };

  const handleClose = () => {
    setShowMenu(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Background overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Small popup menu positioned above nav bar */}
      <Animated.View
        style={[
          styles.menuContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateY: scaleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>What would you like to create?</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCreateBucket}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="folder" size={20} color="#8EC5FC" />
            </View>
            <Text style={styles.menuText}>Create Bucket</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCreateChallenge}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#8EC5FC" />
            </View>
            <Text style={styles.menuText}>Create Challenge</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 100, // Position above the nav bar
    left: width / 2 - 140, // Center horizontally
    width: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  menuCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingVertical: 16,
    borderRadius: 20,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(142, 197, 252, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 4,
  },
});
