import { Platform } from 'react-native';

// Font family constants
export const FONT_FAMILY = {
  fatFrank: Platform.select({
    ios: 'FatFrank-Heavy',
    android: 'FatFrank-Heavy',
    web: 'FatFrank-Heavy',
  }),
  system: Platform.select({
    ios: 'System',
    android: 'System',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
};

// Typography scale based on SwiftUI implementation
export const FONT_SIZE = {
  fatFrankLarge: 32,      // 32pt - Main titles
  fatFrankTitle: 24,      // 24pt - Screen titles
  fatFrankHeadline: 20,   // 20pt - Section headers
  fatFrankBody: 16,       // 16pt - Body text
  fatFrankCaption: 14,    // 14pt - Captions
  fatFrankSmall: 12,      // 12pt - Small text
};

// Typography styles matching SwiftUI implementation
export const TYPOGRAPHY = {
  fatFrankLarge: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankLarge,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankLarge * 1.1,
  },
  fatFrankTitle: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankTitle,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankTitle * 1.1,
  },
  fatFrankHeadline: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankHeadline,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankHeadline * 1.1,
  },
  fatFrankBody: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankBody,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankBody * 1.2,
  },
  fatFrankCaption: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankCaption,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankCaption * 1.2,
  },
  fatFrankSmall: {
    fontFamily: FONT_FAMILY.fatFrank,
    fontSize: FONT_SIZE.fatFrankSmall,
    fontWeight: '800' as const,
    lineHeight: FONT_SIZE.fatFrankSmall * 1.2,
  },
  // System font fallbacks for body text where FatFrank might be too heavy
  systemBody: {
    fontFamily: FONT_FAMILY.system,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  systemCaption: {
    fontFamily: FONT_FAMILY.system,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  systemSmall: {
    fontFamily: FONT_FAMILY.system,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

// Text color constants
export const TEXT_COLORS = {
  primary: '#000000',           // Black - primary text
  secondary: '#666666',         // Gray - secondary text
  tertiary: '#999999',          // Light gray - tertiary text
  white: '#FFFFFF',             // White text
  brand: '#FF48D8',             // Pink brand color
  blue: '#007AFF',              // System blue
  green: '#34C759',             // System green
  red: '#FF3B30',               // System red
  orange: '#FF9500',            // System orange
};