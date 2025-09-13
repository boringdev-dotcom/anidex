// Design System for Anidex - Animal Kingdom App
// Nature-inspired color palette and styling constants

export const Colors = {
  // Primary Colors - Nature Inspired
  primary: '#2E7D32', // Forest Green
  primaryLight: '#4CAF50', // Light Green
  primaryDark: '#1B5E20', // Dark Green
  
  // Secondary Colors
  secondary: '#8D6E63', // Earth Brown
  secondaryLight: '#BCAAA4', // Light Brown
  secondaryDark: '#5D4037', // Dark Brown
  
  // Accent Colors
  accent: '#FF6F00', // Safari Orange
  accentLight: '#FFB74D', // Light Orange
  warning: '#F57C00', // Amber
  success: '#388E3C', // Success Green
  error: '#D32F2F', // Error Red
  
  // Nature Blues for Water/Sky
  water: '#0277BD', // Ocean Blue
  waterLight: '#4FC3F7', // Light Blue
  sky: '#1976D2', // Sky Blue
  
  // Neutral Colors
  background: '#FAFAFA', // Off White
  surface: '#FFFFFF', // Pure White
  surfaceVariant: '#F5F5F5', // Light Gray
  
  // Text Colors
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#212121', // Almost Black
  onSurface: '#212121',
  onSurfaceVariant: '#757575', // Medium Gray
  
  // Additional Grays
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Rarity Colors for Animals
  common: '#9E9E9E', // Gray
  uncommon: '#4CAF50', // Green
  rare: '#2196F3', // Blue
  epic: '#9C27B0', // Purple
  legendary: '#FF9800', // Orange
  mythical: '#F44336', // Red
};

export const Typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Layout = {
  // Common widths
  maxWidth: {
    sm: 384,
    md: 448,
    lg: 512,
    xl: 576,
    '2xl': 672,
    '3xl': 768,
  },
  
  // Common heights
  headerHeight: 60,
  tabBarHeight: 60,
  
  // Breakpoints for responsive design
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

// Helper function to get rarity color
export const getRarityColor = (rarity: string): string => {
  switch (rarity.toLowerCase()) {
    case 'common':
      return Colors.common;
    case 'uncommon':
      return Colors.uncommon;
    case 'rare':
      return Colors.rare;
    case 'epic':
      return Colors.epic;
    case 'legendary':
      return Colors.legendary;
    case 'mythical':
      return Colors.mythical;
    default:
      return Colors.common;
  }
};

// Helper function for responsive values
export const responsive = (base: number, sm?: number, md?: number, lg?: number) => ({
  base,
  sm: sm || base,
  md: md || sm || base,
  lg: lg || md || sm || base,
});

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Layout,
  getRarityColor,
  responsive,
};
