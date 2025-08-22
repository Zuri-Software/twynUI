import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { APIService } from '../services/APIService';
import * as ImagePicker from 'expo-image-picker';
import NotificationService from '../services/NotificationService';
import { useAuth } from './AuthContext';
import { AuthState } from '../types/auth.types';

interface Model {
  id: string;
  name: string;
  thumbnail_url: string | null;
  higgsfield_id: string | null;
  created_at: string;
  status: 'training' | 'completed' | 'failed';
}

// Extended interface for UI components
export interface TrainedModel extends Model {
  thumbnailURL: string | null;
  trainingImageCount: number;
  photoCount: number;
}

interface SkeletonModel {
  id: string;
  name: string;
  isTraining: true;
  created_at: string;
}

interface TrainingState {
  models: Model[];
  skeletonModels: SkeletonModel[];
  loading: boolean;
  error: string | null;
}

type TrainingAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MODELS'; payload: Model[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_SKELETON_MODEL'; payload: SkeletonModel }
  | { type: 'REMOVE_SKELETON_MODEL'; payload: string }
  | { type: 'ADD_COMPLETED_MODEL'; payload: Model }
  | { type: 'DELETE_MODEL'; payload: string }
  | { type: 'RENAME_MODEL'; payload: { id: string; name: string } };

const trainingReducer = (state: TrainingState, action: TrainingAction): TrainingState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MODELS':
      return { ...state, models: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_SKELETON_MODEL':
      return { 
        ...state, 
        skeletonModels: [...state.skeletonModels, action.payload] 
      };
    case 'REMOVE_SKELETON_MODEL':
      return { 
        ...state, 
        skeletonModels: state.skeletonModels.filter(m => m.id !== action.payload) 
      };
    case 'ADD_COMPLETED_MODEL':
      return { 
        ...state, 
        models: [...state.models, action.payload],
        skeletonModels: state.skeletonModels.filter(m => m.id !== action.payload.id)
      };
    case 'DELETE_MODEL':
      return { 
        ...state, 
        models: state.models.filter(m => m.id !== action.payload) 
      };
    case 'RENAME_MODEL':
      return { 
        ...state, 
        models: state.models.map(m => 
          m.id === action.payload.id ? { ...m, name: action.payload.name } : m
        ) 
      };
    default:
      return state;
  }
};

interface TrainingContextType {
  models: Model[];
  skeletonModels: SkeletonModel[];
  loading: boolean;
  error: string | null;
  refreshModels: () => Promise<void>;
  startTraining: (name: string, photos: any[]) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  renameModel: (id: string, name: string) => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const [state, dispatch] = useReducer(trainingReducer, {
    models: [],
    skeletonModels: [],
    loading: false,
    error: null,
  });

