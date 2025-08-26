import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFavorites } from '../../context/FavoritesContext';
import { APIService } from '../../services/APIService';
import { Preset } from '../../types/preset.types';
import StaggeredGrid from '../../components/ui/StaggeredGrid';
import { AdaptivePresetCard } from '../../components/ui/PresetCard';
import { Image } from 'expo-image';
import FullScreenImageViewer from '../../components/ui/FullScreenImageViewer';
import AnimatedPresetModal from '../../components/ui/AnimatedPresetModal';

const { width: screenWidth } = Dimensions.get('window');

type FilterType = 'all' | 'images' | 'presets';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { favoriteIds, isFavorited, getFavorites } = useFavorites();
  
  const [favoritePresets, setFavoritePresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImageBatch, setSelectedImageBatch] = useState<any>(null);
  const selectedImageBatchRef = useRef<any>(null);
  const viewerKeyRef = useRef<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  // Animation refs for preset modal (same as HomeScreen)
  const parallaxOffset = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  
  // Get favorites from context
  const allFavorites = getFavorites();
  const imageFavorites = getFavorites('image');
  const presetFavoriteItems = getFavorites('preset');

  // Memoize the current batch to prevent remounting
  const currentBatch = React.useMemo(() => 
    selectedImageBatch || selectedImageBatchRef.current, 
    [selectedImageBatch, selectedImageBatchRef.current]
  );

  // Memoize the dismiss handler to prevent prop changes
  const stableDismissHandler = React.useCallback(() => {
    console.log('[FavoritesScreen] Dismissing viewer');
    setFullScreenVisible(false);
    setSelectedImageBatch(null);
    selectedImageBatchRef.current = null;
    viewerKeyRef.current = null;
  }, []);

  useEffect(() => {
    console.log('[FavoritesScreen] Preset favorites changed, reloading presets. Current viewer state:', {
      fullScreenVisible,
      hasSelectedBatch: !!selectedImageBatch,
      hasRefBatch: !!selectedImageBatchRef.current
    });
    loadFavoritePresets();
  }, [presetFavoriteItems.length]); // Only reload when preset count changes


  const loadFavoritePresets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (presetFavoriteItems.length === 0) {
        setFavoritePresets([]);
        setIsLoading(false);
        return;
      }

      // Fetch all presets and filter by favorites
      const allPresets = await APIService.fetchPresets();
      const favorites = allPresets.filter(preset => 
        presetFavoriteItems.some(fav => fav.id === preset.id)
      );
      
      console.log('[FavoritesScreen] Loaded', favorites.length, 'favorite presets');
      setFavoritePresets(favorites);
    } catch (error: any) {
      console.error('[FavoritesScreen] Error loading favorite presets:', error);
      setError(error.message || 'Failed to load favorite presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetPress = (preset: Preset) => {
    console.log('[FavoritesScreen] Preset selected:', preset.name);
    setSelectedPreset(preset);
    setShowPresetModal(true);
  };

  const handlePresetModalClose = () => {
    setShowPresetModal(false);
    setSelectedPreset(null);
  };

  const handleImagePress = (imageFavorite: any) => {
    console.log('[FavoritesScreen] Image selected:', imageFavorite.originalId);
    
    // Create a batch object similar to gallery format for full screen viewer
    const batch = {
      id: imageFavorite.data.batchId || imageFavorite.originalId,
      images: [imageFavorite.data.imageUrl],
      generatedAt: imageFavorite.data.generatedAt || imageFavorite.createdAt,
      preset: imageFavorite.data.prompt ? { prompt: imageFavorite.data.prompt } : undefined,
    };
    
    // Store in both state and ref to persist through re-renders
    setSelectedImageBatch(batch);
    selectedImageBatchRef.current = batch;
    viewerKeyRef.current = `viewer-${batch.id}-${Date.now()}`;
    setFullScreenVisible(true);
    console.log('[FavoritesScreen] Opening viewer with key:', viewerKeyRef.current);
  };


  // Create combined grid data based on current filter
  const getFilteredGridData = () => {
    let combinedData: any[] = [];

    // Add images to combined data if filter allows
    if (currentFilter === 'all' || currentFilter === 'images') {
      const imageItems = imageFavorites.map(imageFav => ({
        ...imageFav,
        itemType: 'image',
        image_url: imageFav.data.imageUrl,
        name: 'AI Generated Image',
        id: imageFav.id + '_image', // Ensure unique ID
        originalId: imageFav.id,
      }));
      combinedData = [...combinedData, ...imageItems];
    }

    // Add presets to combined data if filter allows
    if (currentFilter === 'all' || currentFilter === 'presets') {
      const presetItems = favoritePresets.map(preset => ({
        ...preset,
        itemType: 'preset',
        id: preset.id + '_preset', // Ensure unique ID
        originalId: preset.id,
      }));
      combinedData = [...combinedData, ...presetItems];
    }

    return combinedData;
  };

  const handleItemPress = (item: any) => {
    if (item.itemType === 'image') {
      handleImagePress(item);
    } else {
      // Find the original preset data from favoritePresets
      const originalPreset = favoritePresets.find(preset => preset.id === item.originalId);
      if (originalPreset) {
        handlePresetPress(originalPreset);
      }
    }
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, currentFilter === 'all' && styles.filterTabActive]}
        onPress={() => setCurrentFilter('all')}
      >
        <Text style={[styles.filterText, currentFilter === 'all' && styles.filterTextActive]}>
          All ({allFavorites.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, currentFilter === 'images' && styles.filterTabActive]}
        onPress={() => setCurrentFilter('images')}
      >
        <Text style={[styles.filterText, currentFilter === 'images' && styles.filterTextActive]}>
          Images ({imageFavorites.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterTab, currentFilter === 'presets' && styles.filterTabActive]}
        onPress={() => setCurrentFilter('presets')}
      >
        <Text style={[styles.filterText, currentFilter === 'presets' && styles.filterTextActive]}>
          Presets ({favoritePresets.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const handleRefresh = () => {
    loadFavoritePresets();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved presets</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF48D8" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved presets</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (favoritePresets.length === 0 && imageFavorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Favorites</Text>
          <Text style={styles.subtitle}>Your saved presets</Text>
        </View>
        
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>❤️</Text>
          </View>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Browse presets and tap the heart icon to save your favorites here
          </Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('Home' as never)}
          >
            <Text style={styles.browseButtonText}>Browse Presets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredData = getFilteredGridData();
  const totalFavorites = favoritePresets.length + imageFavorites.length;

  return (
    <>
      {/* Main Content with Animation Support */}
      <Animated.View style={[
        styles.container,
        {
          transform: [
            { translateY: parallaxOffset },
            { scaleX: scaleX },
            { scaleY: scaleY }
          ],
          opacity: contentOpacity,
        },
      ]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.title}>Favorites</Text>
            <Text style={styles.subtitle}>
              {totalFavorites} saved item{totalFavorites !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Filter Tabs */}
          {renderFilterTabs()}

          {/* Combined Grid */}
          <StaggeredGrid
            data={filteredData}
            columns={2}
            spacing={12}
            renderItem={(item) => (
              <AdaptivePresetCard
                preset={item}
                onPress={handleItemPress}
                showFavoriteIndicator={true}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
          />

          {/* Full Screen Image Viewer */}
          {currentBatch && fullScreenVisible && (
            <FullScreenImageViewer
              key={viewerKeyRef.current}
              batch={currentBatch}
              initialIndex={0}
              visible={fullScreenVisible}
              onDismiss={stableDismissHandler}
            />
          )}
        </SafeAreaView>
      </Animated.View>

      {/* Animated Preset Modal */}
      <AnimatedPresetModal
        preset={selectedPreset}
        visible={showPresetModal}
        onClose={handlePresetModalClose}
        parallaxOffset={parallaxOffset}
        scaleX={scaleX}
        scaleY={scaleY}
        contentOpacity={contentOpacity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff3333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffeef5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#FF48D8',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 40, // Reduced padding to match other screens
  },
});