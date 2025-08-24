import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIService } from '../services/APIService';
import ImageCacheManager, { CachePriority } from '../services/ImageCacheManager';
import { useAuth } from './AuthContext';
import { AuthState } from '../types/auth.types';

// Model interfaces
export interface LoRAModel {
  id: string;
  userId: string;
  name: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  higgsfield_id?: string;
  thumbnail_url?: string;
  photoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainedModel extends LoRAModel {
  thumbnailURL: string | null;
  trainingImageCount: number;
}

// App State interface
interface AppState {
  selectedLoraId: string | null;
  availableLoRAs: LoRAModel[];
  navigationResetTrigger: string;
  loading: boolean;
  error: string | null;
  modelsLastLoaded: number | null;
  preloadedThumbnails: Set<string>;
}

// Action types
type AppStateAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_LORA'; payload: string | null }
  | { type: 'SET_AVAILABLE_LORAS'; payload: LoRAModel[] }
  | { type: 'RESET_NAVIGATION' }
  | { type: 'ADD_MODEL'; payload: LoRAModel }
  | { type: 'UPDATE_MODEL'; payload: { id: string; updates: Partial<LoRAModel> } }
  | { type: 'DELETE_MODEL'; payload: string }
  | { type: 'SET_MODELS_LOADED'; payload: number }
  | { type: 'ADD_PRELOADED_THUMBNAIL'; payload: string };

// Context interface
interface AppStateContextType {
  // State
  selectedLoraId: string | null;
  availableLoRAs: LoRAModel[];
  navigationResetTrigger: string;
  loading: boolean;
  error: string | null;
  
  // Actions
  selectLoRA: (loraId: string | null) => Promise<void>;
  loadAvailableLoRAs: () => Promise<void>;
  resetNavigationState: () => void;
  handleNewLoRATrained: (loraId: string) => Promise<void>;
  refreshModels: () => Promise<void>;
  updateModel: (id: string, updates: Partial<LoRAModel>) => void;
  deleteModel: (id: string) => Promise<void>;
  
  // Helper methods
  getModelById: (id: string) => LoRAModel | undefined;
  getSelectedModel: () => LoRAModel | undefined;
  getThumbnailForModel: (modelId: string) => Promise<string | null>;
}

// Initial state
const initialState: AppState = {
  selectedLoraId: null,
  availableLoRAs: [],
  navigationResetTrigger: '',
  loading: false,
  error: null,
  modelsLastLoaded: null,
  preloadedThumbnails: new Set(),
};

// Reducer
const appStateReducer = (state: AppState, action: AppStateAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_SELECTED_LORA':
      return { ...state, selectedLoraId: action.payload };
      
    case 'SET_AVAILABLE_LORAS':
      return { ...state, availableLoRAs: action.payload };
      
    case 'RESET_NAVIGATION':
      return { ...state, navigationResetTrigger: Date.now().toString() + Math.random() };
      
    case 'ADD_MODEL':
      return {
        ...state,
        availableLoRAs: [action.payload, ...state.availableLoRAs].sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        ),
      };
      
    case 'UPDATE_MODEL':
      return {
        ...state,
        availableLoRAs: state.availableLoRAs.map(model =>
          model.id === action.payload.id
            ? { ...model, ...action.payload.updates }
            : model
        ),
      };
      
    case 'DELETE_MODEL':
      return {
        ...state,
        availableLoRAs: state.availableLoRAs.filter(model => model.id !== action.payload),
        selectedLoraId: state.selectedLoraId === action.payload ? null : state.selectedLoraId,
      };
      
    case 'SET_MODELS_LOADED':
      return { ...state, modelsLastLoaded: action.payload };
      
    case 'ADD_PRELOADED_THUMBNAIL':
      return {
        ...state,
        preloadedThumbnails: new Set([...state.preloadedThumbnails, action.payload]),
      };
      
    default:
      return state;
  }
};

// Storage keys
const SELECTED_MODEL_KEY = 'twyn_selected_model_id';
const MODELS_CACHE_KEY = 'twyn_cached_models';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Context
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Provider Props
interface AppStateProviderProps {
  children: ReactNode;
}

