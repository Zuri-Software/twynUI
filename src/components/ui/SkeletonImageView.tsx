import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';

interface SkeletonImageViewProps {
  preset?: {
    name: string;
    image_url: string;
  };
  width?: number;
  height?: number;
  failed?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export default function SkeletonImageView({ 
  preset, 
  width = 150, 
  height = 200,
  failed = false,
  errorMessage = 'Generation failed',
  onRetry
}: SkeletonImageViewProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    // Don't animate if failed
    if (failed) return;
    
    // Shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    shimmerAnimation.start();
    pulseAnimation.start();

    return () => {
      shimmerAnimation.stop();
      pulseAnimation.stop();
    };
  }, [shimmerAnim, pulseAnim, failed]);

  return (
    <View style={styles.container}>
      {/* Status label */}
      <View style={styles.labelContainer}>
        {failed ? (
          <Text style={styles.failedText}>❌ {errorMessage}</Text>
        ) : (
          <Text style={styles.generatingText}>⏳ Generating...</Text>
        )}
      </View>

      {/* Skeleton stack container */}
      <View style={[styles.stackContainer, { width: width + 25, height: height + 10 }]}>
        {/* Background skeleton layers */}
        {[1, 2, 3].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.skeletonLayer,
              {
                width,
                height,
                transform: [
                  { translateX: index * 7 },
                  { translateY: index * 2 },
                  { rotate: `${index * 2}deg` },
                ],
                opacity: 1 - (index * 0.1),
                zIndex: 4 - index,
              },
            ]}
          >
            <View style={styles.skeletonContent} />
          </Animated.View>
        ))}

        {/* Main skeleton image */}
        <Animated.View
          style={[
            styles.mainSkeleton,
            failed && styles.failedSkeleton,
            {
              width,
              height,
              transform: failed ? [] : [{ scale: pulseAnim }],
              zIndex: 100,
            },
          ]}
        >
          {failed ? (
            <View style={styles.failedContent}>
              <Text style={styles.failedIcon}>💥</Text>
              <Text style={styles.failedMessage} numberOfLines={2}>
                {errorMessage}
              </Text>
              {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : preset ? (
            <View style={styles.presetPreview}>
              <Image
                source={{ 
                  uri: preset.image_url,
                  width: width,
                  height: height,
                }}
                style={styles.previewImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
              />
              <View style={styles.previewOverlay}>
                <Text style={styles.previewText} numberOfLines={2}>
                  Generating {preset.name}...
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.skeletonContent}>
              {/* Shimmer overlay */}
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  {
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-width, width],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={styles.skeletonText}>🎨</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  labelContainer: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  generatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500', // Orange color for generating state
  },
  stackContainer: {
    position: 'relative',
  },
  skeletonLayer: {
    position: 'absolute',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mainSkeleton: {
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
    overflow: 'hidden',
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ skewX: '-20deg' }],
  },
  skeletonText: {
    fontSize: 32,
    opacity: 0.3,
  },
  presetPreview: {
    flex: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.5,
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  previewText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  failedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF3B30', // Red color for failed state
  },
  failedSkeleton: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  failedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  failedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  failedMessage: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});