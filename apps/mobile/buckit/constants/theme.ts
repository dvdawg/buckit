/**
 * Typography and Color System for Buckit App
 * Uses Poppins font family with consistent hierarchy and dark theme colors
 */

import { Platform } from 'react-native';

// Color Palette for Dark Theme
export const Colors = {
  // Background Colors
  background: {
    main: '#0E0E0E',
    card: '#1A1A1A',
    surface: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Text Colors
  text: {
    primary: '#FFFFFF',      // Headers, section titles
    secondary: '#D1D1D1',    // Body text, descriptions
    muted: '#A0A0A0',        // Labels, meta, status tags
    accent: '#EAEAEA',       // Subheaders
  },
  
  // Accent Colors
  accent: {
    primary: '#18357A',      // Primary accent (blue)
    success: '#FF7954',      // Success (orange)
    warning: '#f59e0b',      // Warning (orange)
    error: '#ef4444',        // Error (red)
  },
  
  // Legacy support
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#18357A',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#18357A',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

// Typography System
export const Typography = {
  fontFamily: Platform.select({
    ios: 'Poppins',
    android: 'Poppins',
    web: "'Poppins', 'SF Pro Rounded', 'Inter', sans-serif",
    default: 'Poppins',
  }),
  
  // Header Styles
  h1: {
    fontSize: 26,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    lineHeight: 32,
  },
  
  h2: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: Colors.text.accent,
    lineHeight: 24,
  },
  
  // Body Text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  
  // Caption/Label/Meta
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  
  // Button Text
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  
  // Legacy font definitions for compatibility
  fonts: Platform.select({
    ios: {
      sans: 'Poppins',
      serif: 'ui-serif',
      rounded: 'Poppins',
      mono: 'ui-monospace',
    },
    default: {
      sans: 'Poppins',
      serif: 'serif',
      rounded: 'Poppins',
      mono: 'monospace',
    },
    web: {
      sans: "'Poppins', 'SF Pro Rounded', 'Inter', sans-serif",
      serif: "Georgia, 'Times New Roman', serif",
      rounded: "'Poppins', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
      mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
  }),
};

// Legacy Fonts export for backward compatibility
export const Fonts = Typography.fonts;
