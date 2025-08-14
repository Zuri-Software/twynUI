import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useGallery } from '../../context/GalleryContext';
import { useGeneration } from '../../context/GenerationContext';
import { TYPOGRAPHY, TEXT_COLORS } from '../../styles/typography';
import { COLORS } from '../../styles/colors';
import PhotoStackView from '../../components/ui/PhotoStackView';
import SkeletonImageView from '../../components/ui/SkeletonImageView';
import StackExpansionView from '../../components/ui/StackExpansionView';
import FreePillButton from '../../components/ui/FreePillButton';

const { width: screenWidth } = Dimensions.get('window');

function GalleryContent() {
  const { 
    generationBatches, 
    pendingGenerations, 
    isLoading, 
    errorMessage, 
    refresh 
  } = useGallery();
  
  const { retryGeneration, skeletonGenerations } = useGeneration();
  
  // Debug logging for generations
  console.log('[GalleryScreen] 🔍 Render - skeletonGenerations count:', skeletonGenerations.length);
  console.log('[GalleryScreen] 🔍 Render - generationBatches count:', generationBatches.length);
  if (skeletonGenerations.length > 0) {
    console.log('[GalleryScreen] 🔍 Render - skeletonGenerations:', skeletonGenerations.map(s => ({
      id: s.id,
      preset: s.preset.name,
      failed: s.failed,
      errorMessage: s.errorMessage
    })));
  }
  
  // Add effect to watch for skeleton generations changes
  useEffect(() => {
    console.log('[GalleryScreen] 🎯 skeletonGenerations changed:', skeletonGenerations.length);
    if (skeletonGenerations.length > 0) {
      console.log('[GalleryScreen] 🎯 Skeleton generations details:', skeletonGenerations.map(s => ({
        id: s.id,
        failed: s.failed,
        errorMessage: s.errorMessage
      })));
    }
  }, [skeletonGenerations]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleStackTap = (batch: any) => {
    console.log('[GalleryScreen] Stack tapped:', batch.id);
    setSelectedBatch(batch);
  };


  const columns = 2;
  const spacing = 20;
  const itemWidth = (screenWidth - (spacing * 3)) / columns;

  if (isLoading && generationBatches.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
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
              source={require('../../../assets/icon.png')} // Using default Expo icon for now
              style={styles.logo}
              contentFit="contain"
            />
            
            <Text style={styles.galleryTitle}>GALLERY</Text>
            
            <View style={styles.headerButtons}>
              <FreePillButton />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main content area with white background */}
      <View style={styles.contentArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        >

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Gallery Grid */}
          <View style={styles.gridContainer}>
            <View style={styles.grid}>
              {/* Skeleton generations (loading and failed) */}
              {skeletonGenerations.length > 0 && console.log('[GalleryScreen] 🎨 Rendering', skeletonGenerations.length, 'skeleton generations')}
              {skeletonGenerations.map((skeleton) => {
                console.log('[GalleryScreen] 🎨 Rendering skeleton for:', skeleton.id, skeleton.preset?.name, 'failed:', skeleton.failed);
                return (
                  <View key={skeleton.id} style={[styles.gridItem, { width: itemWidth }]}>
                    <SkeletonImageView 
                      preset={{
                        name: skeleton.preset.name,
                        image_url: skeleton.preset.image_url
                      }}
                      width={itemWidth - 10}
                      height={(itemWidth - 10) * 4 / 3}
                      failed={skeleton.failed}
                      errorMessage={skeleton.errorMessage}
                      onRetry={() => retryGeneration(skeleton.id)}
                    />
                  </View>
                );
              })}

              {/* Generation batches as photo stacks */}
              {generationBatches.map((batch) => (
                <View key={batch.id} style={[styles.gridItem, { width: itemWidth }]}>
                  <PhotoStackView
                    batch={batch}
                    onTap={() => handleStackTap(batch)}
                    width={itemWidth - 10}
                    height={(itemWidth - 10) * 4 / 3}
                  />
                </View>
              ))}

              {/* Empty state */}
              {generationBatches.length === 0 && pendingGenerations.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>🎨</Text>
                  <Text style={styles.emptyStateTitle}>No generations yet</Text>
                  <Text style={styles.emptyStateText}>
                    Start creating by browsing presets and generating your first images!
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Stack expansion overlay */}
      {selectedBatch && (
        <StackExpansionView
          batch={selectedBatch}
          onDismiss={() => setSelectedBatch(null)}
          visible={true}
        />
      )}
    </>
  );
}

export default function GalleryScreen() {
  return <GalleryContent />;
}

const styles = StyleSheet.create({
  // Main container with black background extending to all edges
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background like HomeScreen
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
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 20, // Small padding for content separation
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
  logo: {
    width: 65,
    height: 65,
  },
  galleryTitle: {
    flex: 1,
    ...TYPOGRAPHY.fatFrankLarge,
    color: TEXT_COLORS.primary,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 14,
  },
  gridContainer: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    width: screenWidth,
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
});