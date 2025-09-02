import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface CameraCapture {
  id: string;
  capturedImage: string;
  captureId?: string; // Backend capture ID for generation
  generatedPrompt?: string;
  generationId?: string;
  metadata?: any;
  createdAt: Date;
}

export interface CameraState {
  // Current capture session
  currentCapture: CameraCapture | null;
  isCapturing: boolean;
  isAnalyzing: boolean;
  isGenerating: boolean;
  
  // History
  captureHistory: CameraCapture[];
  
  // Error handling
  error: string | null;
  
  // Selected options for generation
  selectedModelId?: string;
  selectedStyleId?: string;
  generationOptions: {
    quality: 'basic' | 'premium';
    aspectRatio: '1:1' | '16:9' | '9:16';
  };
}

export interface CameraContextType {
  state: CameraState;
  
  // Actions
  startCapture: () => void;
  captureImage: (imageUri: string) => void;
  analyzeImage: (imageUri: string) => Promise<{ captureId: string; prompt: string; metadata?: any }>;
  startGeneration: (modelId: string, styleId?: string) => Promise<void>;
  startGenerationWithCaptureId: (modelId: string, captureId: string, styleId?: string) => Promise<void>;
  setGenerationOptions: (options: Partial<CameraState['generationOptions']>) => void;
  setSelectedModel: (modelId: string) => void;
  clearCapture: () => void;
  clearError: () => void;
  loadCaptureHistory: () => Promise<void>;
}

// Action types
type CameraAction =
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_IMAGE'; payload: { imageUri: string } }
  | { type: 'START_ANALYZING' }
  | { type: 'ANALYZE_SUCCESS'; payload: { prompt: string; captureId: string; metadata?: any } }
  | { type: 'ANALYZE_ERROR'; payload: { error: string } }
  | { type: 'START_GENERATING' }
  | { type: 'GENERATE_SUCCESS'; payload: { generationId: string } }
  | { type: 'GENERATE_ERROR'; payload: { error: string } }
  | { type: 'SET_GENERATION_OPTIONS'; payload: Partial<CameraState['generationOptions']> }
  | { type: 'SET_SELECTED_MODEL'; payload: { modelId: string } }
  | { type: 'CLEAR_CAPTURE' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOAD_HISTORY_SUCCESS'; payload: { history: CameraCapture[] } }
  | { type: 'LOAD_HISTORY_ERROR'; payload: { error: string } };

// Initial state
const initialState: CameraState = {
  currentCapture: null,
  isCapturing: false,
  isAnalyzing: false,
  isGenerating: false,
  captureHistory: [],
  error: null,
  generationOptions: {
    quality: 'basic',
    aspectRatio: '1:1',
  },
};

// Reducer
function cameraReducer(state: CameraState, action: CameraAction): CameraState {
  console.log('[CameraReducer] 🎬 Action dispatched:', action.type, action);
  
  switch (action.type) {
    case 'START_CAPTURE':
      return {
        ...state,
        isCapturing: true,
        error: null,
        currentCapture: null,
      };

    case 'CAPTURE_IMAGE':
      return {
        ...state,
        isCapturing: false,
        currentCapture: {
          id: `capture_${Date.now()}`,
          capturedImage: action.payload.imageUri,
          createdAt: new Date(),
        },
      };

    case 'START_ANALYZING':
      return {
        ...state,
        isAnalyzing: true,
        error: null,
      };

    case 'ANALYZE_SUCCESS':
      console.log('[CameraReducer] 🎯 ANALYZE_SUCCESS action received:', {
        payload: action.payload,
        currentState: state.currentCapture,
      });
      
      const newCapture = state.currentCapture ? {
        ...state.currentCapture,
        captureId: action.payload.captureId,
        generatedPrompt: action.payload.prompt,
        metadata: action.payload.metadata,
      } : {
        // Create capture object if none exists (fallback)
        id: `capture_${Date.now()}`,
        capturedImage: '', // Image already uploaded to backend
        captureId: action.payload.captureId,
        generatedPrompt: action.payload.prompt,
        metadata: action.payload.metadata,
        createdAt: new Date(),
      };
      
      console.log('[CameraReducer] 📝 Creating new capture:', newCapture);
      
      return {
        ...state,
        isAnalyzing: false,
        currentCapture: newCapture,
      };

    case 'ANALYZE_ERROR':
      return {
        ...state,
        isAnalyzing: false,
        error: action.payload.error,
      };

    case 'START_GENERATING':
      return {
        ...state,
        isGenerating: true,
        error: null,
      };

    case 'GENERATE_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        currentCapture: state.currentCapture ? {
          ...state.currentCapture,
          generationId: action.payload.generationId,
        } : null,
      };

    case 'GENERATE_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.payload.error,
      };

    case 'SET_GENERATION_OPTIONS':
      return {
        ...state,
        generationOptions: {
          ...state.generationOptions,
          ...action.payload,
        },
      };

    case 'SET_SELECTED_MODEL':
      return {
        ...state,
        selectedModelId: action.payload.modelId,
      };

    case 'CLEAR_CAPTURE':
      return {
        ...state,
        currentCapture: null,
        isCapturing: false,
        isAnalyzing: false,
        isGenerating: false,
        error: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'LOAD_HISTORY_SUCCESS':
      return {
        ...state,
        captureHistory: action.payload.history,
      };

    case 'LOAD_HISTORY_ERROR':
      return {
        ...state,
        error: action.payload.error,
      };

    default:
      return state;
  }
}

