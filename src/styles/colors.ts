// Brand color system based on SwiftUI FluxApp implementation

export const COLORS = {
  // Brand colors
  primary: '#FF48D8',           // Bright pink/magenta - main brand color
  primaryLight: '#FF6EFD',      // Lighter pink for selections/borders
  primaryDark: '#E63EC7',       // Darker pink for pressed states
  
  // Background colors
  background: {
    white: '#FFFFFF',
    black: '#000000',
    gray: '#F5F5F5',
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    blur: 'rgba(255, 255, 255, 0.9)',
  },
  
  // Text colors
  text: {
    primary: '#000000',         // Black - primary text
    secondary: '#666666',       // Gray - secondary text
    tertiary: '#999999',        // Light gray - tertiary text
    white: '#FFFFFF',           // White text
    placeholder: '#CCCCCC',     // Placeholder text
  },
  
  // System colors
  system: {
    blue: '#007AFF',            // System blue for links/buttons
    green: '#34C759',           // System green for success
    red: '#FF3B30',             // System red for errors
    orange: '#FF9500',          // System orange for warnings
    yellow: '#FFCC00',          // System yellow
  },
  
  // UI element colors
  ui: {
    border: 'rgba(0, 0, 0, 0.1)',
    borderLight: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(0, 0, 0, 0.15)',
    shadowLight: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Button colors
  button: {
    primary: '#FF48D8',         // Primary button background
    secondary: '#FFFFFF',       // Secondary button background
    disabled: 'rgba(255, 72, 216, 0.5)',
    
    // Free pill button
    freeBg: 'rgba(52, 199, 89, 0.1)',
    freeText: '#34C759',
  },
  
  // Card colors
  card: {
    background: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    selection: '#FF6EFD',       // Selection border color
  },
  
  // Status colors
  status: {
    generating: '#FF9500',      // Orange for generating state
    completed: '#34C759',       // Green for completed state
    error: '#FF3B30',           // Red for error state
    pending: '#999999',         // Gray for pending state
  },
  
  // Skeleton loading colors
  skeleton: {
    background: '#F0F0F0',
    shimmer: 'rgba(255, 255, 255, 0.5)',
    pulse: '#F5F5F5',
  },
};

// Color utility functions
export const withOpacity = (color: string, opacity: number): string => {
  // Simple opacity helper - assumes hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${color}${alpha}`;
  }
  return color;
};

// Common color combinations
export const COLOR_COMBINATIONS = {
  primaryButton: {
    background: COLORS.primary,
    text: COLORS.text.white,
    shadow: COLORS.ui.shadowLight,
  },
  secondaryButton: {
    background: COLORS.button.secondary,
    text: COLORS.text.primary,
    border: COLORS.ui.border,
    shadow: COLORS.ui.shadowLight,
  },
  freePill: {
    background: COLORS.button.freeBg,
    text: COLORS.button.freeText,
  },
  card: {
    background: COLORS.card.background,
    shadow: COLORS.ui.shadow,
    border: COLORS.ui.borderLight,
  },
  selectedCard: {
    background: COLORS.card.background,
    shadow: COLORS.ui.shadow,
    border: COLORS.card.selection,
  },
};