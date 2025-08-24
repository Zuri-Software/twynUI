import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useFavorites } from '../../context/FavoritesContext';
import { useTraining } from '../../context/TrainingContext';
import { useAppState } from '../../context/AppStateContext';
import { useGeneration } from '../../context/GenerationContext';
import { useGallery } from '../../context/GalleryContext';
import { Preset } from '../../types/preset.types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PresetDetailScreenProps {
  preset: Preset;
  characterId?: string;
  onGenerateRequest?: (preset: Preset, characterId: string) => void;
}

export default function PresetDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Debug route params
  console.log('[🔍 PresetDetailScreen] Route params keys:', Object.keys(route.params || {}));
  console.log('[🔍 PresetDetailScreen] Full route params:', route.params);
  console.log('[🔍 PresetDetailScreen] onGenerateRequest type:', typeof (route.params as any)?.onGenerateRequest);
  
  const { preset, characterId, onGenerateRequest } = route.params as {
    preset: Preset;
    characterId?: string; 
    onGenerateRequest?: (preset: Preset, characterId: string) => void;
  };
  
  console.log('[🔍 PresetDetailScreen] Extracted onGenerateRequest:', !!onGenerateRequest);

  const { isFavorited, toggleFavorite } = useFavorites();
  const { models, skeletonModels } = useTraining();
  const { selectedLoraId, selectLoRA } = useAppState();
  const { startGeneration } = useGeneration();
  const { addPendingGeneration } = useGallery();

  const [showImage, setShowImage] = useState(true); // Start with true for debugging
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>(characterId);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedModelThumbnail, setSelectedModelThumbnail] = useState<string | undefined>();
  const [imageError, setImageError] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number }>({ top: 60 });
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fadeAnim = new Animated.Value(1); // Start with 1 for debugging

  // Initialize selected character
  useEffect(() => {
    console.log('[🎯 PresetDetailScreen] onAppear - models count:', models.length + skeletonModels.length);
    console.log('[🎯 PresetDetailScreen] onAppear - characterId passed:', characterId || 'nil');
    console.log('[🎯 PresetDetailScreen] onAppear - globalSelectedModelId:', selectedLoraId || 'nil');
    console.log('[🎯 PresetDetailScreen] Preset image URL:', preset.image_url);
    
    // Priority: passed characterId > global selected model > first available
    const allModels = [...models, ...skeletonModels];
    const initialCharacterId = characterId || selectedLoraId || allModels[0]?.id;
    setSelectedCharacterId(initialCharacterId);
    
    console.log('[🎯 PresetDetailScreen] onAppear - selectedCharacterId set to:', initialCharacterId || 'nil');
    
    // Load thumbnail for selected model
    loadSelectedModelThumbnail(initialCharacterId);
    
    // Simplified - no delay for debugging
    setShowImage(true);
    fadeAnim.setValue(1);
  }, [models, skeletonModels, characterId, selectedLoraId]);

  // Update thumbnail when selected model changes
  useEffect(() => {
    loadSelectedModelThumbnail(selectedCharacterId);
  }, [selectedCharacterId]);

  const loadSelectedModelThumbnail = async (modelId?: string) => {
    if (!modelId) {
      setSelectedModelThumbnail(undefined);
      return;
    }

    const allModels = [...models, ...skeletonModels];
    const model = allModels.find(m => m.id === modelId);
    if (!model) {
      setSelectedModelThumbnail(undefined);
      return;
    }

    try {
      // TODO: Implement API call to fetch training images
      // For now, use the model's existing thumbnail
      const thumbnailUrl = 'thumbnail_url' in model ? model.thumbnail_url : undefined;
      setSelectedModelThumbnail(thumbnailUrl || undefined);
    } catch (error) {
      console.error('[PresetDetailScreen] Failed to load thumbnail for model', model.name, ':', error);
      setSelectedModelThumbnail(undefined);
    }
  };

  const handleFavoriteToggle = async () => {
    await toggleFavorite(preset);
  };

  const handleGenerate = async () => {
    console.log('[🎯 PresetDetailScreen] 🚀 handleGenerate called - Button pressed!');
    
    if (!selectedCharacterId) {
      console.log('[🎯 PresetDetailScreen] No characterId selected - showing alert');
      Alert.alert(
        'Create a Model First',
        'Please go to the Training tab and create a character model before generating images.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('[🎯 PresetDetailScreen] 📲 Calling onGenerateRequest with characterId:', selectedCharacterId);
    console.log('[🎯 PresetDetailScreen] 📝 Preset details:', {
      name: preset.name,
      style_id: preset.style_id,
      prompt: preset.prompt
    });
    
    // Use context directly instead of relying on navigation params
    try {
      setIsGenerating(true);
      console.log('[🎯 PresetDetailScreen] ⏳ Starting generation process using context directly...');
      
      // Add pending generation skeleton to gallery
      console.log('[🎯 PresetDetailScreen] 🤔 About to call addPendingGeneration...');
      console.log('[🎯 PresetDetailScreen] 🤔 addPendingGeneration function available:', !!addPendingGeneration);
      console.log('[🎯 PresetDetailScreen] 🤔 Preset data:', { name: preset.name, image_url: preset.image_url });
      
      const pendingId = addPendingGeneration({
        name: preset.name,
        image_url: preset.image_url
      });
      console.log('[🎯 PresetDetailScreen] 📝 Added pending generation to gallery:', pendingId);
      
      await startGeneration(preset, selectedCharacterId, allModels);
      
      console.log('[🎯 PresetDetailScreen] ✅ Generation request completed, navigating back');
      navigation.goBack();
    } catch (error) {
      console.error('[🎯 PresetDetailScreen] ❌ Generation failed:', error);
      // Error handling is done in GenerationContext
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedCharacterId(modelId);
    selectLoRA(modelId); // Update global state
    setShowDropdown(false);
    console.log('[🎯 PresetDetailScreen] Model selected in dropdown:', modelId);
  };

  const toggleDropdown = () => {
    if (!showDropdown) {
      // Since generate button is near bottom, always position dropdown above it
      // This ensures it never gets cut off by the bottom of the screen
      const allModels = [...models, ...skeletonModels];
      const itemHeight = 60;
      const maxItems = Math.min(allModels.length, 4);
      const dropdownHeight = maxItems * itemHeight;
      
      console.log('[PresetDetailScreen] Positioning dropdown above button, height:', dropdownHeight);
      setDropdownPosition({ bottom: 60 }); // Always position above
    }
    setShowDropdown(!showDropdown);
  };

  const allModels = [...models, ...skeletonModels];
  const selectedModel = allModels.find(m => m.id === selectedCharacterId);
  const hasMultipleModels = allModels.length > 1;
  const hasModels = allModels.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Black background */}
      <View style={styles.blackBackground}>
        
        {/* Main Content */}
        <View style={styles.content}>
          
          {/* Centered Image */}
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              {!imageError ? (
                <Image
                  source={{ uri: preset.image_url }}
                  style={styles.presetImage}
                  contentFit="cover"
                  placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                  transition={300}
                  onError={(error) => {
                    console.error('[PresetDetailScreen] Image load error:', error);
                    console.log('[PresetDetailScreen] Failed image URL:', preset.image_url);
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('[PresetDetailScreen] Image loaded successfully:', preset.image_url);
                  }}
                />
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorIcon}>🖼️</Text>
                  <Text style={styles.errorText}>Image not available</Text>
                  <Text style={styles.errorUrl} numberOfLines={2}>{preset.image_url}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Title and Favorites Row */}
          <View style={styles.titleRow}>
            <Text style={styles.presetTitle}>{preset.name}</Text>
            
            <TouchableOpacity 
              style={styles.favoriteButton}
              onPress={handleFavoriteToggle}
            >
              <Text style={[
                styles.favoriteIcon,
                { color: isFavorited(preset) ? '#FF69B4' : 'rgba(255,255,255,0.7)' }
              ]}>
                {isFavorited(preset) ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Generate Button with Dropdown */}
          <View style={styles.generateButtonContainer}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                { opacity: hasModels && !isGenerating ? 1.0 : 0.5 }
              ]}
              onPress={handleGenerate}
              disabled={!hasModels || isGenerating}
            >
              <View style={styles.generateButtonContent}>
                {isGenerating && (
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.generateButtonText}>
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Text>
                
                {/* Character Thumbnail */}
                <View style={styles.thumbnailContainer}>
                  {selectedModelThumbnail ? (
                    <Image
                      source={{ uri: selectedModelThumbnail }}
                      style={styles.characterThumbnail}
                      contentFit="cover"
                      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                    />
                  ) : (
                    <View style={styles.defaultThumbnail}>
                      <Text style={styles.defaultThumbnailIcon}>👤</Text>
                    </View>
                  )}
                  
                  {/* Dropdown Arrow (only if multiple models) */}
                  {hasMultipleModels && (
                    <TouchableOpacity
                      style={styles.dropdownArrow}
                      onPress={toggleDropdown}
                    >
                      <Text style={[styles.dropdownArrowText, {
                        transform: [{ rotate: showDropdown ? '0deg' : '180deg' }] // Inverted since dropdown is above
                      }]}>▲</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showDropdown && hasMultipleModels && (
              <View style={[styles.dropdown, dropdownPosition]}>
                {/* Sort models to show selected model first */}
                {allModels
                  .slice(0, 4)
                  .sort((a, b) => {
                    // Selected model goes first
                    if (a.id === selectedCharacterId) return -1;
                    if (b.id === selectedCharacterId) return 1;
                    return 0;
                  })
                  .map((model, index) => (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.dropdownItem,
                      index === 0 && styles.firstDropdownItem,
                      index === Math.min(allModels.length - 1, 3) && styles.lastDropdownItem
                    ]}
                    onPress={() => handleModelSelect(model.id)}
                  >
                    <Text style={styles.dropdownItemText} numberOfLines={1}>{model.name}</Text>
                    {selectedCharacterId === model.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                
                {allModels.length > 4 && (
                  <View style={styles.dropdownMoreItem}>
                    <Text style={styles.dropdownMoreText}>+{allModels.length - 4} more</Text>
                  </View>
                )}
              </View>
            )}
          </View>

        </View>

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  blackBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 12,
    zIndex: 100,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  generateButtonContainer: {
    width: '100%',
    position: 'relative',
  },
  generateButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 25,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 8,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
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
    backgroundColor: 'rgba(128,128,128,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  defaultThumbnailIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  dropdownArrow: {
    marginLeft: 8,
    padding: 4,
  },
  dropdownArrowText: {
    color: '#ffffff',
    fontSize: 12,
  },
  dropdown: {
    position: 'absolute',
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
    maxHeight: 240, // Limit height to 4 items
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
  dropdownMoreItem: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownMoreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
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
  errorUrl: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});