// Context
const CameraContext = createContext<CameraContextType | undefined>(undefined);

// Provider component
interface CameraProviderProps {
  children: ReactNode;
}

export function CameraProvider({ children }: CameraProviderProps) {
  console.log('[CameraProvider] 🏗️ CameraProvider component created/recreated');
  const [state, dispatch] = useReducer(cameraReducer, initialState);
  
  // Log state changes
  console.log('[CameraProvider] 📊 Current state:', {
    currentCapture: state.currentCapture ? 'exists' : 'null',
    captureId: state.currentCapture?.captureId || 'none',
    isAnalyzing: state.isAnalyzing,
    isGenerating: state.isGenerating
  });

  // Actions
  const startCapture = () => {
    dispatch({ type: 'START_CAPTURE' });
  };

  const captureImage = (imageUri: string) => {
    console.log('[CameraContext] 📸 Image captured:', imageUri);
    dispatch({ type: 'CAPTURE_IMAGE', payload: { imageUri } });
  };

  const analyzeImage = async (imageUri: string): Promise<{ captureId: string; prompt: string; metadata?: any }> => {
    try {
      console.log('[CameraContext] 🔍 Starting image analysis...');
      dispatch({ type: 'START_ANALYZING' });

      // Import APIService dynamically to avoid circular imports
      const { default: APIService } = await import('../services/APIService');
      
      // Create FormData for the image
      const formData = new FormData();
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'capture.jpg',
      } as any);
      formData.append('generateImmediately', 'false'); // Just analyze, don't generate yet

      const response = await APIService.captureAndGenerate(formData);
      
      console.log('[CameraContext] 📥 Raw API response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('[CameraContext] ✅ Analysis successful:', response.data?.prompt);
        console.log('[CameraContext] 📋 Full response data:', JSON.stringify(response.data, null, 2));
        console.log('[CameraContext] 🔑 CaptureId received:', response.data?.captureId);
        
        const analysisData = {
          captureId: response.data?.captureId || '',
          prompt: response.data?.prompt || '',
          metadata: response.data?.metadata,
        };
        
        dispatch({
          type: 'ANALYZE_SUCCESS',
          payload: analysisData,
        });
        
        // Return the analysis data directly
        return analysisData;
      } else {
        throw new Error(response.error || 'Failed to analyze image');
      }
    } catch (error) {
      console.error('[CameraContext] ❌ Analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      dispatch({ type: 'ANALYZE_ERROR', payload: { error: errorMessage } });
      throw error;
    }
  };

  const startGeneration = async (modelId: string, styleId?: string) => {
    try {
      console.log('[CameraContext] 🚀 startGeneration called with modelId:', modelId);
      console.log('[CameraContext] 🔍 Full state at generation time:', JSON.stringify(state, null, 2));
      console.log('[CameraContext] 🔍 Generation check - currentCapture:', state.currentCapture);
      console.log('[CameraContext] 🔍 Generation check - captureId:', state.currentCapture?.captureId);
      
      if (!state.currentCapture?.captureId) {
        console.error('[CameraContext] ❌ Missing captureId for generation:', {
          currentCapture: state.currentCapture,
          captureId: state.currentCapture?.captureId,
        });
        throw new Error('No capture available for generation');
      }
      
      if (!state.currentCapture?.generatedPrompt) {
        throw new Error('Image not analyzed yet');
      }

      console.log('[CameraContext] 🚀 Starting generation...', { 
        modelId, 
        styleId, 
        captureId: state.currentCapture.captureId 
      });
      dispatch({ type: 'START_GENERATING' });

      // Import APIService dynamically
      const { default: APIService } = await import('../services/APIService');
      
      // Create FormData to trigger generation on existing capture
      const formData = new FormData();
      formData.append('captureId', state.currentCapture.captureId);
      formData.append('modelId', modelId);
      if (styleId) formData.append('styleId', styleId);
      formData.append('quality', state.generationOptions.quality);
      formData.append('aspectRatio', state.generationOptions.aspectRatio);
      formData.append('generateImmediately', 'true');

      const response = await APIService.captureAndGenerate(formData);
      
      if (response.success && response.data?.generationId) {
        console.log('[CameraContext] ✅ Generation started:', response.data.generationId);
        dispatch({
          type: 'GENERATE_SUCCESS',
          payload: { generationId: response.data.generationId },
        });
      } else {
        throw new Error(response.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('[CameraContext] ❌ Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start generation';
      dispatch({ type: 'GENERATE_ERROR', payload: { error: errorMessage } });
      throw error;
    }
  };

  const startGenerationWithCaptureId = async (modelId: string, captureId: string, styleId?: string) => {
    try {
      console.log('[CameraContext] 🚀 startGenerationWithCaptureId called:', { modelId, captureId, styleId });
      
      console.log('[CameraContext] 🔍 Starting generation with provided captureId');
      dispatch({ type: 'START_GENERATING' });

      // Import APIService dynamically
      const { default: APIService } = await import('../services/APIService');
      
      // Create FormData to trigger generation on existing capture
      const formData = new FormData();
      formData.append('captureId', captureId);
      formData.append('modelId', modelId);
      if (styleId) formData.append('styleId', styleId);
      formData.append('quality', state.generationOptions.quality);
      formData.append('aspectRatio', state.generationOptions.aspectRatio);
      formData.append('generateImmediately', 'true');

      const response = await APIService.captureAndGenerate(formData);
      
      if (response.success && response.data?.generationId) {
        console.log('[CameraContext] ✅ Generation started with captureId:', response.data.generationId);
        dispatch({
          type: 'GENERATE_SUCCESS',
          payload: { generationId: response.data.generationId },
        });
      } else {
        throw new Error(response.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('[CameraContext] ❌ Generation with captureId failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start generation';
      dispatch({ type: 'GENERATE_ERROR', payload: { error: errorMessage } });
      throw error;
    }
  };

  const setGenerationOptions = (options: Partial<CameraState['generationOptions']>) => {
    dispatch({ type: 'SET_GENERATION_OPTIONS', payload: options });
  };

  const setSelectedModel = (modelId: string) => {
    dispatch({ type: 'SET_SELECTED_MODEL', payload: { modelId } });
  };

  const clearCapture = () => {
    dispatch({ type: 'CLEAR_CAPTURE' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const loadCaptureHistory = async () => {
    try {
      // Import APIService dynamically
      const { default: APIService } = await import('../services/APIService');
      const response = await APIService.getCaptureHistory();
      
      if (response.success) {
        dispatch({
          type: 'LOAD_HISTORY_SUCCESS',
          payload: { history: response.data || [] },
        });
      } else {
        throw new Error(response.error || 'Failed to load capture history');
      }
    } catch (error) {
      console.error('[CameraContext] ❌ Failed to load history:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load capture history';
      dispatch({ type: 'LOAD_HISTORY_ERROR', payload: { error: errorMessage } });
    }
  };

  const contextValue: CameraContextType = {
    state,
    startCapture,
    captureImage,
    analyzeImage,
    startGeneration,
    startGenerationWithCaptureId,
    setGenerationOptions,
    setSelectedModel,
    clearCapture,
    clearError,
    loadCaptureHistory,
  };

  return (
    <CameraContext.Provider value={contextValue}>
      {children}
    </CameraContext.Provider>
  );
}

// Hook to use camera context
export function useCamera(): CameraContextType {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
}

export default CameraContext;