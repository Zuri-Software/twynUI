import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFavorites } from '../../context/FavoritesContext';
import { APIService } from '../../services/APIService';
import { Preset } from '../../types/preset.types';
import StaggeredGrid from '../../components/ui/StaggeredGrid';
import { AdaptivePresetCard } from '../../components/ui/PresetCard';

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const { favoriteIds, isFavorited } = useFavorites();
  
  const [favoritePresets, setFavoritePresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFavoritePresets();
  }, [favoriteIds]);

  const loadFavoritePresets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (favoriteIds.size === 0) {
        setFavoritePresets([]);
        setIsLoading(false);
        return;
      }

      // Fetch all presets and filter by favorites
      const allPresets = await APIService.fetchPresets();
      const favorites = allPresets.filter(preset => isFavorited(preset));
      
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
    navigation.navigate('PresetDetail' as never, { preset } as never);
  };

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

  if (favoritePresets.length === 0) {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>
          {favoritePresets.length} saved preset{favoritePresets.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <StaggeredGrid
        data={favoritePresets}
        columns={2}
        spacing={12}
        renderItem={(preset) => (
          <AdaptivePresetCard
            preset={preset}
            onPress={handlePresetPress}
            showFavoriteIndicator={true}
          />
        )}
        keyExtractor={(preset) => preset.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  gridContent: {
    paddingBottom: 100, // Extra padding for tab bar
  },
});