import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { TYPOGRAPHY, TEXT_COLORS } from '../../styles/typography';
import { COLORS } from '../../styles/colors';

interface HowToUseCardProps {
  onPress?: () => void;
}

export function HowToUseCard({ onPress }: HowToUseCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.8}
    >
      <Image
        source={require('../../../assets/images/ui/how_to_use_card.png')}
        style={styles.cardImage}
        contentFit="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 160,
    marginTop: -12, // Pull up slightly to align better with category cards
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});