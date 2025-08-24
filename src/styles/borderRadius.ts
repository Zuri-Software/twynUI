/**
 * Border Radius Design System
 * Matches SwiftUI UnevenRoundedRectangle and cornerRadius patterns from FluxApp
 */

export const BORDER_RADIUS = {
  // Standard corner radius values from Swift design
  small: 8,       // Small elements, tags, chips
  medium: 12,     // Forms, buttons (most common)
  large: 16,      // Images, cards, photo containers
  xlarge: 20,     // Modal overlays
  container: 32,  // Main container bottom corners (UnevenRoundedRectangle equivalent)
  rounded: 25,    // Device mockups and special UI elements
} as const;

/**
 * UnevenRoundedRectangle equivalent for React Native
 * Creates the distinctive "rounded bottom corners only" effect from SwiftUI
 */
export const CONTAINER_RADIUS = {
  // Main container pattern: rounded bottom corners only
  main: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: BORDER_RADIUS.container,
    borderBottomRightRadius: BORDER_RADIUS.container,
  },
  
  // Alternative patterns for different components
  top: {
    borderTopLeftRadius: BORDER_RADIUS.container,
    borderTopRightRadius: BORDER_RADIUS.container,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  
  all: {
    borderRadius: BORDER_RADIUS.medium,
  },
} as const;

/**
 * Component-specific border radius presets
 */
export const COMPONENT_RADIUS = {
  // Form elements
  input: BORDER_RADIUS.medium,
  button: BORDER_RADIUS.medium,
  
  // Cards and containers
  card: BORDER_RADIUS.large,
  modelCard: BORDER_RADIUS.medium,
  
  // Images
  avatar: 25, // Fully rounded for circular avatars
  thumbnail: BORDER_RADIUS.large,
  photo: BORDER_RADIUS.large,
  
  // Modal and overlay elements
  modal: BORDER_RADIUS.xlarge,
  sheet: BORDER_RADIUS.xlarge,
  
  // Special elements
  tag: BORDER_RADIUS.small,
  chip: BORDER_RADIUS.small,
  badge: BORDER_RADIUS.small,
  
  // Device mockups
  phone: BORDER_RADIUS.rounded,
} as const;

export type BorderRadiusKey = keyof typeof BORDER_RADIUS;
export type ComponentRadiusKey = keyof typeof COMPONENT_RADIUS;