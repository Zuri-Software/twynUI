import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';

const { width: screenWidth } = Dimensions.get('window');

interface GenerationBatch {
  images: string[];
  id?: string;
}

interface PhotoStackViewProps {
  batch: GenerationBatch;
  onTap: () => void;
  onImageTap?: (imageUrl: string) => void;
  width?: number;
  height?: number;
}

const DEFAULT_STACK_WIDTH = 150;
const DEFAULT_STACK_HEIGHT = 200; // 3:4 ratio

export default function PhotoStackView({
  batch,
  onTap,
  onImageTap,
  width = DEFAULT_STACK_WIDTH,
  height = DEFAULT_STACK_HEIGHT,
}: PhotoStackViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  // Animation values for swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  // Swipe sensitivity
  const SWIPE_THRESHOLD = 50;

  // Get the current 4 visible cards (limit to what we can see in stack)
  const getVisibleCards = (): string[] => {
    const images = batch.images;
    if (images.length === 0) return [];
    
    const cards: string[] = [];
    for (let i = 0; i < Math.min(4, images.length); i++) {
      const index = (currentIndex + i) % images.length;
      cards.push(images[index]);
    }
    return cards;
  };

  // Navigation functions for card stack
  const moveCardToBack = () => {
    if (batch.images.length <= 1) return;
    
    // Simply update the current index to cycle to next image
    setCurrentIndex((prev) => (prev + 1) % batch.images.length);
  };

  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => batch.images.length > 1,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return batch.images.length > 1 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        // Add slight scale effect on touch
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only respond to left swipes (moving card to back)
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Reset scale
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }).start();

        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Left swipe - move card to back
          Animated.timing(translateX, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            moveCardToBack();
            translateX.setValue(0);
          });
        } else {
          // Snap back to center
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }).start();
        }
      },
    })
  ).current;

  // Stack configuration (matching Swift version)
  const stackConfigs = [
    { rotation: '0deg', offset: { x: 0, y: 0 }, opacity: 1.0 },    // Front image
    { rotation: '2deg', offset: { x: 7, y: 2 }, opacity: 0.9 },   // Second image
    { rotation: '5deg', offset: { x: 13, y: 3 }, opacity: 0.8 },  // Third image
    { rotation: '8deg', offset: { x: 20, y: 4 }, opacity: 0.7 },  // Back image
  ];

  const visibleCards = getVisibleCards();

  // Handle tap to open 2x2 grid (matching SwiftUI behavior)
  const handleStackTap = () => {
    onTap();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Photo count label for multiple images */}
        {batch.images.length > 1 ? (
          <View style={styles.labelContainer}>
            <Text style={styles.photoCountIcon}>⎘</Text>
            <Text style={styles.photoCountText}>{batch.images.length} Photos</Text>
          </View>
        ) : (
          <View style={styles.labelSpacer} />
        )}

        {/* Stack container with gestures */}
        <Animated.View 
          style={[
            styles.stackContainer, 
            { 
              width: width + 25, 
              height: height + 10,
              transform: [{ scale }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          {/* Background layers (rendered from back to front) */}
          {visibleCards.slice(1, 4).map((imageUrl, index) => {
            const config = stackConfigs[index + 1];
            return (
              <View 
                key={`${imageUrl}-${index + 1}`}
                style={[
                  styles.stackImage,
                  {
                    width,
                    height,
                    opacity: config.opacity,
                    zIndex: stackConfigs.length - (index + 1),
                    transform: [
                      { translateX: config.offset.x },
                      { translateY: config.offset.y },
                      { rotate: config.rotation },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ 
                    uri: imageUrl,
                    width: width,
                    height: height,
                  }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                  transition={200}
                />
              </View>
            );
          })}

          {/* Main image with swipe animation */}
          <Animated.View 
            style={[
              styles.mainImageContainer,
              { 
                width, 
                height,
                transform: [{ translateX }]
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.mainImageTouchable} 
              onPress={handleStackTap} 
              activeOpacity={0.95}
            >
              {visibleCards[0] ? (
                <Image
                  source={{ 
                    uri: visibleCards[0],
                    width: width,
                    height: height,
                  }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                  transition={200}
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  content: {
    alignItems: 'flex-start',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  labelSpacer: {
    height: 20,
    marginBottom: 8,
  },
  photoCountIcon: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 4,
  },
  photoCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  stackContainer: {
    position: 'relative',
  },
  stackImage: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  mainImageContainer: {
    position: 'absolute',
    zIndex: 100,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  mainImageTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  placeholderText: {
    fontSize: 24,
    opacity: 0.5,
  },
});