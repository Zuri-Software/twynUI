import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SelectedModelContextType {
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string | null) => void;
  clearSelectedModel: () => void;
}

const SelectedModelContext = createContext<SelectedModelContextType | undefined>(undefined);

const SELECTED_MODEL_KEY = 'twyn_selected_model_id';

interface SelectedModelProviderProps {
  children: ReactNode;
}

export function SelectedModelProvider({ children }: SelectedModelProviderProps) {
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null);

  // Load selected model from storage on app start
  useEffect(() => {
    loadSelectedModel();
  }, []);

  const loadSelectedModel = async () => {
    try {
      const storedModelId = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      if (storedModelId) {
        setSelectedModelIdState(storedModelId);
        console.log('[SelectedModelContext] Loaded selected model from storage:', storedModelId);
      }
    } catch (error) {
      console.error('[SelectedModelContext] Failed to load selected model:', error);
    }
  };

  const setSelectedModelId = async (modelId: string | null) => {
    try {
      setSelectedModelIdState(modelId);
      
      if (modelId) {
        await AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId);
        console.log('[SelectedModelContext] ✅ Selected model set to:', modelId);
      } else {
        await AsyncStorage.removeItem(SELECTED_MODEL_KEY);
        console.log('[SelectedModelContext] ❌ Selected model cleared');
      }
    } catch (error) {
      console.error('[SelectedModelContext] Failed to save selected model:', error);
    }
  };

  const clearSelectedModel = () => {
    setSelectedModelId(null);
  };

  const contextValue: SelectedModelContextType = {
    selectedModelId,
    setSelectedModelId,
    clearSelectedModel,
  };

  return (
    <SelectedModelContext.Provider value={contextValue}>
      {children}
    </SelectedModelContext.Provider>
  );
}

export function useSelectedModel(): SelectedModelContextType {
  const context = useContext(SelectedModelContext);
  if (context === undefined) {
    throw new Error('useSelectedModel must be used within a SelectedModelProvider');
  }
  return context;
}

export default SelectedModelContext;