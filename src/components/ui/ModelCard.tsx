import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import CachedImage from './CachedImage';
import { CachePriority } from '../../services/ImageCacheManager';
import { TrainedModel } from '../../context/TrainingContext';
import { COMPONENT_RADIUS } from '../../styles/borderRadius';

interface ModelCardProps {
  model: TrainedModel;
  isSelected: boolean;
  isDeleteMode: boolean;
  onTap: () => void;
  onLongPress: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export default function ModelCard({
  model,
  isSelected,
  isDeleteMode,
  onTap,
  onLongPress,
  onRename,
  onDelete,
}: ModelCardProps) {
  const [showingDeleteAlert, setShowingDeleteAlert] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const deleteButtonScale = useRef(new Animated.Value(0)).current;

  // Shake animation for delete mode
  useEffect(() => {
    if (isDeleteMode) {
      // Start shake animation
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -2,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Animate delete button in
      const buttonAnimation = Animated.spring(deleteButtonScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      });

      shakeAnimation.start();
      buttonAnimation.start();

      return () => {
        shakeAnimation.stop();
      };
    } else {
      // Animate delete button out and stop shake
      Animated.parallel([
        Animated.spring(deleteButtonScale, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDeleteMode, shakeAnim, deleteButtonScale]);

  const handleRename = () => {
    if (!onRename) return;
    
    Alert.prompt(
      'Rename Model',
      'Enter a new name for this model.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: (newName) => {
            if (newName && newName.trim()) {
              onRename(newName.trim());
            }
          },
        },
      ],
      'plain-text',
      model.name
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;
    
    Alert.alert(
      'Delete Model',
      `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const handleLongPress = () => {
    // Add haptic feedback to match iOS UX
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  const handleCardPress = () => {
    if (isDeleteMode) {
      // In delete mode, let the parent handle the tap to exit delete mode
      // Don't call onTap() to prevent model selection
      return;
    }
    onTap();
  };

  const animatedStyle = {
    transform: [{ translateX: shakeAnim }],
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && !isDeleteMode && styles.selectedCard,
        ]}
        onPress={handleCardPress}
        onLongPress={handleLongPress}
        delayLongPress={300} // Match iOS 0.3 second delay
        activeOpacity={isDeleteMode ? 1 : 0.9}
      >
        {/* Background Image */}
        <View style={styles.imageContainer}>
          {model.thumbnailURL ? (
            <CachedImage
              uri={model.thumbnailURL}
              style={styles.backgroundImage}
              contentFit="cover"
              priority={isSelected ? CachePriority.CRITICAL : CachePriority.HIGH}
              placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
              fallbackText="Model thumbnail"
              onCacheHit={() => {
                console.log('[ModelCard] 🚀 Cache HIT for model:', model.name);
              }}
              onCacheMiss={() => {
                console.log('[ModelCard] ⏳ Cache MISS for model:', model.name);
              }}
              onError={() => {
                console.log('[ModelCard] ❌ Thumbnail failed to load for model:', model.name, 'URL:', model.thumbnailURL);
              }}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>IMG</Text>
            </View>
          )}
          
          {/* Dark overlay */}
          <View style={styles.overlay} />
        </View>

        {/* Bottom left text overlay */}
        <View style={styles.textOverlay}>
          <Text style={styles.photoCount}>
            {model.trainingImageCount > 0 ? model.trainingImageCount : model.photoCount} photos
          </Text>
          
          <TouchableOpacity onPress={handleRename} disabled={!onRename}>
            <Text style={styles.modelName} numberOfLines={2}>
              {model.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Top right controls */}
        <View style={styles.topRightControls}>
          {/* Delete button (only in delete mode) */}
          {onDelete && (
            <Animated.View
              style={[
                styles.deleteButton,
                {
                  transform: [{ scale: deleteButtonScale }],
                  opacity: deleteButtonScale,
                }
              ]}
              pointerEvents={isDeleteMode ? 'auto' : 'none'}
            >
              <TouchableOpacity
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.deleteButtonTouchable}
              >
                <View style={styles.deleteButtonBackground}>
                  <Text style={styles.deleteButtonText}>×</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Selection indicator (only when selected and not in delete mode) */}
          {isSelected && !isDeleteMode && (
            <View style={styles.selectionIndicator}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 170,
    height: 300,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderRadius: COMPONENT_RADIUS.modelCard,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FE6EFD', // Pink selection border
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dark tint
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  photoCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  modelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  topRightControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1000,
  },
  deleteButtonTouchable: {
    // Ensure good touch target
  },
  deleteButtonBackground: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(235, 235, 235, 0.95)', // Match Swift light grey
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 8, // Ensure it's above everything
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666', // Dark grey X
    lineHeight: 16,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: COMPONENT_RADIUS.avatar / 2,
    backgroundColor: '#FE6EFD', // Pink background
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 16,
  },
});