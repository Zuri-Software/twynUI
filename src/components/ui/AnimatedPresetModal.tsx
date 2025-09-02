import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useFavorites } from '../../context/FavoritesContext';
import { useTraining } from '../../context/TrainingContext';
import { useAppState } from '../../context/AppStateContext';
import { useGeneration } from '../../context/GenerationContext';
import { useGallery } from '../../context/GalleryContext';
import { Preset } from '../../types/preset.types';
import { TYPOGRAPHY } from '../../styles/typography';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnimatedPresetModalProps {
  preset: Preset | null;
  visible: boolean;
  onClose: () => void;
  parallaxOffset: Animated.Value;
  scaleX?: Animated.Value;
  scaleY?: Animated.Value;
  contentOpacity?: Animated.Value;
  onGenerateRequest?: (preset: Preset, characterId: string) => void;
}

export default function AnimatedPresetModal({
  preset,
  visible,
  onClose,
  parallaxOffset,
  scaleX,
  scaleY,
  contentOpacity,
  onGenerateRequest
}: AnimatedPresetModalProps) {
  // Animation values
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  
  // Component state
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedModelThumbnail, setSelectedModelThumbnail] = useState<string | undefined>();
  const [imageError, setImageError] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Context hooks
  const { isFavorited, toggleFavorite } = useFavorites();
  
  // Helper function to check if current preset is favorited
  const isCurrentPresetFavorited = preset ? isFavorited(preset.id, 'preset') : false;
  const { models, skeletonModels } = useTraining();
  const { selectedLoraId, selectLoRA } = useAppState();
  const { startGeneration } = useGeneration();
  const { addPendingGeneration } = useGallery();

  // Computed values
  const allModels = [...models, ...skeletonModels];
  const selectedModel = allModels.find(m => m.id === selectedLoraId);
  const hasMultipleModels = allModels.length > 1;
  const hasModels = allModels.length > 0;

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const newOffset = Math.max(0, gestureState.dy);
        slideAnim.setValue(newOffset);
        
        // Progressive expansion as user drags down with same delayed timing
        const dragProgress = Math.min(1, newOffset / screenHeight); // 0 to 1 as modal slides down
        
        // Apply delayed expansion - only expand when drag reaches 40% threshold
        const delayedExpansion = Math.max(0, (dragProgress - 0.4) / 0.6); // Start at 40%, full at 100%
        const expansionProgress = Math.min(1, delayedExpansion);
        
        const parallaxValue = -200 * (1 - expansionProgress); // -200 to 0
        parallaxOffset.setValue(parallaxValue);
        
        // Scale and opacity effects for expansion during drag
        if (scaleX && scaleY && contentOpacity) {
          const scaleXValue = 0.85 + (expansionProgress * 0.15); // 0.85 to 1
          const scaleYValue = 0.7 + (expansionProgress * 0.3);   // 0.7 to 1
          const opacityValue = 0.3 + (expansionProgress * 0.7);  // 0.3 to 1
          
          scaleX.setValue(scaleXValue);
          scaleY.setValue(scaleYValue);
          contentOpacity.setValue(opacityValue);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 200) {
          // Dismiss if dragged more than 200px
          handleClose();
        } else {
          // Snap back to compressed position
          const slideAnimation = Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          });
          
          // Add listener to update compression as it snaps back with delayed timing
          const slideListener = slideAnim.addListener(({ value }) => {
            const progress = 1 - (value / screenHeight); // 0 to 1 as modal slides up
            
            // Apply same delayed compression timing
            const delayedProgress = Math.max(0, (progress - 0.4) / 0.6); // Start at 40%, full at 100%
            const compressionProgress = Math.min(1, delayedProgress);
            
            parallaxOffset.setValue(-200 * compressionProgress);
            
            if (scaleX && scaleY && contentOpacity) {
              const scaleXValue = 1 - (compressionProgress * 0.15); // 1 to 0.85
              const scaleYValue = 1 - (compressionProgress * 0.3);  // 1 to 0.7
              const opacityValue = 1 - (compressionProgress * 0.7); // 1 to 0.3
              
              scaleX.setValue(scaleXValue);
              scaleY.setValue(scaleYValue);
              contentOpacity.setValue(opacityValue);
            }
          });
          
          slideAnimation.start(() => {
            slideAnim.removeListener(slideListener);
          });
        }
      },
    })
  ).current;

  // Show animation with progressive compression effect
  const showModal = () => {
    setImageError(false);
    imageOpacity.setValue(0);
    
    // Animate slide and compression together, but make compression follow the slide position
    const slideAnimation = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    });
    
    // Add listener to update compression based on slide progress
    const slideListener = slideAnim.addListener(({ value }) => {
      const progress = 1 - (value / screenHeight); // 0 to 1 as modal slides up
      
      // Delay compression start - only compress when modal is significantly up (after 40% of slide)
      const delayedProgress = Math.max(0, (progress - 0.4) / 0.6); // Start at 40%, full at 100%
      const compressionProgress = Math.min(1, delayedProgress);
      
      parallaxOffset.setValue(-200 * compressionProgress);
      
      if (scaleX && scaleY && contentOpacity) {
        const scaleXValue = 1 - (compressionProgress * 0.15); // 1 to 0.85
        const scaleYValue = 1 - (compressionProgress * 0.3);  // 1 to 0.7
        const opacityValue = 1 - (compressionProgress * 0.7); // 1 to 0.3
        
        scaleX.setValue(scaleXValue);
        scaleY.setValue(scaleYValue);
        contentOpacity.setValue(opacityValue);
      }
    });
    
    slideAnimation.start(() => {
      slideAnim.removeListener(slideListener);
    });

    // Delayed image fade-in (matching SwiftUI)
    setTimeout(() => {
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 200);
  };

  // Hide animation with progressive expansion effect
  const handleClose = () => {
    const slideAnimation = Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    });
    
    // Add listener to update expansion based on slide progress with delayed timing
    const slideListener = slideAnim.addListener(({ value }) => {
      const progress = value / screenHeight; // 0 to 1 as modal slides down
      
      // Apply delayed expansion - only expand when slide reaches 40% threshold
      const delayedExpansion = Math.max(0, (progress - 0.4) / 0.6); // Start at 40%, full at 100%
      const expansionProgress = Math.min(1, delayedExpansion);
      
      parallaxOffset.setValue(-200 * (1 - expansionProgress)); // -200 to 0
      
      if (scaleX && scaleY && contentOpacity) {
        const scaleXValue = 0.85 + (expansionProgress * 0.15); // 0.85 to 1
        const scaleYValue = 0.7 + (expansionProgress * 0.3);   // 0.7 to 1
        const opacityValue = 0.3 + (expansionProgress * 0.7);  // 0.3 to 1
        
        scaleX.setValue(scaleXValue);
        scaleY.setValue(scaleYValue);
        contentOpacity.setValue(opacityValue);
      }
    });
    
    slideAnimation.start(() => {
      slideAnim.removeListener(slideListener);
      onClose();
      setShowDropdown(false);
    });
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!preset || !selectedLoraId || !hasModels) return;

    try {
      setIsGenerating(true);
      
      const pendingId = addPendingGeneration({
        name: preset.name,
        image_url: preset.image_url
      });

      await startGeneration(preset, selectedLoraId, allModels);
      
      handleClose();
    } catch (error) {
      console.error('[AnimatedPresetModal] Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (preset) {
      console.log('[AnimatedPresetModal] Toggling favorite for preset:', preset.id, 'Current state:', isCurrentPresetFavorited);
      await toggleFavorite(preset);
      console.log('[AnimatedPresetModal] After toggle, new state should be:', !isCurrentPresetFavorited);
    }
  };

  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    selectLoRA(modelId);
    setShowDropdown(false);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    console.log('[AnimatedPresetModal] Toggle dropdown called, current state:', showDropdown);
    console.log('[AnimatedPresetModal] hasMultipleModels:', hasMultipleModels);
    console.log('[AnimatedPresetModal] allModels.length:', allModels.length);
    setShowDropdown(!showDropdown);
  };

  // Effect to show/hide modal
  useEffect(() => {
    if (visible && preset) {
      showModal();
      loadSelectedModelThumbnail();
    } else if (!visible) {
      slideAnim.setValue(screenHeight);
      parallaxOffset.setValue(0);
      imageOpacity.setValue(0);
      
      // Reset compression values
      if (scaleX && scaleY && contentOpacity) {
        scaleX.setValue(1);
        scaleY.setValue(1);
        contentOpacity.setValue(1);
      }
    }
  }, [visible, preset]);

  // Effect to load thumbnail when selected model changes
  useEffect(() => {
    if (selectedLoraId) {
      loadSelectedModelThumbnail();
    }
  }, [selectedLoraId]);

  // Load thumbnail for the currently selected model
  const loadSelectedModelThumbnail = () => {
    if (!selectedLoraId) {
      setSelectedModelThumbnail(undefined);
      return;
    }

    const model = allModels.find(m => m.id === selectedLoraId);
    if (!model) {
      setSelectedModelThumbnail(undefined);
      return;
    }

    // For now, use the model's existing thumbnail if available
    const thumbnailUrl = 'thumbnail_url' in model ? model.thumbnail_url : undefined;
    setSelectedModelThumbnail(thumbnailUrl || undefined);
  };

  if (!preset) return null;

  return (
    <>
      {/* Modal content */}
      {visible && (
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Large White Drag Handle Header */}
          <View style={styles.dragHandleHeader}>
            <View style={styles.dragHandleContent}>
              <View style={styles.dragHandleIcon}>
                <Text style={styles.refreshIcon}>↻</Text>
              </View>
              <Text style={styles.dragHandleText}>Swipe down to hide</Text>
            </View>
          </View>
          
          <View style={styles.content}>
            <View style={styles.spacer} />
            
            {/* Centered Image */}
            <View style={styles.imageContainer}>
              <View style={styles.imagePlaceholder}>
                <Animated.View style={[styles.imageWrapper, { opacity: imageOpacity }]}>
                  {!imageError ? (
                    <Image
                      source={{ uri: preset.image_url }}
                      style={styles.presetImage}
                      contentFit="cover"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                      transition={300}
                      onError={(error) => {
                        console.error('[AnimatedPresetModal] Image load error:', error);
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorIcon}>🖼️</Text>
                      <Text style={styles.errorText}>Image not available</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>

            {/* Title and Favorites Row */}
            <View style={styles.titleRow}>
              <Text style={styles.presetTitle}>{preset.name}</Text>
              
              <TouchableOpacity 
                style={[
                  styles.favoriteButton,
                  isCurrentPresetFavorited && styles.favoriteButtonActive
                ]}
                onPress={handleFavoriteToggle}
              >
                <Text style={[
                  styles.favoriteIcon,
                  { color: isCurrentPresetFavorited ? '#FE6EFD' : 'rgba(255,255,255,0.7)' }
                ]}>
                  ♥
                </Text>
              </TouchableOpacity>
            </View>

            {/* Generate Button with Dropdown */}
            <View style={styles.generateButtonContainer}>
              {/* Button Asset */}
              <View style={[
                styles.generateButtonAsset,
                { opacity: hasModels && !isGenerating ? 1.0 : 0.5 }
              ]}>
                <Image
                  source={require('../../../assets/images/ui/generate_button_dropdown.png')}
                  style={styles.generateButtonImage}
                  contentFit="contain"
                />
                
                {/* Character Thumbnail Overlay */}
                <View style={styles.thumbnailOverlay}>
                  {selectedModelThumbnail ? (
                    <Image
                      source={{ uri: selectedModelThumbnail }}
                      style={styles.characterThumbnail}
                      contentFit="cover"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                    />
                  ) : (
                    <View style={styles.defaultThumbnail}>
                      {/* Pink circle for empty state */}
                    </View>
                  )}
                </View>

                {/* Loading Overlay */}
                {isGenerating && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.loadingText}>Generating...</Text>
                  </View>
                )}
              </View>

              {/* Invisible Touch Areas */}
              <View style={styles.touchAreas} pointerEvents="box-none">
                {/* Left side - Generate button tap area */}
                <TouchableOpacity
                  style={styles.generateTouchArea}
                  onPress={handleGenerate}
                  disabled={!hasModels || isGenerating}
                  activeOpacity={0.7}
                />
                
                {/* Right side - Dropdown tap area (only if multiple models) */}
                {hasMultipleModels && (
                  <TouchableOpacity
                    style={styles.dropdownTouchArea}
                    onPress={toggleDropdown}
                    disabled={!hasModels || isGenerating}
                    activeOpacity={0.7}
                  />
                )}
              </View>

              {/* Dropdown Menu */}
              {showDropdown && hasMultipleModels && (
                <View style={styles.dropdown}>
                  <ScrollView 
                    style={styles.dropdownScrollView}
                    contentContainerStyle={styles.dropdownScrollContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {allModels
                      .sort((a, b) => {
                        if (a.id === selectedLoraId) return -1;
                        if (b.id === selectedLoraId) return 1;
                        return 0;
                      })
                      .map((model, index) => (
                      <TouchableOpacity
                        key={model.id}
                        style={[
                          styles.dropdownItem,
                          index === 0 && styles.firstDropdownItem,
                          index === allModels.length - 1 && styles.lastDropdownItem
                        ]}
                        onPress={() => handleModelSelect(model.id)}
                      >
                        <Text style={styles.dropdownItemText} numberOfLines={1}>{model.name}</Text>
                        {selectedLoraId === model.id && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.spacer} />
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1001,
  },
  dragHandleHeader: {
    height: 130,
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    paddingTop: 50, // Account for safe area
    paddingBottom: 20,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  dragHandleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dragHandleIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  dragHandleText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  spacer: {
    flex: 1,
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: screenWidth * 0.85,
    height: 400,
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
    overflow: 'hidden',
  },
  imageWrapper: {
    flex: 1,
  },
  presetImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  presetTitle: {
    flex: 1,
    ...TYPOGRAPHY.fatFrankHeadline,
    color: '#ffffff',
  },
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(254, 110, 253, 0.2)', // Pink background when favorited
  },
  favoriteIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  generateButtonContainer: {
    width: '100%',
    position: 'relative',
  },
  generateButtonAsset: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonImage: {
    width: 280,
    height: 50,
  },
  thumbnailOverlay: {
    position: 'absolute',
    right: 52,
    top: '50%',
    marginTop: -16,
  },
  touchAreas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  generateTouchArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownTouchArea: {
    width: 80,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    gap: 8,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  characterThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defaultThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FE6EFD', // Pink circle for empty state
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defaultThumbnailIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  dropdown: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    backgroundColor: '#FF48D8',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 200,
    maxHeight: 200,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownScrollContent: {
    flexGrow: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  firstDropdownItem: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
    padding: 20,
    borderRadius: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
});