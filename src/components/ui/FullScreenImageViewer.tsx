import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { useFavorites } from '../../context/FavoritesContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GenerationBatch {
  id: string;
  images: string[];
  generatedAt: Date;
  preset?: any;
}

interface FullScreenImageViewerProps {
  batch: GenerationBatch;
  initialIndex: number;
  visible: boolean;
  onDismiss: () => void;
}

function FullScreenImageViewer({
  batch,
  initialIndex,
  visible,
  onDismiss,
}: FullScreenImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Shared values for swipe-to-dismiss
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  
  // Favorites context - now natively supports images
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();
  
  // Current image info
  const currentImageUrl = batch.images[currentIndex];
  const isImageFavorited = isFavorited(currentImageUrl, 'image');

  // Format generation date - memoized
  const formattedDate = React.useMemo(() => {
    const date = batch.generatedAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }, [batch.generatedAt]);

  // Control auto-hide functionality
  const startControlsTimer = () => {
    clearControlsTimer();
    controlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const clearControlsTimer = () => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  };

  // Reset current index and scroll position when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    // Scroll to the initial image
    if (scrollViewRef.current && visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * screenWidth,
          animated: false,
        });
      }, 100);
    }
  }, [initialIndex, visible]);

  // Handle initial setup when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Reset all animated values when modal opens
      translateY.value = 0;
      opacity.value = 1;
      scale.value = 1;
      
      setShowControls(true);
      startControlsTimer();
    } else {
      clearControlsTimer();
    }
  }, [visible]);

  // Clear timer on unmount
  useEffect(() => {
    return () => clearControlsTimer();
  }, []);

  // Handle scroll end to update current index
  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < batch.images.length) {
      setCurrentIndex(newIndex);
    }
  };

  const handleImageTap = () => {
    setShowControls(!showControls);
    if (!showControls) {
      startControlsTimer();
    }
  };

  // Swipe-to-dismiss gesture - only activate for clearly vertical swipes
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetY(25)  // Need 25px vertical movement to activate
    .failOffsetX([-30, 30])  // Fail if more than 30px horizontal movement
    .onUpdate((event) => {
      const { translationY, translationX } = event;
      
      // Only respond to downward swipes that are clearly more vertical than horizontal
      if (translationY > 0 && Math.abs(translationY) > Math.abs(translationX) * 1.5) {
        translateY.value = translationY;
        
        // Calculate progress for visual feedback
        const progress = Math.min(translationY / 200, 1);
        const backgroundOpacity = Math.max(0.3, 1 - progress);
        const imageScale = Math.max(0.8, 1 - progress * 0.2);
        
        opacity.value = backgroundOpacity;
        scale.value = imageScale;
        
        // Hide controls during drag
        if (showControls) {
          runOnJS(setShowControls)(false);
        }
      }
    })
    .onEnd((event) => {
      const { translationY, velocityY } = event;
      
      // Determine if should dismiss based on distance or velocity
      const shouldDismiss = translationY > 120 || (translationY > 60 && velocityY > 400);
      
      if (shouldDismiss) {
        // Animate to dismiss
        translateY.value = withTiming(screenHeight, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        // Return to original position
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
        scale.value = withSpring(1, { damping: 20, stiffness: 300 }, () => {
          runOnJS(setShowControls)(true);
          runOnJS(startControlsTimer)();
        });
      }
    });

  // Animated style for the container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const handleShare = async () => {
    try {
      const currentImageUrl = batch.images[currentIndex];
      console.log('[FullScreenImageViewer] Sharing image:', currentImageUrl);
      
      // Download the image to a temporary file first
      const filename = `twyn_image_${Date.now()}.jpg`;
      const tempPath = `${FileSystem.cacheDirectory}${filename}`;
      
      console.log('[FullScreenImageViewer] Downloading image to:', tempPath);
      const downloadResult = await FileSystem.downloadAsync(currentImageUrl, tempPath);
      
      if (downloadResult.status === 200) {
        // Share the local file instead of the URL
        await Share.share({
          url: downloadResult.uri,
          message: 'Check out this AI-generated image from Twyn!',
        });
        
        console.log('[FullScreenImageViewer] Successfully shared local image file');
      } else {
        throw new Error('Failed to download image');
      }
      
    } catch (error) {
      console.error('[FullScreenImageViewer] Share error:', error);
      alert('Failed to share image');
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      console.log('[FullScreenImageViewer] Toggling favorite for image:', currentImageUrl);
      
      if (isImageFavorited) {
        // Remove from favorites
        await removeFavorite(currentImageUrl, 'image');
        console.log('[FullScreenImageViewer] Removed from favorites');
      } else {
        // Add to favorites
        const favoriteItem = {
          id: currentImageUrl,
          type: 'image' as const,
          data: {
            imageUrl: currentImageUrl,
            batchId: batch.id,
            generatedAt: batch.generatedAt,
            prompt: batch.preset?.prompt || '',
          },
          createdAt: new Date(),
        };
        
        await addFavorite(favoriteItem);
        console.log('[FullScreenImageViewer] Added to favorites');
      }
    } catch (error) {
      console.error('[FullScreenImageViewer] Favorite error:', error);
      alert('Failed to update favorites');
    }
  };

  const handleSaveToPhotos = async () => {
    try {
      const currentImageUrl = batch.images[currentIndex];
      console.log('[FullScreenImageViewer] Saving image directly to Photos:', currentImageUrl);
      
      // Request media library permissions first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access photo library is required to save images.');
        return;
      }
      
      // Download the image to a temporary file first
      const filename = `twyn_image_${Date.now()}.jpg`;
      const tempPath = `${FileSystem.cacheDirectory}${filename}`;
      
      console.log('[FullScreenImageViewer] Downloading image to:', tempPath);
      const downloadResult = await FileSystem.downloadAsync(currentImageUrl, tempPath);
      
      if (downloadResult.status === 200) {
        // Save directly to photo library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        alert('Image saved to Photos!');
        console.log('[FullScreenImageViewer] Successfully saved image to Photos');
      } else {
        throw new Error('Failed to download image');
      }
      
    } catch (error) {
      console.error('[FullScreenImageViewer] Save to photos error:', error);
      alert('Failed to save image to Photos');
    }
  };

  const handleDelete = async () => {
    try {
      const currentImageUrl = batch.images[currentIndex];
      console.log('[FullScreenImageViewer] Deleting image:', currentImageUrl);
      
      // TODO: Show confirmation dialog and implement delete
      alert('Delete functionality - coming soon!');
    } catch (error) {
      console.error('[FullScreenImageViewer] Delete error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onDismiss}
      supportedOrientations={['portrait']}
    >
      <StatusBar style={showControls ? "dark" : "light"} backgroundColor="transparent" />
      <GestureHandlerRootView style={styles.container}>
        <Reanimated.View 
          style={[
            styles.animatedContainer,
            animatedStyle
          ]}
        >
          {/* White background overlay that appears/disappears with controls */}
          {showControls && <View style={styles.whiteBackgroundOverlay} />}
          
        
        {/* Horizontal ScrollView for seamless swiping */}
        <GestureDetector gesture={panGesture}>
          <ScrollView
            ref={scrollViewRef as any}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContainer}
            style={styles.imageScrollView}
          >
          {batch.images.map((imageUri, index) => (
            <View key={`image-${index}`} style={styles.imageContainer}>
              <ScrollView
                style={styles.zoomContainer}
                contentContainerStyle={styles.zoomContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                zoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                scrollEnabled={index === currentIndex} // Only allow scroll on current image
                onScrollBeginDrag={() => setShowControls(false)} // Hide controls when zooming
                onScrollEndDrag={() => setShowControls(true)} // Show controls after zoom
              >
                <TouchableOpacity 
                  onPress={handleImageTap}
                  activeOpacity={1}
                  disabled={index !== currentIndex} // Only allow tap on current image
                >
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.fullScreenImage}
                    contentFit="contain"
                    priority="high"
                    cachePolicy="memory-disk"
                    transition={200}
                    placeholder="Loading..."
                  />
                </TouchableOpacity>
              </ScrollView>
            </View>
          ))}
          </ScrollView>
        </GestureDetector>
        
        {/* Global header overlay */}
        <SafeAreaView style={styles.overlayHeader} edges={['top']}>
          {showControls && (
            <View style={styles.topControls}>
              <View style={styles.leftSection}>
                <TouchableOpacity style={styles.backButton} onPress={onDismiss}>
                  <Text style={styles.backIcon}>‹</Text>
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.centerSection}>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>
                    {formattedDate}
                  </Text>
                </View>
              </View>
              
              <View style={styles.rightSection}>
                {batch.images.length > 1 && (
                  <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>
                      {currentIndex + 1} of {batch.images.length}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </SafeAreaView>

        {/* Footer with share, favorites, delete */}
        <SafeAreaView style={styles.footer} edges={['bottom']}>
          {showControls && (
            <View style={styles.footerBlur}>
              <TouchableOpacity 
                style={styles.footerButton}
                onPress={handleShare}
                activeOpacity={0.7}
              >
                <View style={styles.buttonIconContainer}>
                  <Text style={styles.shareIcon}>↗</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.footerButton}
                onPress={handleFavoriteToggle}
                activeOpacity={0.7}
              >
                <View style={styles.buttonIconContainer}>
                  <Text style={[styles.heartIcon, isImageFavorited && styles.heartIconFilled]}>
                    {isImageFavorited ? '♥' : '♡'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.footerButton}
                onPress={handleSaveToPhotos}
                activeOpacity={0.7}
              >
                <View style={styles.buttonIconContainer}>
                  <Text style={styles.saveIcon}>↓</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
        </Reanimated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  animatedContainer: {
    flex: 1,
  },
  whiteBackgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  imageScrollView: {
    zIndex: 2,
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    flex: 1,
  },
  zoomContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth,
    height: screenHeight,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    minWidth: 80,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#007AFF',
    marginRight: 4,
    fontWeight: '500',
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  dateContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
  },
  dateText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  counterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
  },
  counterText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  footerBlur: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 40,
  },
  footerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  heartIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  heartIconFilled: {
    color: '#FF3B30', // Red when favorited
  },
  saveIcon: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default React.memo(FullScreenImageViewer);