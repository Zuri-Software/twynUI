import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps } from 'react-native';
import { TYPOGRAPHY } from '../../styles/typography';
import { COLORS } from '../../styles/colors';

interface FreePillButtonProps extends TouchableOpacityProps {
  text?: string;
}

export default function FreePillButton({ 
  text = 'Free', 
  style, 
  ...props 
}: FreePillButtonProps) {
  return (
    <TouchableOpacity style={[styles.freeButton, style]} {...props}>
      <Text style={styles.freeButtonText} numberOfLines={1}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  freeButton: {
    backgroundColor: COLORS.button.freeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    minWidth: 50, // Ensure minimum width for "Free" text
  },
  freeButtonText: {
    ...TYPOGRAPHY.fatFrankCaption,
    color: COLORS.button.freeText,
    textAlign: 'center',
  },
});