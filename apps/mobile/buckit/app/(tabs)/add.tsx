import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddScreen() {
  // This screen is not used as the add functionality is handled by the FloatingAddButton component
  // This is just a placeholder to prevent routing errors
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Add functionality handled by tab button</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});