  // Load models only when authenticated
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED) {
      console.log('[TrainingContext] User authenticated, loading models');
      refreshModels();
    } else {
      console.log('[TrainingContext] User not authenticated, skipping model load');
    }
  }, [authState]);

  // Listen for training completion notifications
  useEffect(() => {
    const handleTrainingCompleted = (data: any) => {
      console.log('[TrainingContext] Training completed notification received:', data);
      dispatch({ type: 'REMOVE_SKELETON_MODEL', payload: data.modelId });
      refreshModels(); // Refresh to get completed model
    };
    
    const subscription = NotificationService.on('trainingCompleted', handleTrainingCompleted);
    return () => subscription.remove();
  }, []);

  // Fallback polling when skeleton models exist (since push notifications might not work)
  useEffect(() => {
    if (state.skeletonModels.length === 0) return;

    console.log('[TrainingContext] Skeleton models detected, starting fallback polling');
    let pollCount = 0;
    const maxPolls = 120; // 60 minutes max (30s * 120 = 3600s)
    
    const interval = setInterval(() => {
      pollCount++;
      console.log(`[TrainingContext] Fallback poll ${pollCount}/${maxPolls} - refreshing models`);
      
      if (pollCount >= maxPolls) {
        console.log('[TrainingContext] Fallback polling timeout reached, stopping');
        clearInterval(interval);
        // Optionally remove skeleton models that timed out
        state.skeletonModels.forEach(skeleton => {
          dispatch({ type: 'REMOVE_SKELETON_MODEL', payload: skeleton.id });
        });
        return;
      }
      
      refreshModels();
    }, 30000); // Check every 30 seconds

    return () => {
      console.log('[TrainingContext] Stopping fallback polling');
      clearInterval(interval);
    };
  }, [state.skeletonModels.length]);

  const refreshModels = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await APIService.fetchUserModels();
      
      // Transform API response to match Model interface
      const models: Model[] = response.models.map(apiModel => ({
        id: apiModel.id,
        name: apiModel.name,
        thumbnail_url: apiModel.thumbnail_url || null, // Convert undefined to null
        higgsfield_id: apiModel.higgsfield_id || null, // Convert undefined to null
        created_at: apiModel.created_at,
        status: apiModel.status as 'training' | 'completed' | 'failed', // Type assertion for status
      }));
      
      // Check for completed training - remove skeleton models when real models are found
      if (state.skeletonModels.length > 0) {
        console.log(`[TrainingContext] Checking ${state.skeletonModels.length} skeleton models against ${models.length} real models`);
        
        // For each skeleton model, check if we now have a real model with the same name
        const skeletonsToRemove: string[] = [];
        
        state.skeletonModels.forEach(skeleton => {
          console.log(`[TrainingContext] Checking skeleton: ${skeleton.name} (created: ${skeleton.created_at})`);
          
          // Find any model (completed, failed, or even training) with the same name
          const matchingModel = models.find(model => {
            const nameMatch = model.name === skeleton.name;
            
            // Check if the model was created around the same time (within 2 hours to be safe)
            const skeletonTime = new Date(skeleton.created_at).getTime();
            const modelTime = new Date(model.created_at).getTime();
            const timeDiff = Math.abs(modelTime - skeletonTime);
            const twoHours = 2 * 60 * 60 * 1000;
            const timeMatch = timeDiff < twoHours;
            
            console.log(`[TrainingContext] Comparing with model: ${model.name} (status: ${model.status}, created: ${model.created_at})`);
            console.log(`[TrainingContext] Name match: ${nameMatch}, Time diff: ${Math.round(timeDiff/1000/60)} minutes, Time match: ${timeMatch}`);
            
            return nameMatch && timeMatch;
          });
          
          if (matchingModel) {
            console.log(`[TrainingContext] ✅ Found matching model for skeleton "${skeleton.name}" -> removing skeleton`);
            skeletonsToRemove.push(skeleton.id);
          } else {
            console.log(`[TrainingContext] ⏳ No matching model found for skeleton "${skeleton.name}" - keeping skeleton`);
          }
        });
        
        // Remove all matched skeletons
        skeletonsToRemove.forEach(skeletonId => {
          dispatch({ type: 'REMOVE_SKELETON_MODEL', payload: skeletonId });
        });
        
        if (skeletonsToRemove.length > 0) {
          console.log(`[TrainingContext] Removed ${skeletonsToRemove.length} skeleton models`);
        }
      }
      
      dispatch({ type: 'SET_MODELS', payload: models });
    } catch (error) {
      console.error('Failed to load models:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load models' });
    }
  };

  const startTraining = async (name: string, photos: any[]) => {
    const skeletonId = `training_${Date.now()}`;
    
    console.log(`[TrainingContext] 🚀 Starting training for "${name}" with skeleton ID: ${skeletonId}`);
    console.log(`[TrainingContext] Current skeleton models before adding: ${state.skeletonModels.length}`);
    
    // Check if we already have a skeleton model with this name
    const existingSkeleton = state.skeletonModels.find(skeleton => skeleton.name === name);
    if (existingSkeleton) {
      console.log(`[TrainingContext] ⚠️ Skeleton model with name "${name}" already exists, not adding duplicate`);
      throw new Error(`A model with the name "${name}" is already being trained`);
    }
    
    try {
      // Step 1: Add skeleton model immediately
      const skeletonModel: SkeletonModel = {
        id: skeletonId,
        name,
        isTraining: true,
        created_at: new Date().toISOString(),
      };
      console.log(`[TrainingContext] Adding skeleton model:`, skeletonModel);
      dispatch({ type: 'ADD_SKELETON_MODEL', payload: skeletonModel });

      // Step 2: Convert images to FormData and upload
      const formData = new FormData();
      formData.append('modelName', name);
      
      photos.forEach((asset, index) => {
        formData.append('images', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        } as any);
      });

      // Step 3: Send to backend (creates temp S3 folder + Supabase row)
      await APIService.startModelTraining(formData);
      console.log('[TrainingContext] Training started successfully');
      
    } catch (error: any) {
      console.error('[TrainingContext] Failed to start training:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      dispatch({ type: 'REMOVE_SKELETON_MODEL', payload: skeletonId });
    }
  };

  const deleteModel = async (id: string) => {
    try {
      console.log('[TrainingContext] 🗑️ Starting delete for model:', id);
      
      // Call backend API to delete model (includes S3 cleanup and database deletion)
      await APIService.deleteModel(id);
      
      console.log('[TrainingContext] ✅ Model deleted from backend, updating local state');
      
      // Remove from local state only after successful backend deletion
      dispatch({ type: 'DELETE_MODEL', payload: id });
      
    } catch (error: any) {
      console.error('[TrainingContext] ❌ Failed to delete model:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to delete model';
      if (error.message?.includes('404')) {
        errorMessage = 'Model not found or already deleted';
      } else if (error.message?.includes('403')) {
        errorMessage = 'You do not have permission to delete this model';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const renameModel = async (id: string, name: string) => {
    try {
      // TODO: Implement rename API call once backend endpoint is ready
      // await APIService.renameModel(id, name);
      console.log('Renaming model:', id, 'to:', name);
      dispatch({ type: 'RENAME_MODEL', payload: { id, name } });
    } catch (error) {
      console.error('Failed to rename model:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to rename model' });
    }
  };

  const value: TrainingContextType = {
    models: state.models,
    skeletonModels: state.skeletonModels,
    loading: state.loading,
    error: state.error,
    refreshModels,
    startTraining,
    deleteModel,
    renameModel,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error('useTraining must be used within TrainingProvider');
  }
  return context;
};