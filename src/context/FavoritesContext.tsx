import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Preset } from '../types/preset.types';

interface FavoritesContextType {
  favoriteIds: Set<string>;
  isFavorited: (preset: Preset) => boolean;
  toggleFavorite: (preset: Preset) => Promise<void>;
  getFavorites: () => string[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

const FAVORITES_KEY = 'favorited_presets';

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites from storage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const favoriteArray: string[] = JSON.parse(stored);
        setFavoriteIds(new Set(favoriteArray));
        console.log('[FavoritesContext] Loaded', favoriteArray.length, 'favorites from storage');
      }
    } catch (error) {
      console.error('[FavoritesContext] Error loading favorites:', error);
    }
  };

  const saveFavorites = async (newFavorites: Set<string>) => {
    try {
      const favoriteArray = Array.from(newFavorites);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteArray));
      console.log('[FavoritesContext] Saved', favoriteArray.length, 'favorites to storage');
    } catch (error) {
      console.error('[FavoritesContext] Error saving favorites:', error);
    }
  };

  const isFavorited = (preset: Preset): boolean => {
    return favoriteIds.has(preset.id);
  };

  const toggleFavorite = async (preset: Preset): Promise<void> => {
    console.log('[❤️ Favorites] Button tapped for preset:', preset.id);
    
    const newFavorites = new Set(favoriteIds);
    
    if (newFavorites.has(preset.id)) {
      newFavorites.delete(preset.id);
      console.log('[❤️ Favorites] Removed from favorites:', preset.name);
    } else {
      newFavorites.add(preset.id);
      console.log('[❤️ Favorites] Added to favorites:', preset.name);
    }
    
    setFavoriteIds(newFavorites);
    await saveFavorites(newFavorites);
    
    console.log('[❤️ Favorites] Is now favorited:', newFavorites.has(preset.id));
  };

  const getFavorites = (): string[] => {
    return Array.from(favoriteIds);
  };

  const contextValue: FavoritesContextType = {
    favoriteIds,
    isFavorited,
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