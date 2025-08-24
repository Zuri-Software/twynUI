import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import CachedImage from './CachedImage';
import { CachePriority } from '../../services/ImageCacheManager';
import { Preset } from '../../types/preset.types';
import { useFavorites } from '../../context/FavoritesContext';

const { width: screenWidth } = Dimensions.get('window');

interface PresetCardProps {
  preset: Preset;
  onPress: (preset: Preset) => void;
  width?: number;
}

export default function PresetCard({ preset, onPress, width }: PresetCardProps) {
  const [imageHeight, setImageHeight] = useState<number>(200);
  const [hasError, setHasError] = useState(false);


  // Calculate random height variation for staggered effect (like Pinterest)
  const getRandomHeight = (id: string): number => {
    const heights = [180, 200, 220, 240, 260];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return heights[Math.abs(hash) % heights.length];
  };

  const cardHeight = getRandomHeight(preset.id);

  return (
    <TouchableOpacity 
      style={[styles.container, { width }]} 
      onPress={() => onPress(preset)}
      activeOpacity={0.9}
    >
      <View style={[styles.card, { height: cardHeight }]}>
        {!hasError ? (
          <CachedImage
            uri={preset.image_url}
            style={styles.image}
            contentFit="cover"
            priority={CachePriority.NORMAL}
            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
            transition={200}
            fallbackText="Preset image"
            onError={() => setHasError(true)}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🖼️</Text>
            <Text style={styles.errorText}>Image not available</Text>
          </View>
        )}

        {/* Overlay with preset info */}
        <View style={styles.overlay}>
          <View style={styles.infoContainer}>
            <Text style={styles.presetName} numberOfLines={2}>
              {preset.name}
            </Text>
            {preset.category && (
              <Text style={styles.category} numberOfLines={1}>
                {preset.category.charAt(0).toUpperCase() + preset.category.slice(1)}
              </Text>
            )}
          </View>
        </View>

        {/* Subtle gradient overlay for better text readability */}
        <View style={styles.gradientOverlay} />
      </View>
    </TouchableOpacity>
  );
}

// Adaptive preset card for staggered grid
interface AdaptivePresetCardProps {
  preset: Preset;
  onPress: (preset: Preset) => void;
  showFavoriteIndicator?: boolean;
}

export function AdaptivePresetCard({ 
  preset, 
  onPress, 
  showFavoriteIndicator = false 
}: AdaptivePresetCardProps) {
  const [aspectRatio, setAspectRatio] = useState<number>(1.0);
  const [hasError, setHasError] = useState(false);
  const { isFavorited } = useFavorites();

  const handleImageLoad = (event: any) => {
    const { width, height } = event.source;
    if (width && height) {
      setAspectRatio(width / height);
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress(preset)} activeOpacity={0.9}>
      <View style={styles.adaptiveCard}>
        {!hasError ? (
          <CachedImage
            uri={preset.image_url}
            style={[styles.adaptiveImage, { aspectRatio }]}
            contentFit="contain"
            priority={CachePriority.NORMAL}
            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
            transition={200}
            onLoad={handleImageLoad}
            onError={() => setHasError(true)}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>🖼️</Text>
            <Text style={styles.placeholderText}>{preset.name}</Text>
          </View>
        )}
        
        {/* Favorite Indicator */}
        {showFavoriteIndicator && isFavorited(preset) && (
          <View style={styles.favoriteIndicator}>
            <Text style={styles.favoriteIcon}>❤️</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  infoContainer: {
    flex: 1,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  category: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Adaptive card styles
  adaptiveCard: {
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  adaptiveImage: {
    width: '100%',
    borderRadius: 16,
  },
  placeholderContainer: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    minHeight: 120,
    aspectRatio: 1.2,
  },
  placeholderIcon: {
    fontSize: 24,
    marginBottom: 8,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 14,
  },
});