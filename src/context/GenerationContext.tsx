import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { APIService } from '../services/APIService';
import { Preset } from '../types/preset.types';
import NotificationService from '../services/NotificationService';

interface SkeletonGeneration {
  id: string;
  preset: Preset;
  characterId: string;
  timestamp: Date;
  isGenerating: true;
  failed?: boolean;
  errorMessage?: string;
}

interface GenerationState {
  skeletonGenerations: SkeletonGeneration[];
  loading: boolean;
  error: string | null;
}

type GenerationAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_SKELETON_GENERATION'; payload: SkeletonGeneration }
  | { type: 'REMOVE_SKELETON_GENERATION'; payload: string }
  | { type: 'MARK_GENERATION_FAILED'; payload: { id: string; errorMessage: string } }
  | { type: 'CLEAR_ERROR' };

const generationReducer = (state: GenerationState, action: GenerationAction): GenerationState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'ADD_SKELETON_GENERATION':
      return { 
        ...state, 
        skeletonGenerations: [...state.skeletonGenerations, action.payload] 
      };
    case 'REMOVE_SKELETON_GENERATION':
      return { 
        ...state, 
        skeletonGenerations: state.skeletonGenerations.filter(g => g.id !== action.payload) 
      };
    case 'MARK_GENERATION_FAILED':
      return {
        ...state,
        skeletonGenerations: state.skeletonGenerations.map(g => 
          g.id === action.payload.id 
            ? { ...g, failed: true, errorMessage: action.payload.errorMessage }
            : g
        )
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

interface GenerationContextType {
  skeletonGenerations: SkeletonGeneration[];
  loading: boolean;
  error: string | null;
  startGeneration: (preset: Preset, characterId: string, models: any[]) => Promise<void>;
  retryGeneration: (failedGenerationId: string) => Promise<void>;
  clearError: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

interface GenerationProviderProps {
  children: ReactNode;
}

export function GenerationProvider({ children }: GenerationProviderProps) {
  const [state, dispatch] = useReducer(generationReducer, {
    skeletonGenerations: [],
    loading: false,
    error: null,
  });

  // Listen for generation completion and failure notifications
  useEffect(() => {
    const handleRemoveSkeletonGeneration = (data: any) => {
      console.log('[GenerationContext] 🎉 Removing skeleton generation:', data.generationId);
      
      // Find and remove skeleton generation that matches this completion
      state.skeletonGenerations.forEach(skeleton => {
        // Match by generation ID or partial ID
        if (skeleton.id.includes(data.generationId) || data.generationId.includes(skeleton.id)) {
          dispatch({ type: 'REMOVE_SKELETON_GENERATION', payload: skeleton.id });
        }
      });
    };

    const handleGenerationFailure = (data: any) => {
      console.log('[GenerationContext] ❌ Generation failed:', data.generationId);
      
      // Find and mark skeleton generation as failed
      state.skeletonGenerations.forEach(skeleton => {
        // Match by generation ID or partial ID
        if (skeleton.id.includes(data.generationId) || data.generationId.includes(skeleton.id)) {
          dispatch({ 
            type: 'MARK_GENERATION_FAILED', 
            payload: { 
              id: skeleton.id, 
              errorMessage: 'Generation failed. Please try again.' 
            }
          });
        }
      });
    };

    // Subscribe to notification events
    const successSubscription = NotificationService.on('removeSkeletonGeneration', handleRemoveSkeletonGeneration);
    const failureSubscription = NotificationService.on('generationFailed', handleGenerationFailure);

    // Cleanup listeners on unmount
    return () => {
      successSubscription.remove();
      failureSubscription.remove();
    };
  }, [state.skeletonGenerations]);

  const startGeneration = async (preset: Preset, characterId: string, models: any[]): Promise<void> => {
    const skeletonId = `generation_${Date.now()}`;
    
    try {
      // Validate character is provided
      if (!characterId || characterId.trim() === '') {
        throw new Error('Please select a trained character to generate images');
      }

      // Find the model by characterId and get its higgsfield_id
      const selectedModel = models.find(model => model.id === characterId);
      if (!selectedModel) {
        throw new Error('Selected character model not found');
      }

      if (!selectedModel.higgsfield_id) {
        throw new Error('Selected character is not ready for generation yet');
      }

      console.log('[🎯 GenerationContext] Starting generation with preset:', preset.name, 'Character ID:', characterId, 'Higgsfield ID:', selectedModel.higgsfield_id);

      // Add skeleton generation immediately
      const skeletonGeneration: SkeletonGeneration = {
        id: skeletonId,
        preset,
        characterId,
        timestamp: new Date(),
        isGenerating: true,
      };
      dispatch({ type: 'ADD_SKELETON_GENERATION', payload: skeletonGeneration });

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log('[🎯 GenerationContext] 📡 Making API call to /generate with:', {
        preset: preset.name,
        style_id: preset.style_id,
        higgsfield_id: selectedModel.higgsfield_id,
        quality: 'high',
        aspect_ratio: '3:4'
      });

      // Start async generation using 302.AI API
      const response = await APIService.generateImages({
        prompt: preset.prompt,
        style_id: preset.style_id,
        higgsfield_id: selectedModel.higgsfield_id,
        quality: 'high',
        aspect_ratio: '3:4',
      });

      console.log('[🎯 GenerationContext] ✅ Generation started with ID:', response.generation_id);
      console.log('[🎯 GenerationContext] 📱 Backend will handle polling. User will receive notification when ready.');

      // Show success alert to user
      Alert.alert(
        'Generation Started! 🎨',
        `Your images with "${preset.name}" are being generated. You'll receive a notification when they're ready!`,
        [{ text: 'OK' }]
      );

      // Backend handles all polling - no frontend polling needed!
      
    } catch (error: any) {
      console.error('[❌ GenerationContext] Generation failed:', error);
      
      const errorMessage = error.message || 'Generation failed. Please try again.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'REMOVE_SKELETON_GENERATION', payload: skeletonId });
      
      // Show error alert to user
      Alert.alert(
        'Generation Failed ❌',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const retryGeneration = async (failedGenerationId: string): Promise<void> => {
    // Find the failed generation
    const failedGeneration = state.skeletonGenerations.find(g => g.id === failedGenerationId);
    if (!failedGeneration) {
      console.error('[GenerationContext] Failed generation not found:', failedGenerationId);
      return;
    }

    console.log('[GenerationContext] Retrying generation:', failedGenerationId);
    
    // Create retry ID outside try block so it's accessible in catch
    const retryId = `retry_${Date.now()}`;
    
    try {
      // Remove the failed generation
      dispatch({ type: 'REMOVE_SKELETON_GENERATION', payload: failedGenerationId });
      
      // Create a new skeleton generation for the retry
      const retryGeneration: SkeletonGeneration = {
        id: retryId,
        preset: failedGeneration.preset,
        characterId: failedGeneration.characterId,
        timestamp: new Date(),
        isGenerating: true,
      };
      dispatch({ type: 'ADD_SKELETON_GENERATION', payload: retryGeneration });
      
      console.log('[GenerationContext] 📡 Retrying API call for generation');
      
      // We need to get the models to find the higgsfield_id
      // For now, we'll make a direct API call with the stored characterId
      // This assumes the characterId is actually the model ID we need
      const response = await APIService.generateImages({
        prompt: failedGeneration.preset.prompt,
        style_id: failedGeneration.preset.style_id,
        higgsfield_id: failedGeneration.characterId, // Using characterId as higgsfield_id for retry
        quality: 'high',
        aspect_ratio: '3:4',
      });

      console.log('[GenerationContext] ✅ Retry generation started with ID:', response.generation_id);
      
      // Show success alert
      Alert.alert(
        'Retry Started! 🔄',
        `Your images with "${failedGeneration.preset.name}" are being generated again. You'll receive a notification when ready!`,
        [{ text: 'OK' }]
      );
      
    } catch (error: any) {
      console.error('[GenerationContext] Retry failed:', error);
      
      // Remove the retry skeleton and show error
      dispatch({ type: 'REMOVE_SKELETON_GENERATION', payload: retryId });
      
      Alert.alert(
        'Retry Failed ❌',
        'Unable to retry generation. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: GenerationContextType = {
    skeletonGenerations: state.skeletonGenerations,
    loading: state.loading,
    error: state.error,
    startGeneration,
    retryGeneration,
    clearError,
  };

  return (
    <GenerationContext.Provider value={contextValue}>
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration(): GenerationContextType {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}

export default GenerationContext;