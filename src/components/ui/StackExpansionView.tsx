import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface GenerationBatch {
  images: string[];
  id?: string;
}

interface StackExpansionViewProps {
  batch: GenerationBatch;
  onDismiss: () => void;
  visible: boolean;
}

export default function StackExpansionView({
  batch,
  onDismiss,
  visible,
}: StackExpansionViewProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Calculate image size for 3:4 ratio with padding
  const imageWidth = (screenWidth - 60) / 2; // 30px total horizontal padding + 20px spacing
  const imageHeight = imageWidth * 4 / 3; // 3:4 ratio

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleBackPress = () => {
    console.log('[StackExpansionView] Back button pressed');
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      console.log('[StackExpansionView] Calling onDismiss');
      onDismiss();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackPress}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Top navigation bar with back arrow */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Text style={styles.backIcon}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* 2x2 Grid of images */}
          <View style={styles.gridContainer}>
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                {/* Top Left */}
                {batch.images[0] && (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setSelectedImageUrl(batch.images[0])}
                  >
                    <Image
                      source={{ 
                        uri: batch.images[0],
                        width: imageWidth,
                        height: imageHeight,
                      }}
                      style={[styles.image, { width: imageWidth, height: imageHeight }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                      transition={100}
                    />
                  </TouchableOpacity>
                )}

                {/* Top Right */}
                {batch.images[1] && (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setSelectedImageUrl(batch.images[1])}
                  >
                    <Image
                      source={{ 
                        uri: batch.images[1],
                        width: imageWidth,
                        height: imageHeight,
                      }}
                      style={[styles.image, { width: imageWidth, height: imageHeight }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                      transition={100}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.gridRow}>
                {/* Bottom Left */}
                {batch.images[2] && (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setSelectedImageUrl(batch.images[2])}
                  >
                    <Image
                      source={{ 
                        uri: batch.images[2],
                        width: imageWidth,
                        height: imageHeight,
                      }}
                      style={[styles.image, { width: imageWidth, height: imageHeight }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                      transition={100}
                    />
                  </TouchableOpacity>
                )}

                {/* Bottom Right */}
                {batch.images[3] && (
                  <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={() => setSelectedImageUrl(batch.images[3])}
                  >
                    <Image
                      source={{ 
                        uri: batch.images[3],
                        width: imageWidth,
                        height: imageHeight,
                      }}
                      style={[styles.image, { width: imageWidth, height: imageHeight }]}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                      transition={100}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* Full screen image overlay */}
        {selectedImageUrl && (
          <View style={styles.fullScreenOverlay}>
            <TouchableOpacity 
              style={styles.fullScreenBackground}
              onPress={() => setSelectedImageUrl(null)}
              activeOpacity={1}
            >
              <Image
                source={{ 
                  uri: selectedImageUrl,
                  width: screenWidth * 0.9,
                  height: screenHeight * 0.7,
                }}
                style={styles.fullScreenImage}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    zIndex: 2000,
    backgroundColor: 'white',
    elevation: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 44,
    minWidth: 80,
    zIndex: 2001,
    elevation: 11,
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
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imageContainer: {
    marginHorizontal: 10,
  },
  image: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  fullScreenBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
    maxWidth: screenWidth * 0.9,
    maxHeight: screenHeight * 0.7,
  },
});