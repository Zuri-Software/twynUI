import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Preset } from '../../types/preset.types';
import { TYPOGRAPHY, TEXT_COLORS } from '../../styles/typography';
import { COLORS } from '../../styles/colors';

interface CategoryCardProps {
  title: string;
  isSelected: boolean;
  preset?: Preset;
  onPress: () => void;
}

// Utility function to format category display name (matching Swift)
const formatCategoryDisplayName = (category: string): string => {
  const uppercased = category.toUpperCase();
  
  // If longer than 8 characters and has spaces, split for better visual balance
  if (uppercased.length > 8 && uppercased.includes(' ')) {
    const words = uppercased.split(' ');
    
    if (words.length === 2) {
      // Two words: split them
      return words.join('\n');
    } else if (words.length > 2) {
      // More than two words: try to balance the lines
      const midpoint = Math.floor(words.length / 2);
      const firstLine = words.slice(0, midpoint).join(' ');
      const secondLine = words.slice(midpoint).join(' ');
      return `${firstLine}\n${secondLine}`;
    }
  }
  
  // Short titles or single words: keep on one line
  return uppercased;
};

export function CategoryCard({ title, isSelected, preset, onPress }: CategoryCardProps) {
  const displayName = formatCategoryDisplayName(title);
  const lines = displayName.split('\n');

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        isSelected && styles.selectedContainer
      ]}
      activeOpacity={0.8}
    >
      {/* Background Image */}
      {preset && (
        <Image
          source={{ uri: preset.image_url }}
          style={styles.backgroundImage}
          contentFit="cover"
          placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
          transition={200}
        />
      )}
      
      {/* Overlay */}
      <View style={styles.overlay} />
      
      {/* Text Container */}
      <View style={styles.textContainer}>
        {lines.map((line, index) => (
          <Text key={index} style={styles.categoryText}>
            {line}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    // Ensure border follows the border radius
    borderStyle: 'solid',
  },
  selectedContainer: {
    borderColor: COLORS.primary, // Pink border when selected
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card.overlay,
  },
  textContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    justifyContent: 'flex-end',
  },
  categoryText: {
    ...TYPOGRAPHY.fatFrankBody,
    color: TEXT_COLORS.white,
    lineHeight: 16,
    textAlign: 'left',
  },
});