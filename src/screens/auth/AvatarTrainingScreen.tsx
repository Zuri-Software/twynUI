import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

interface AvatarTrainingScreenProps {
  onUploadComplete: (tempFolderName?: string) => void;
}

interface SelectedImage {
  id: string;
  uri: string;
  width?: number;
  height?: number;
}

export default function AvatarTrainingScreen({ onUploadComplete }: AvatarTrainingScreenProps) {
  const { getAuthHeader } = useAuth();
  
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to upload training images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleSelectPhotos = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [1, 1],
        selectionLimit: 25,
      });

      if (!result.canceled && result.assets) {
        const images: SelectedImage[] = result.assets.map((asset, index) => ({
          id: `${Date.now()}_${index}`,
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        
        setSelectedImages(images);
        setErrorMessage(null);
        
        // Auto-start upload if images are selected
        if (images.length > 0) {
          uploadPhotos(images);
        }
      }
    } catch (error: any) {
      console.error('[AvatarTraining] Error selecting photos:', error);
      setErrorMessage('Failed to select photos. Please try again.');
    }
  };

  const uploadPhotos = async (images: SelectedImage[]) => {
    setErrorMessage(null);
    setIsUploading(true);
    setProgressText(`Uploading ${images.length} photos...`);

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        throw new Error('Not authenticated');
      }

      // Convert images to form data
      const formData = new FormData();
      
      for (let i = 0; i < images.length; i++) {
        setProgressText(`Processing image ${i + 1}/${images.length}...`);
        
        const image = images[i];
        const response = await fetch(image.uri);
        const blob = await response.blob();
        
        // Create file object for form data
        formData.append('images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `image_${i + 1}.jpg`,
        } as any);
      }

      setProgressText('Uploading to cloud...');

      // Upload to backend
      const uploadResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/onboarding/batch-upload`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(errorText || 'Upload failed');
      }

      const result = await uploadResponse.json();
      const tempFolderName = result.tempModelId;

      setIsUploading(false);
      onUploadComplete(tempFolderName);

    } catch (error: any) {
      console.error('[AvatarTraining] Upload error:', error);
      setErrorMessage(error.message || 'Failed to upload photos. Please try again.');
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    onUploadComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          {/* Logo placeholder */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>TWYN</Text>
          </View>
          
          {/* Upload area / Avatar image placeholder */}
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleSelectPhotos}
            disabled={isUploading}
          >
            {selectedImages.length > 0 ? (
              <View style={styles.selectedImagesPreview}>
                <View style={styles.imageGrid}>
                  {selectedImages.slice(0, 4).map((image, index) => (
                    <Image
                      key={image.id}
                      source={{ uri: image.uri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                  ))}
                  {selectedImages.length > 4 && (
                    <View style={styles.moreImagesOverlay}>
                      <Text style={styles.moreImagesText}>+{selectedImages.length - 4}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadIcon}>
                  <Text style={styles.uploadEmoji}>📷</Text>
                </View>
                <Text style={styles.uploadText}>Tap to select photos</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Title and Description */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Make your Twyn</Text>
          <Text style={styles.description}>
            Your AI Twin. Your Aesthetic. Your Rules. It only takes one moment and 20+ images of yourself
          </Text>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          {selectedImages.length > 0 && !isUploading && (
            <Text style={styles.selectedCount}>
              Selected {selectedImages.length} photo{selectedImages.length !== 1 ? 's' : ''}
            </Text>
          )}

          {isUploading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#FF48D8" />
              <Text style={styles.progressText}>{progressText}</Text>
            </View>
          )}

          {errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {!isUploading && (
            <>
              {selectedImages.length === 0 && (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={handleSelectPhotos}
                >
                  <Text style={styles.selectButtonText}>Select Photos (Max 25)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF48D8',
  },
  uploadArea: {
    width: screenWidth * 0.8,
    height: 200,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadIcon: {
    marginBottom: 12,
  },
  uploadEmoji: {
    fontSize: 48,
  },
  uploadText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  selectedImagesPreview: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 40,
    minHeight: 40,
  },
  selectedCount: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 14,
    color: '#ff3333',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionSection: {
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});