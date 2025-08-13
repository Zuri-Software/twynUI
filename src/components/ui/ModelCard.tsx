import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { TrainedModel } from '../../context/TrainingContext';

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

  // Shake animation for delete mode
  useEffect(() => {
    if (isDeleteMode) {
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
      shakeAnimation.start();
      return () => shakeAnimation.stop();
    } else {
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isDeleteMode, shakeAnim]);

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
        onPress={onTap}
        onLongPress={onLongPress}
        activeOpacity={0.9}
      >
        {/* Background Image */}
        <View style={styles.imageContainer}>
          {model.thumbnailURL ? (
            <Image
              source={{ uri: model.thumbnailURL }}
              style={styles.backgroundImage}
              contentFit="cover"
              placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
              onError={() => {
                console.log('[ModelCard] ❌ Thumbnail failed to load for model:', model.name, 'URL:', model.thumbnailURL);
              }}
              onLoad={() => {
                console.log('[ModelCard] ✅ Thumbnail loaded successfully for model:', model.name);
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
          {isDeleteMode && onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <View style={styles.deleteButtonBackground}>
                <Text style={styles.deleteButtonText}>×</Text>
              </View>
            </TouchableOpacity>
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
    borderRadius: 12,
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
    marginBottom: 8,
  },
  deleteButtonBackground: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(235, 235, 235, 0.95)', // Light grey background
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
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
    borderRadius: 12,
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