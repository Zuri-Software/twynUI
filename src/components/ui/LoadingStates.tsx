import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { BORDER_RADIUS } from '../../styles/borderRadius';

const { width: screenWidth } = Dimensions.get('window');

// Loading state types
export enum LoadingType {
  SPINNER = 'spinner',
  DOTS = 'dots',
  PULSE = 'pulse',
  SKELETON = 'skeleton',
  SHIMMER = 'shimmer',
}

interface LoadingProps {
  type?: LoadingType;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  overlay?: boolean;
  visible?: boolean;
}

/**
 * Spinner Loading Component
 */
export const SpinnerLoading: React.FC<LoadingProps> = ({
  message,
  size = 'medium',
  color = '#007AFF',
  overlay = false,
  visible = true,
}) => {
  if (!visible) return null;

  const spinnerSize = size === 'small' ? 20 : size === 'large' ? 40 : 30;

  const content = (
    <View style={[styles.container, overlay && styles.overlay]}>
      <ActivityIndicator size={spinnerSize} color={color} />
      {message && (
        <Text style={[styles.message, { color }]}>{message}</Text>
      )}
    </View>
  );

  return overlay ? (
    <View style={styles.overlayContainer}>
      {content}
    </View>
  ) : content;
};

/**
 * Animated Dots Loading Component
 */
export const DotsLoading: React.FC<LoadingProps> = ({
  message,
  color = '#007AFF',
  overlay = false,
  visible = true,
}) => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const createDotAnimation = (animValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, 200),
      createDotAnimation(dot3Anim, 400),
    ];

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, [visible, dot1Anim, dot2Anim, dot3Anim]);

  if (!visible) return null;

  const content = (
    <View style={[styles.container, overlay && styles.overlay]}>
      <View style={styles.dotsContainer}>
        {[dot1Anim, dot2Anim, dot3Anim].map((animValue, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: color },
              {
                opacity: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1],
                }),
                transform: [
                  {
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      {message && (
        <Text style={[styles.message, { color }]}>{message}</Text>
      )}
    </View>
  );

  return overlay ? (
    <View style={styles.overlayContainer}>
      {content}
    </View>
  ) : content;
};

/**
 * Pulse Loading Component
 */
export const PulseLoading: React.FC<LoadingProps> = ({
  message,
  color = '#007AFF',
  overlay = false,
  visible = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [visible, pulseAnim]);

  if (!visible) return null;

  const content = (
    <View style={[styles.container, overlay && styles.overlay]}>
      <Animated.View
        style={[
          styles.pulseCircle,
          { backgroundColor: color },
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              },
            ],
          },
        ]}
      />
      {message && (
        <Text style={[styles.message, { color }]}>{message}</Text>
      )}
    </View>
  );

  return overlay ? (
    <View style={styles.overlayContainer}>
      {content}
    </View>
  ) : content;
};

/**
 * Shimmer Loading Component (for content placeholders)
 */
export const ShimmerLoading: React.FC<{
  width?: number;
  height?: number;
  borderRadius?: number;
  visible?: boolean;
}> = ({
  width = screenWidth - 40,
  height = 20,
  borderRadius = 4,
  visible = true,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

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

    shimmerAnimation.start();

    return () => {
      shimmerAnimation.stop();
    };
  }, [visible, shimmerAnim]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width,
          height,
          borderRadius,
        },
      ]}
    >
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
    </View>
  );
};

/**
 * Content Loading Skeleton
 */
export const SkeletonLoader: React.FC<{
  lines?: number;
  avatar?: boolean;
  visible?: boolean;
}> = ({ lines = 3, avatar = false, visible = true }) => {
  if (!visible) return null;

  return (
    <View style={styles.skeletonContainer}>
      {avatar && (
        <View style={styles.skeletonRow}>
          <ShimmerLoading width={50} height={50} borderRadius={25} />
          <View style={styles.skeletonTextContainer}>
            <ShimmerLoading width={120} height={16} />
            <ShimmerLoading width={80} height={14} />
          </View>
        </View>
      )}
      
      {Array.from({ length: lines }).map((_, index) => (
        <ShimmerLoading
          key={index}
          width={screenWidth - 40 - (index === lines - 1 ? 60 : 0)}
          height={16}
          borderRadius={4}
        />
      ))}
    </View>
  );
};

/**
 * Main Loading Component with multiple types
 */
export const Loading: React.FC<LoadingProps> = ({
  type = LoadingType.SPINNER,
  ...props
}) => {
  switch (type) {
    case LoadingType.DOTS:
      return <DotsLoading {...props} />;
    case LoadingType.PULSE:
      return <PulseLoading {...props} />;
    case LoadingType.SHIMMER:
      return <ShimmerLoading {...props} />;
    case LoadingType.SPINNER:
    default:
      return <SpinnerLoading {...props} />;
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.small / 2,
    marginHorizontal: 4,
  },
  pulseCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  shimmerContainer: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    marginVertical: 4,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ skewX: '-20deg' }],
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
});

export default Loading;