// Provider Component
export function AppStateProvider({ children }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const { authState, user } = useAuth();

  console.log('[🎯 AppState] Provider rendering with state:', {
    selectedLoraId: state.selectedLoraId,
    modelCount: state.availableLoRAs.length,
    loading: state.loading,
    error: state.error,
  });

  // Initialize on mount and when user changes
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED && user) {
      console.log('[🎯 AppState] User authenticated, initializing app state');
      initializeAppState();
    }
  }, [authState, user]);

  // Initialize app state
  const initializeAppState = async () => {
    try {
      // Load selected model from storage
      await loadSelectedModelFromStorage();
      
      // Load cached models first for immediate UI
      await loadCachedModels();
      
      // Then refresh from API
      await loadAvailableLoRAs();
      
    } catch (error) {
      console.error('[🎯 AppState] Failed to initialize:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize app state' });
    }
  };

  // Load selected model from storage
  const loadSelectedModelFromStorage = async () => {
    try {
      const storedModelId = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      if (storedModelId) {
        dispatch({ type: 'SET_SELECTED_LORA', payload: storedModelId });
        console.log('[🎯 AppState] Loaded selected model from storage:', storedModelId);
      }
    } catch (error) {
      console.error('[🎯 AppState] Failed to load selected model from storage:', error);
    }
  };

  // Load cached models from storage
  const loadCachedModels = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(MODELS_CACHE_KEY);
      if (cachedData) {
        const { models, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          const parsedModels = models.map((model: any) => ({
            ...model,
            createdAt: new Date(model.createdAt),
            updatedAt: new Date(model.updatedAt),
          }));
          
          dispatch({ type: 'SET_AVAILABLE_LORAS', payload: parsedModels });
          dispatch({ type: 'SET_MODELS_LOADED', payload: timestamp });
          console.log('[🎯 AppState] Loaded', parsedModels.length, 'models from cache');
        }
      }
    } catch (error) {
      console.error('[🎯 AppState] Failed to load cached models:', error);
    }
  };

  // Save models to cache
  const saveCachedModels = async (models: LoRAModel[]) => {
    try {
      const cacheData = {
        models: models.map(model => ({
          ...model,
          createdAt: model.createdAt.toISOString(),
          updatedAt: model.updatedAt.toISOString(),
        })),
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(cacheData));
      dispatch({ type: 'SET_MODELS_LOADED', payload: Date.now() });
    } catch (error) {
      console.error('[🎯 AppState] Failed to save cached models:', error);
    }
  };

  // Select LoRA and handle navigation reset
  const selectLoRA = async (loraId: string | null) => {
    console.log('[🎯 AppState] Selecting LoRA:', loraId);
    
    const isChangingLoRA = state.selectedLoraId !== loraId;
    
    // Update selected LoRA in state
    dispatch({ type: 'SET_SELECTED_LORA', payload: loraId });
    
    // Save to storage
    try {
      if (loraId) {
        await AsyncStorage.setItem(SELECTED_MODEL_KEY, loraId);
      } else {
        await AsyncStorage.removeItem(SELECTED_MODEL_KEY);
      }
    } catch (error) {
      console.error('[🎯 AppState] Failed to save selected model:', error);
    }
    
    // Preload selected model's thumbnail as critical
    if (loraId && isChangingLoRA) {
      const selectedModel = state.availableLoRAs.find(model => model.id === loraId);
      if (selectedModel?.thumbnail_url) {
        console.log('[🎯 AppState] 🚨 Preloading selected model thumbnail as CRITICAL');
        ImageCacheManager.prefetchCritical([selectedModel.thumbnail_url]);
      }
    }
    
    // Trigger navigation reset only if LoRA actually changed
    if (isChangingLoRA) {
      console.log('[🎯 AppState] LoRA changed, resetting navigation');
      dispatch({ type: 'RESET_NAVIGATION' });
    }
  };

  // Load available LoRAs from API
  const loadAvailableLoRAs = async () => {
    console.log('[🎯 AppState] Loading LoRAs from API');
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const response = await APIService.fetchUserModels();
      
      const models: LoRAModel[] = response.models.map(backendModel => {
        const createdAt = new Date(backendModel.created_at);
        const updatedAt = new Date(backendModel.updated_at);
        
        return {
          id: backendModel.higgsfield_id || backendModel.id, // Use higgsfield_id for generation
          userId: backendModel.user_id,
          name: backendModel.name,
          status: backendModel.status as any,
          higgsfield_id: backendModel.higgsfield_id,
          thumbnail_url: backendModel.thumbnail_url,
          photoCount: backendModel.photo_count,
          createdAt,
          updatedAt,
        };
      });
      
      // Sort by creation date (newest first)
      models.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      dispatch({ type: 'SET_AVAILABLE_LORAS', payload: models });
      
      // Cache the models
      await saveCachedModels(models);
      
      console.log('[🎯 AppState] Loaded', models.length, 'models from API');
      
      // Auto-select if we have exactly one LoRA and none selected
      if (models.length === 1 && !state.selectedLoraId) {
        await selectLoRA(models[0].id);
        console.log('[🎯 AppState] Auto-selected single LoRA:', models[0].id);
      }
      
      // Start preloading thumbnails
      preloadModelThumbnails(models);
      
    } catch (error) {
      console.error('[🎯 AppState] Failed to load LoRAs:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load models' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Preload model thumbnails for better performance
  const preloadModelThumbnails = async (models: LoRAModel[]) => {
    console.log('[🎯 AppState] Starting thumbnail preload for', models.length, 'models');
    
    try {
      // Collect thumbnail URLs
      const thumbnailUrls: string[] = [];
      const criticalUrls: string[] = [];
      
      for (const model of models) {
        if (model.thumbnail_url) {
          thumbnailUrls.push(model.thumbnail_url);
          
          // Mark selected model's thumbnail as critical
          if (model.id === state.selectedLoraId) {
            criticalUrls.push(model.thumbnail_url);
          }
          
          dispatch({ type: 'ADD_PRELOADED_THUMBNAIL', payload: model.thumbnail_url });
        }
      }
      
      // Preload critical images first (selected model)
      if (criticalUrls.length > 0) {
        await ImageCacheManager.prefetchCritical(criticalUrls);
      }
      
      // Then preload the rest with high priority
      const remainingUrls = thumbnailUrls.filter(url => !criticalUrls.includes(url));
      if (remainingUrls.length > 0) {
        await ImageCacheManager.preloadImages(remainingUrls, CachePriority.HIGH);
      }
      
      console.log('[🎯 AppState] ✅ Thumbnail preloading initiated for', thumbnailUrls.length, 'images');
      
    } catch (error) {
      console.error('[🎯 AppState] ❌ Failed to preload thumbnails:', error);
    }
  };

  // Reset navigation state
  const resetNavigationState = () => {
    console.log('[🎯 AppState] Manually resetting navigation state');
    dispatch({ type: 'RESET_NAVIGATION' });
  };

  // Handle new LoRA trained
  const handleNewLoRATrained = async (loraId: string) => {
    console.log('[🎯 AppState] New LoRA trained:', loraId);
    
    // Refresh models from API
    await loadAvailableLoRAs();
    
    // Select the new LoRA
    await selectLoRA(loraId);
  };

  // Refresh models (public method)
  const refreshModels = async () => {
    await loadAvailableLoRAs();
  };

  // Update a model
  const updateModel = (id: string, updates: Partial<LoRAModel>) => {
    dispatch({ type: 'UPDATE_MODEL', payload: { id, updates } });
  };

  // Delete a model
  const deleteModel = async (id: string) => {
    try {
      await APIService.deleteModel(id);
      dispatch({ type: 'DELETE_MODEL', payload: id });
      console.log('[🎯 AppState] Model deleted:', id);
    } catch (error) {
      console.error('[🎯 AppState] Failed to delete model:', error);
      throw error;
    }
  };

  // Helper methods
  const getModelById = (id: string): LoRAModel | undefined => {
    return state.availableLoRAs.find(model => model.id === id);
  };

  const getSelectedModel = (): LoRAModel | undefined => {
    return state.selectedLoraId ? getModelById(state.selectedLoraId) : undefined;
  };

  const getThumbnailForModel = async (modelId: string): Promise<string | null> => {
    const model = getModelById(modelId);
    if (model?.thumbnail_url) {
      return model.thumbnail_url;
    }
    
    // Fallback: try to get first training image (this would require API enhancement)
    // For now, return null
    return null;
  };

  // Context value
  const contextValue: AppStateContextType = {
    // State
    selectedLoraId: state.selectedLoraId,
    availableLoRAs: state.availableLoRAs,
    navigationResetTrigger: state.navigationResetTrigger,
    loading: state.loading,
    error: state.error,
    
    // Actions
    selectLoRA,
    loadAvailableLoRAs,
    resetNavigationState,
    handleNewLoRATrained,
    refreshModels,
    updateModel,
    deleteModel,
    
    // Helper methods
    getModelById,
    getSelectedModel,
    getThumbnailForModel,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook
export function useAppState(): AppStateContextType {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export default AppStateContext;