import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const BucketIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size * 0.6} viewBox="0 0 159 171" fill="none">
    <Path 
      d="M20.0024 5H138.036C147.013 5.00009 153.979 12.8323 152.933 21.748L137.565 152.748C136.678 160.304 130.275 166 122.667 166H35.3716C27.7635 166 21.3597 160.304 20.4731 152.748L5.10498 21.748C4.05899 12.8323 11.0256 5.00009 20.0024 5Z" 
      fill={color}
    />
  </Svg>
);

export default function FloatingAddButton() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
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
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showMenu]);

  const handleAddPress = () => {
    setShowMenu(!showMenu);
  };

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
  };

  return (
    <>
      {}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <View style={styles.addButtonContainer}>
          <Ionicons name="add" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
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
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCreateBucket}
              >
                <View style={styles.menuIconContainer}>
                  <BucketIcon size={20} color="#666" />
                </View>
                <Text style={styles.menuText}>Create Bucket</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCreateChallenge}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#666" />
                </View>
                <Text style={styles.menuText}>Create Challenge</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  addButtonContainer: {
    backgroundColor: '#000',
    width: 50,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  menuContainer: {
    width: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuCard: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
    marginVertical: 2,
  },
});
