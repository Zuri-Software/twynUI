import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageViewer from 'react-native-image-zoom-viewer';

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

  // Handle status bar when visible changes
  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setHidden(false, 'fade');
      setShowControls(true);
      startControlsTimer();
    } else {
      StatusBar.setBarStyle('default', true);
      StatusBar.setHidden(false, 'fade');
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

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onDismiss}
      supportedOrientations={['portrait']}
    >
      <View style={styles.container}>
        {/* Horizontal ScrollView for seamless swiping */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContainer}
        >
          {batch.images.map((imageUri, index) => (
            <View key={index} style={styles.imageContainer}>
              <ImageViewer
                imageUrls={[{ url: imageUri }]}
                index={0}
                onSwipeDown={() => {}} // Disabled - we handle dismiss with back button
                onChange={() => {}} // Single image per viewer
                onClick={handleImageTap}
                enableSwipeDown={false}
                doubleClickInterval={index === currentIndex ? 250 : 0} // Only enable double-tap on current image
                enablePreload={false}
                backgroundColor="white"
                saveToLocalByLongPress={false}
                renderHeader={() => <View />} // No header per image - we have global header
                renderFooter={() => <View />}
                renderIndicator={() => <View />}
                // Disable zoom for non-current images
                maxOverflow={index === currentIndex ? 300 : 0}
                minScale={1}
                maxScale={index === currentIndex ? 3 : 1}
              />
            </View>
          ))}
        </ScrollView>
        
        {/* Global header overlay */}
        {showControls && (
          <View style={styles.overlayHeader}>
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
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContainer: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight,
  },
  overlayHeader: {
    position: 'absolute',
    top: 44, // Status bar height
    left: 0,
    right: 0,
    zIndex: 1000,
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
});

export default React.memo(FullScreenImageViewer);