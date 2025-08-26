import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Preset } from '../types/preset.types';

interface FavoriteItem {
  id: string;
  type: 'preset' | 'image';
  data: Preset | {
    imageUrl: string;
    batchId: string;
    generatedAt: Date;
    prompt?: string;
  };
  createdAt: Date;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoriteIds: Set<string>; // Keep for backward compatibility
  isFavorited: (id: string, type: 'preset' | 'image') => boolean;
  addFavorite: (item: FavoriteItem) => Promise<void>;
  removeFavorite: (id: string, type: 'preset' | 'image') => Promise<void>;
  toggleFavorite: (preset: Preset) => Promise<void>; // Keep for backward compatibility
  getFavorites: (type?: 'preset' | 'image') => FavoriteItem[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

const FAVORITES_KEY = 'favorited_items';
const OLD_PRESETS_KEY = 'favorited_presets'; // For migration

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set()); // Keep for compatibility

  // Load favorites from storage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      // Try to load new format first
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const favoriteItems: FavoriteItem[] = JSON.parse(stored);
        // Convert dates back from strings
        const processedItems = favoriteItems.map(item => ({
          ...item,
          createdAt: new Date(item.createdAt),
          data: item.type === 'image' && typeof item.data === 'object' && 'generatedAt' in item.data
            ? { ...item.data, generatedAt: new Date(item.data.generatedAt) }
            : item.data
        }));
        
        setFavorites(processedItems);
        setFavoriteIds(new Set(processedItems.map(item => item.id)));
        console.log('[FavoritesContext] Loaded', processedItems.length, 'favorites from storage');
        return;
      }

      // Migration: Check for old format
      const oldStored = await AsyncStorage.getItem(OLD_PRESETS_KEY);
      if (oldStored) {
        const oldFavoriteIds: string[] = JSON.parse(oldStored);
        console.log('[FavoritesContext] Migrating', oldFavoriteIds.length, 'old favorites');
        
        // Convert old preset IDs to new format (we don't have the full preset data, so just store IDs)
        const migratedItems: FavoriteItem[] = oldFavoriteIds.map(presetId => ({
          id: presetId,
          type: 'preset' as const,
          data: { id: presetId } as any, // Minimal data for migration
          createdAt: new Date(),
        }));
        
        setFavorites(migratedItems);
        setFavoriteIds(new Set(oldFavoriteIds));
        
        // Save in new format and remove old
        await saveFavorites(migratedItems);
        await AsyncStorage.removeItem(OLD_PRESETS_KEY);
      }
    } catch (error) {
      console.error('[FavoritesContext] Error loading favorites:', error);
    }
  };

  const saveFavorites = async (newFavorites: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      console.log('[FavoritesContext] Saved', newFavorites.length, 'favorites to storage');
    } catch (error) {
      console.error('[FavoritesContext] Error saving favorites:', error);
    }
  };

  const isFavoritedById = (id: string, type: 'preset' | 'image'): boolean => {
    return favorites.some(fav => fav.id === id && fav.type === type);
  };

  const addFavorite = async (item: FavoriteItem): Promise<void> => {
    const newFavorites = [...favorites];
    
    // Check if already exists
    const existingIndex = newFavorites.findIndex(fav => fav.id === item.id && fav.type === item.type);
    if (existingIndex >= 0) {
      console.log('[FavoritesContext] Item already favorited:', item.id);
      return;
    }
    
    newFavorites.push(item);
    setFavorites(newFavorites);
    setFavoriteIds(new Set([...favoriteIds, item.id]));
    
    console.log('[FavoritesContext] Added favorite:', item.type, item.id);
    await saveFavorites(newFavorites);
  };

  const removeFavorite = async (id: string, type: 'preset' | 'image'): Promise<void> => {
    const newFavorites = favorites.filter(fav => !(fav.id === id && fav.type === type));
    setFavorites(newFavorites);
    setFavoriteIds(new Set(newFavorites.map(fav => fav.id)));
    
    console.log('[FavoritesContext] Removed favorite:', type, id);
    await saveFavorites(newFavorites);
  };

  // Keep for backward compatibility
  const isFavorited = (preset: Preset): boolean => {
    return favoriteIds.has(preset.id);
  };

  const toggleFavorite = async (preset: Preset): Promise<void> => {
    console.log('[❤️ Favorites] Button tapped for preset:', preset.id);
    
    if (isFavoritedById(preset.id, 'preset')) {
      await removeFavorite(preset.id, 'preset');
    } else {
      const favoriteItem: FavoriteItem = {
        id: preset.id,
        type: 'preset',
        data: preset,
        createdAt: new Date(),
      };
      await addFavorite(favoriteItem);
    }
  };

  const getFavoritesOld = (): string[] => {
    return Array.from(favoriteIds);
  };

  const getFavorites = (type?: 'preset' | 'image'): FavoriteItem[] => {
    if (type) {
      return favorites.filter(fav => fav.type === type);
    }
    return favorites;
  };

  const contextValue: FavoritesContextType = {
    favorites,
    favoriteIds,
    isFavorited: isFavoritedById,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavorites,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

export default FavoritesContext;