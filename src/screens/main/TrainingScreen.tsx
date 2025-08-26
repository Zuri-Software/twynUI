import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { TrainingProvider, useTraining } from '../../context/TrainingContext';
import { useAuth } from '../../context/AuthContext';
// Force TypeScript refresh
import { useAppState } from '../../context/AppStateContext';
import { useNavigation } from '@react-navigation/native';
import ModelCard from '../../components/ui/ModelCard';
import { TYPOGRAPHY, TEXT_COLORS } from '../../styles/typography';
import { COLORS } from '../../styles/colors';
import { BORDER_RADIUS, CONTAINER_RADIUS, COMPONENT_RADIUS } from '../../styles/borderRadius';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface TrainingContentProps {
  // Remove props since we're using global state now
}

function TrainingContent({}: TrainingContentProps) {
  const { logout, getAuthHeader } = useAuth();
  const navigation = useNavigation();
  const { selectedLoraId, selectLoRA } = useAppState();
  // Get training context
  const { 
    models,
    skeletonModels,
    loading,
    error,
    refreshModels,
    renameModel,
    deleteModel,
    startTraining
  } = useTraining();

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [isSelectingPhotos, setIsSelectingPhotos] = useState(false);
  const [isTrainingStarting, setIsTrainingStarting] = useState(false);

  const handleModelTap = (modelId: string) => {
    if (isDeleteMode) {
      // Exit delete mode when tapping a card (like iOS)
      console.log('[TrainingScreen] Exiting delete mode on card tap');
      setIsDeleteMode(false);
    } else {
      // Handle model selection with visual feedback
      console.log('[TrainingScreen] Model selected:', modelId);
      selectLoRA(modelId);
      
      // Show brief visual feedback then navigate to Home tab
      setTimeout(() => {
        console.log('[TrainingScreen] Navigating to Home tab after model selection');
        (navigation as any).navigate('Home');
      }, 300); // Brief delay to show selection
    }
  };

  const handleModelLongPress = () => {
    // Enter delete mode with haptic feedback (match iOS UX)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('[TrainingScreen] Entering delete mode via long press');
    setIsDeleteMode(true);
  };

  const handleRenameModel = async (modelId: string, newName: string) => {
    try {
      await renameModel(modelId, newName);
      Alert.alert('Success', 'Model renamed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to rename model');
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await deleteModel(modelId);
      Alert.alert('Success', 'Model deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete model');
    }
  };

  const handleGenerateNew = async () => {
    // First check if user has onboarding photos
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch('https://twynbackend-production.up.railway.app/api/onboarding/check-temp-folder', {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.hasOnboardingImages) {
          // User has onboarding photos, ask for model name and use those photos
          Alert.prompt(
            'Create Model',
            `Found ${data.imageCount} photos from your onboarding upload. Enter a name for your model:`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Create Model',
                onPress: (modelName) => {
                  const finalModelName = modelName?.trim() || `Model ${models.length + skeletonModels.length + 1}`;
                  handleTrainFromOnboardingPhotos(finalModelName, data.tempFolderName);
                }
              }
            ],
            'plain-text',
            `Model ${models.length + skeletonModels.length + 1}`
          );
          return;
        }
      }
      
      // No onboarding photos found, use regular photo picker flow
      Alert.prompt(
        'Create Model',
        'Enter a name for your new model:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Next',
            onPress: (modelName) => {
              if (modelName && modelName.trim()) {
                handleSelectPhotos(modelName.trim());
              } else {
                handleSelectPhotos(`Model ${models.length + skeletonModels.length + 1}`);
              }
            }
          }
        ],
        'plain-text',
        `Model ${models.length + skeletonModels.length + 1}`
      );
      
    } catch (error) {
      console.error('[Training] Error checking onboarding photos:', error);
      // Fallback to regular photo picker flow
      Alert.prompt(
        'Create Model',
        'Enter a name for your new model:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Next',
            onPress: (modelName) => {
              if (modelName && modelName.trim()) {
                handleSelectPhotos(modelName.trim());
              } else {
                handleSelectPhotos(`Model ${models.length + skeletonModels.length + 1}`);
              }
            }
          }
        ],
        'plain-text',
        `Model ${models.length + skeletonModels.length + 1}`
      );
    }
  };

  const handleTrainFromOnboardingPhotos = async (modelName: string, tempFolderName: string) => {
    try {
      setIsTrainingStarting(true);

      console.log('[Training] Creating model from onboarding photos:', { modelName, tempFolderName });

      const authHeader = await getAuthHeader();
      if (!authHeader) {
        throw new Error('Authentication required');
      }

      const response = await fetch('https://twynbackend-production.up.railway.app/api/onboarding/train-from-images', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: modelName,
          tempFolderName: tempFolderName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create model from onboarding photos');
      }

      const result = await response.json();
      console.log('[Training] Model creation started:', result);

      // Refresh models immediately to show the new training model
      await refreshModels();

      // Start more frequent polling for this specific training
      startPollingForTrainingCompletion(modelName);

      Alert.alert(
        'Model Training Started',
        `Your model "${modelName}" is now training with your onboarding photos. This may take 10-20 minutes.`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('[Training] Error creating model from onboarding photos:', error);
      Alert.alert('Error', error.message || 'Failed to create model from onboarding photos');
    } finally {
      setIsTrainingStarting(false);
    }
  };

  // Helper function to poll more frequently when we know training is happening
  const startPollingForTrainingCompletion = (modelName: string) => {
    console.log(`[Training] Starting frequent polling for model: ${modelName}`);
    
    let pollCount = 0;
    const maxPolls = 60; // 30 minutes max (30s * 60 = 1800s)
    
    const interval = setInterval(async () => {
      pollCount++;
      console.log(`[Training] Polling ${pollCount}/${maxPolls} for model: ${modelName}`);
      
      try {
        await refreshModels();
        
        // Check if training completed (model exists and not in training status)
        const completedModel = models.find(model => 
          model.name === modelName && 
          (model.status === 'completed' || model.status === 'failed')
        );
        
        if (completedModel) {
          console.log(`[Training] Model ${modelName} completed with status: ${completedModel.status}`);
          clearInterval(interval);
          return;
        }
        
        if (pollCount >= maxPolls) {
          console.log(`[Training] Polling timeout for model: ${modelName}`);
          clearInterval(interval);
          return;
        }
      } catch (error) {
        console.error(`[Training] Polling error for model ${modelName}:`, error);
      }
    }, 30000); // Check every 30 seconds
  };

  const handleSelectPhotos = async (modelName: string) => {
    try {
      setIsSelectingPhotos(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to create your model.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 50, // Allow up to 50, but require minimum 20
      });

      if (!result.canceled && result.assets) {
        const selectedImages = result.assets;
        
        if (selectedImages.length < 20) {
          Alert.alert(
            'Not Enough Photos',
            `Please select at least 20 photos to create a model. You selected ${selectedImages.length}.`,
            [{ text: 'OK' }]
          );
          return;
        }

        // Automatically start training like FluxApp
        await handleStartTraining(selectedImages, modelName);
      }
    } catch (error: any) {
      console.error('[TrainingScreen] Photo selection error:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsSelectingPhotos(false);
    }
  };

  const handleStartTraining = async (images: ImagePicker.ImagePickerAsset[], modelName: string) => {
    try {
      setIsTrainingStarting(true);
      
      // Start the training process with user-provided name
      await startTraining(modelName, images);
      
      // Brief success message like FluxApp
      setIsTrainingStarting(false);
      Alert.alert(
        'Training Started',
        `Your model "${modelName}" is being trained. You'll be notified when it's ready!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[TrainingScreen] Training start error:', error);
      Alert.alert('Error', error.message || 'Failed to start training. Please try again.');
      setIsTrainingStarting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };


  const columns = 2;
  const spacing = 16;
  const itemWidth = (screenWidth - (spacing * 3)) / columns;

  if (loading && models.length === 0 && skeletonModels.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading models...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* Header with white background extending to top edge */}
      <View style={styles.headerBackground}>
        <SafeAreaView edges={[]} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logo}
              contentFit="contain"
            />
            
            <View style={styles.spacer} />
            
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.freeButton}>
                <Text style={styles.freeButtonText}>Free</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => setShowLogoutMenu(!showLogoutMenu)}
              >
                <Text style={styles.menuButtonText}>⋯</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Logout Menu */}
      {showLogoutMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuOverlayBackground}
            onPress={() => setShowLogoutMenu(false)}
          />
          <View style={styles.menuDropdown}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowLogoutMenu(false);
                handleLogout();
              }}
            >
              <Text style={styles.menuItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}


      {/* Main content area with white background */}
      <View style={styles.contentArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback 
            onPress={() => {
              if (isDeleteMode) {
                console.log('[TrainingScreen] Exiting delete mode via background tap');
                setIsDeleteMode(false);
              }
            }}
          >
            <View style={styles.scrollContentWrapper}>
          {/* Phone Mockups Section */}
          <View style={styles.phoneMockupsSection}>
            <View style={styles.mockupStack}>
              <Image
                source={require('../../../assets/images/training/photo1.png')}
                style={[styles.mockupImage, styles.mockup1]}
                contentFit="contain"
              />
              <Image
                source={require('../../../assets/images/training/photo2.png')}
                style={[styles.mockupImage, styles.mockup2]}
                contentFit="contain"
              />
              <Image
                source={require('../../../assets/images/training/photo3.png')}
                style={[styles.mockupImage, styles.mockup3]}
                contentFit="contain"
              />
              <Image
                source={require('../../../assets/images/training/photo4.png')}
                style={[styles.mockupImage, styles.mockup4]}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.makeYourOwn}>Make your own</Text>
            <Text style={styles.twyn}>Twyn</Text>
          </View>

          {/* Generate New Button */}
          <View style={styles.generateButtonContainer}>
            <TouchableOpacity 
              onPress={handleGenerateNew}
              disabled={isSelectingPhotos || isTrainingStarting || skeletonModels.length > 0}
              style={[
                styles.generateButtonAsset,
                { opacity: (isSelectingPhotos || isTrainingStarting || skeletonModels.length > 0) ? 0.5 : 1 }
              ]}
            >
              {(isSelectingPhotos || isTrainingStarting) ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.buttonLoadingText}>
                    {isTrainingStarting ? 'Starting Training...' : 'Selecting Photos...'}
                  </Text>
                </View>
              ) : (
                <Image
                  source={require('../../../assets/images/ui/generate_uploadview.svg')}
                  style={styles.generateButtonImage}
                  contentFit="contain"
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Model Management Section */}
          {(models.length > 0 || skeletonModels.length > 0) && (
            <View style={styles.modelsSection}>
              <View style={[styles.modelsGrid, isDeleteMode && styles.modelsGridDeleteMode]}>
                {/* Skeleton models first */}
                {skeletonModels.map((skeletonModel) => (
                  <View key={skeletonModel.id} style={[styles.modelItem, { width: itemWidth }]}>
                    <ModelCard
                      model={{
                        id: skeletonModel.id,
                        name: skeletonModel.name,
                        thumbnail_url: null,
                        higgsfield_id: null,
                        created_at: skeletonModel.created_at,
                        status: 'training' as const,
                        thumbnailURL: null,
                        trainingImageCount: 0,
                        photoCount: skeletonModel.photoCount || 20 // Use actual or default
                      }}
                      isSelected={selectedLoraId === skeletonModel.id}
                      isDeleteMode={isDeleteMode}
                      onTap={() => handleModelTap(skeletonModel.id)}
                      onLongPress={handleModelLongPress}
                      onRename={(newName) => handleRenameModel(skeletonModel.id, newName)}
                      onDelete={() => handleDeleteModel(skeletonModel.id)}
                    />
                  </View>
                ))}
                {/* Completed models */}
                {models.map((model) => {
                  console.log('[TrainingScreen] Model data:', { id: model.id, name: model.name, photo_count: model.photo_count });
                  return (
                  <View key={model.id} style={[styles.modelItem, { width: itemWidth }]}>
                    <ModelCard
                      model={{
                        ...model,
                        thumbnailURL: model.thumbnail_url,
                        trainingImageCount: 0, // TODO: Get from API
                        photoCount: model.photo_count || 20 // Use actual count from API
                      }}
                      isSelected={selectedLoraId === model.id}
                      isDeleteMode={isDeleteMode}
                      onTap={() => handleModelTap(model.id)}
                      onLongPress={handleModelLongPress}
                      onRename={(newName) => handleRenameModel(model.id, newName)}
                      onDelete={() => handleDeleteModel(model.id)}
                    />
                  </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Empty state */}
          {models.length === 0 && skeletonModels.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📸</Text>
              <Text style={styles.emptyStateTitle}>No models yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first character model to start generating personalized images
              </Text>
            </View>
          )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
    </>
  );
}

export default function TrainingScreen() {
  return (
    <TrainingProvider>
      <TrainingContent />
    </TrainingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background like Swift version
  },
  
  // Header background extends to top edge
  headerBackground: {
    backgroundColor: '#ffffff',
  },
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  
  // Content area - rounded corners now handled by navigator
  contentArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  blackBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
    ...CONTAINER_RADIUS.main,
  },
  scrollContent: {
    paddingBottom: 120, // Space for tab bar
  },
  scrollContentWrapper: {
    flex: 1,
    minHeight: '100%', // Ensure it fills the ScrollView for tap detection
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52, // Status bar height + padding
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  spacer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 65,
    height: 65,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freeButton: {
    backgroundColor: COLORS.button.freeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: COMPONENT_RADIUS.button,
  },
  freeButtonText: {
    ...TYPOGRAPHY.fatFrankCaption,
    color: COLORS.button.freeText,
  },
  menuButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 18,
    color: '#000000',
    transform: [{ rotate: '90deg' }],
  },
  phoneMockupsSection: {
    height: 320,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupStack: {
    position: 'absolute',
    width: 450,
    height: 360,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -230 }, { translateY: -220 }],
  },
  mockupImage: {
    position: 'absolute',
    width: 140,
    height: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mockup1: {
    left: 50,
    top: 60,
    transform: [{ rotate: '-5deg' }],
    zIndex: 1,
    width: 180,
    height: 300,
  },
  mockup2: {
    left: 160,
    top: 60,
    transform: [{ rotate: '2deg' }],
    zIndex: 2,
  },
  mockup3: {
    left: 260,
    top: 70,
    transform: [{ rotate: '5deg' }],
    zIndex: 4,
  },
  mockup4: {
    left: 200,
    top: 120,
    transform: [{ rotate: '0deg' }],
    zIndex: 3,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -30,
    marginBottom: 20,
  },
  makeYourOwn: {
    ...TYPOGRAPHY.fatFrankLarge,
    color: TEXT_COLORS.primary,
  },
  twyn: {
    ...TYPOGRAPHY.fatFrankLarge,
    color: COLORS.primary, // Pink color like Swift version
    marginTop: -2,
  },
  generateButtonContainer: {
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  generateButtonAsset: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonImage: {
    width: 200,
    height: 56,
  },
  loadingOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonLoadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffe6e6',
    borderRadius: BORDER_RADIUS.small,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  modelsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  modelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modelItem: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  trainingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  trainingModal: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 40,
    borderRadius: BORDER_RADIUS.xlarge,
    alignItems: 'center',
  },
  trainingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  menuDropdown: {
    position: 'absolute',
    top: 120, // Position below header
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#dc3545', // Red color for logout
    fontWeight: '500',
  },
  modelsGridDeleteMode: {
    // Removed overlay z-index management since we're not using blocking overlay
  },
});