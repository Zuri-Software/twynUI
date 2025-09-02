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
  generatedAt?: Date;
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
  
  // Format generation date
  const formatGenerationDate = (): string => {
    if (!batch.generatedAt) return `${batch.images.length} Photos`;
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - batch.generatedAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return batch.generatedAt.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: batch.generatedAt.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  // Animation values for swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Animation values for background cards
  const backgroundScale = useRef(new Animated.Value(0.95)).current;
  const backgroundTranslateY = useRef(new Animated.Value(5)).current;
  
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
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }),
          // Animate background cards up slightly
          Animated.spring(backgroundScale, {
            toValue: 0.98,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }),
          Animated.spring(backgroundTranslateY, {
            toValue: 2,
            useNativeDriver: true,
            tension: 300,
            friction: 10,
          }),
        ]).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Set translation
        translateX.setValue(dx);
        
        // Add rotation based on horizontal movement (max 15 degrees)
        const rotation = (dx / width) * 15;
        rotate.setValue(rotation);
        
        // Add opacity fade based on distance
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = width;
        const newOpacity = Math.max(0.3, 1 - (distance / maxDistance) * 0.7);
        opacity.setValue(newOpacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const shouldSwipe = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5;
        
        if (shouldSwipe) {
          // Determine swipe direction
          const direction = dx > 0 ? 1 : -1;
          const targetX = direction * (width + 50);
          
          // Animate card out with rotation and fade
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: targetX,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: direction * 25,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 0.8,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            // Animate background cards forward
            Animated.spring(backgroundScale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            Animated.spring(backgroundTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
          ]).start(() => {
            // Move to next card and reset animations
            moveCardToBack();
            translateX.setValue(0);
            rotate.setValue(0);
            opacity.setValue(1);
            scale.setValue(1);
            backgroundScale.setValue(0.95);
            backgroundTranslateY.setValue(5);
          });
        } else {
          // Snap back to center with spring animation
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            // Reset background cards
            Animated.spring(backgroundScale, {
              toValue: 0.95,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
            Animated.spring(backgroundTranslateY, {
              toValue: 5,
              useNativeDriver: true,
              tension: 200,
              friction: 8,
            }),
          ]).start();
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
        {/* Generation date label */}
        <View style={styles.labelContainer}>
          <Text style={styles.photoCountIcon}>⎘</Text>
          <Text style={styles.photoCountText}>{formatGenerationDate()}</Text>
        </View>

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
              <Animated.View 
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
                      { 
                        translateY: Animated.add(
                          config.offset.y,
                          index === 0 ? backgroundTranslateY : 0
                        )
                      },
                      { rotate: config.rotation },
                      { 
                        scale: index === 0 ? backgroundScale : 1
                      },
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
              </Animated.View>
            );
          })}

          {/* Main image with swipe animation */}
          <Animated.View 
            style={[
              styles.mainImageContainer,
              { 
                width, 
                height,
                opacity,
                transform: [
                  { translateX },
                  { rotate: rotate.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ['-1deg', '1deg']
                  })},
                  { scale }
                ]
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
  photoCountIcon: {
    fontSize: 20,
    color: '#007AFF',
    marginRight: 4,
    marginTop: 2,
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