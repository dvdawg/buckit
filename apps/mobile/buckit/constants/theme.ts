/**
 * Typography and Color System for Buckit App
 * Uses Poppins font family with consistent hierarchy and dark theme colors
 */

import { Platform } from 'react-native';

export const Colors = {
  background: {
    main: '#0E0E0E',
    card: '#1A1A1A',
    surface: 'rgba(255, 255, 255, 0.05)',
  },
  
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D1D1',
    muted: '#A0A0A0',
    accent: '#EAEAEA',
  },
  
  accent: {
    primary: '#18357A',
    secondary: '#8EC5FC',
    success: '#8EC5FC',
    warning: '#8EC5FC',
    error: '#8EC5FC',
  },
  
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

export const Typography = {
  fontFamily: Platform.select({
    ios: 'Poppins',
    android: 'Poppins',
    web: "'Poppins', 'SF Pro Rounded', 'Inter', sans-serif",
    default: 'Poppins',
  }),
  
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
  
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  
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

export const Fonts = Typography.fonts;
