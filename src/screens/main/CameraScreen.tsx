import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Modal, ScrollView, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useCamera } from '../../context/CameraContext';
import { useTraining } from '../../context/TrainingContext';
import { useAppState } from '../../context/AppStateContext';
import { useGallery } from '../../context/GalleryContext';

// Import camera properly
import { CameraView, useCameraPermissions } from 'expo-camera';

interface CameraScreenProps {
  // Will add navigation types later
}

export default function CameraScreen({}: CameraScreenProps) {
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [pendingCaptureData, setPendingCaptureData] = useState<{
    captureId: string;
    capturedImage: string;
    analysisPrompt: string;
  } | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const navigation = useNavigation();
  
  // Context hooks
  const { state: cameraState, captureImage, analyzeImage, startGeneration, startGenerationWithCaptureId } = useCamera();
  const { models } = useTraining();
  const { selectedLoraId, availableLoRAs } = useAppState();
  const { addPendingGeneration } = useGallery();

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'We need camera access to create amazing avatars from your photos',
        [
          { text: 'Cancel', onPress: () => navigation.goBack() },
          { text: 'Settings', onPress: () => {/* Open settings */} }
        ]
      );
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || cameraState.isCapturing) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      console.log('[CameraScreen] Photo captured:', photo.uri);
      
      // Store captured image in camera context
      captureImage(photo.uri);
      
      // Auto-start analysis and show model selection
      try {
        console.log('[CameraScreen] 🔍 Starting automatic analysis...');
        
        const analysisResult = await analyzeImage(photo.uri);
        
        console.log('[CameraScreen] ✅ Analysis complete with captureId:', analysisResult.captureId);
        
        if (!analysisResult.captureId) {
          console.error('[CameraScreen] ❌ No captureId in analysis result');
          Alert.alert('Error', 'Failed to analyze photo properly. Please try again.');
          return;
        }
        
        // Store capture data and show model selection modal
        setPendingCaptureData({
          captureId: analysisResult.captureId,
          capturedImage: photo.uri,
          analysisPrompt: analysisResult.prompt
        });
        setShowModelSelection(true);
        
      } catch (analysisError) {
        console.error('[CameraScreen] Analysis failed:', analysisError);
        Alert.alert(
          'Analysis Failed',
          'We couldn\'t analyze your photo. Please try again with a different photo.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      
    } catch (error) {
      console.error('[CameraScreen] Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };


  const toggleCameraType = () => {
    setFacing(current => current === 'back' ? 'front' : 'back');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlash(current => current === 'off' ? 'on' : 'off');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleModelSelection = async (modelId: string) => {
    if (!pendingCaptureData) return;
    
    try {
      console.log('[CameraScreen] 🎯 Model selected:', modelId);
      setShowModelSelection(false);
      
      // Add pending generation to gallery for skeleton loading state
      const pendingId = addPendingGeneration({
        name: 'Camera Avatar',
        image_url: pendingCaptureData.capturedImage
      });
      console.log('[CameraScreen] Added pending generation to gallery:', pendingId);
      
      // Start generation using captureId directly
      await startGenerationWithCaptureId(modelId, pendingCaptureData.captureId);
      
      Alert.alert(
        'Generation Started!',
        'Your camera avatar is being generated. You\'ll receive a notification when it\'s ready.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error('[CameraScreen] Generation failed:', error);
      Alert.alert('Generation Failed', 'Failed to start avatar generation. Please try again.');
    }
  };

  const handleCloseModelSelection = () => {
    setShowModelSelection(false);
    setPendingCaptureData(null);
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.noPermissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#666666" />
        <Text style={styles.noPermissionTitle}>Camera Access Needed</Text>
        <Text style={styles.noPermissionText}>
          We need camera access to create amazing avatars from your photos
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={handlePermissionRequest}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        {/* Header Controls */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Create Avatar</Text>
          
          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Ionicons 
              name={flash === 'on' ? "flash" : "flash-off"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>

        {/* Camera Controls */}
        <View style={styles.controls}>
          {/* Grid Toggle (placeholder for future) */}
          <View style={styles.controlButton}>
            <Ionicons name="grid-outline" size={24} color="#ffffff" opacity={0.6} />
          </View>

          {/* Capture Button */}
          <TouchableOpacity
            style={[
              styles.captureButton, 
              (cameraState.isCapturing || cameraState.isAnalyzing) && styles.captureButtonDisabled
            ]}
            onPress={handleCapture}
            disabled={cameraState.isCapturing || cameraState.isAnalyzing}
          >
            {cameraState.isCapturing || cameraState.isAnalyzing ? (
              <ActivityIndicator size="large" color="#000000" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
            <Ionicons name="camera-reverse-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {cameraState.isCapturing ? 'Capturing photo...' :
             cameraState.isAnalyzing ? 'Analyzing photo...' :
             'Position yourself in the frame and tap to capture'}
          </Text>
          <Text style={styles.instructionSubtext}>
            {cameraState.isAnalyzing ? 'AI is understanding your photo' :
             'AI will create a unique avatar based on your photo'}
          </Text>
        </View>
      </CameraView>
      
      {/* Model Selection Modal */}
      <Modal
        visible={showModelSelection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModelSelection}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModelSelection}>
              <Text style={styles.modalCloseButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Your Model</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <Text style={styles.modalSubtitle}>
            Select which trained model to use for your camera avatar
          </Text>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {availableLoRAs.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={styles.modelOption}
                onPress={() => handleModelSelection(model.id)}
                activeOpacity={0.7}
              >
                <View style={styles.modelCard}>
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    <Text style={styles.modelDetails}>
                      Trained • Ready for generation
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666666" />
                </View>
              </TouchableOpacity>
            ))}
            
            {availableLoRAs.length === 0 && (
              <View style={styles.noModelsState}>
                <Text style={styles.noModelsTitle}>No Models Available</Text>
                <Text style={styles.noModelsText}>
                  You need to train a model first before generating camera avatars.
                </Text>
                <TouchableOpacity 
                  style={styles.trainButton}
                  onPress={() => {
                    setShowModelSelection(false);
                    navigation.navigate('Training');
                  }}
                >
                  <Text style={styles.trainButtonText}>Train a Model</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  noPermissionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  noPermissionText: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 32,
  },
  permissionButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
  },
  instructions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalCloseButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modelOption: {
    marginBottom: 12,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  modelDetails: {
    fontSize: 14,
    color: '#666666',
  },
  noModelsState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noModelsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  noModelsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  trainButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  trainButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});