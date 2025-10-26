import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { TabBarStyles } from './TabBarStyles';

interface GlassStyleDemoProps {
  onStyleChange: (styleName: keyof typeof TabBarStyles) => void;
  currentStyle: keyof typeof TabBarStyles;
}

export default function GlassStyleDemo({ onStyleChange, currentStyle }: GlassStyleDemoProps) {
  const styleOptions = [
    { key: 'darkGlass', name: 'Dark Glass', description: 'Dark blur with white text' },
    { key: 'lightGlass', name: 'Light Glass', description: 'Light blur with dark text' },
    { key: 'gradientGlass', name: 'Gradient Glass', description: 'Gradient blur with color transitions' },
    { key: 'subtleDarkGlass', name: 'Subtle Dark Glass', description: 'Subtle dark blur effect' },
    { key: 'ultraLightGlass', name: 'Ultra Light Glass', description: 'Very light blur effect' },
    { key: 'originalWhite', name: 'Original White', description: 'Solid white background' },
  ] as const;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Navigation Bar Style Options</Text>
      <Text style={styles.subtitle}>Choose your preferred glass/blur style</Text>
      
      {styleOptions.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.optionCard,
            currentStyle === option.key && styles.selectedCard
          ]}
          onPress={() => onStyleChange(option.key)}
        >
          <Text style={[
            styles.optionName,
            currentStyle === option.key && styles.selectedText
          ]}>
            {option.name}
          </Text>
          <Text style={[
            styles.optionDescription,
            currentStyle === option.key && styles.selectedDescription
          ]}>
            {option.description}
          </Text>
        </TouchableOpacity>
      ))}
      
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Current Preview</Text>
        <View style={styles.previewBox}>
          {TabBarStyles[currentStyle].tabBarBackground && (
            <View style={styles.previewBackground}>
              {TabBarStyles[currentStyle].tabBarBackground()}
            </View>
          )}
          <View style={styles.previewContent}>
            <Text style={[
              styles.previewText,
              { color: TabBarStyles[currentStyle].tabBarActiveTintColor }
            ]}>
              Active Tab
            </Text>
            <Text style={[
              styles.previewText,
              { color: TabBarStyles[currentStyle].tabBarInactiveTintColor }
            ]}>
              Inactive Tab
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Poppins',
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    marginBottom: 24,
    fontFamily: 'Poppins',
  },
  optionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    borderColor: '#8EC5FC',
    backgroundColor: 'rgba(142, 197, 252, 0.1)',
  },
  optionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Poppins',
  },
  selectedText: {
    color: '#8EC5FC',
  },
  optionDescription: {
    fontSize: 14,
    color: '#9BA1A6',
    fontFamily: 'Poppins',
  },
  selectedDescription: {
    color: 'rgba(142, 197, 252, 0.8)',
  },
  previewContainer: {
    marginTop: 24,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'Poppins',
  },
  previewBox: {
    height: 60,
    borderRadius: 25,
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  previewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  previewText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
});
