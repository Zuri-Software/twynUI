import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AuthService from './AuthService';
import { AuthErrorType } from '../types/auth.types';
import { Logger } from '../utils/Logger';

// API Configuration
export const API_CONFIG = {
  baseURL: 'https://twynbackend-production.up.railway.app/api',
  timeout: 30000, // 30 seconds default
  generationTimeout: 120000, // 2 minutes for generation requests
};

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: 'https://knpayppjljuoznrazink.supabase.co',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtucGF5cHBqbGp1b3pucmF6aW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODY2MTQsImV4cCI6MjA2ODk2MjYxNH0.qsnBHb4VVPyWEORStyIB5EZzxBYsJSnq9xOAeY_1j5U',
  presetsTable: 'presets',
};

class APIServiceClass {
  private axiosInstance: AxiosInstance;
  private generationInstance: AxiosInstance;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    // Main API instance
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Generation API instance with longer timeout
    this.generationInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.generationTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    const addAuthToken = async (config: any) => {
      const token = await AuthService.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };

    // Response interceptor for token refresh
    const handleResponse = (response: AxiosResponse) => response;
    
    const handleError = async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Prevent multiple simultaneous refresh attempts
        if (!this.refreshPromise) {
          this.refreshPromise = AuthService.refreshToken();
        }

        const refreshSuccess = await this.refreshPromise;
        this.refreshPromise = null;

        if (refreshSuccess) {
          // Retry original request with new token
          const token = await AuthService.getAccessToken();
          if (token && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.axiosInstance.request(originalRequest);
          }
        } else {
          // Refresh failed, logout user
          await AuthService.logout();
          throw error;
        }
      }

      return Promise.reject(error);
    };

    // Apply interceptors to both instances
    [this.axiosInstance, this.generationInstance].forEach(instance => {
      instance.interceptors.request.use(addAuthToken);
      instance.interceptors.response.use(handleResponse, handleError);
    });
  }

  // Generic HTTP methods
  public async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async patch<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Generation-specific methods (with longer timeout)
  public async generateImages(payload: {
    prompt: string;
    style_id: string;
    higgsfield_id?: string;
    quality?: string;
    aspect_ratio?: string;
  }): Promise<{ generation_id: string; status: string; message: string }> {
    try {
      console.log('[🎨 APIService] 🚀 Starting generation request to:', `${API_CONFIG.baseURL}/generate`);
      console.log('[🎨 APIService] 📤 Payload:', JSON.stringify(payload, null, 2));
      const startTime = Date.now();
      
      // Check if we have auth token
      const token = await AuthService.getAccessToken();
      console.log('[🎨 APIService] 🔐 Auth token present:', !!token);
      
      const response = await this.generationInstance.post('/generate', payload);
      
      const responseTime = Date.now() - startTime;
      console.log(`[🎨 APIService] ✅ Generation request completed in ${responseTime}ms`);
      console.log('[🎨 APIService] 🎨 Response:', JSON.stringify(response.data, null, 2));
      console.log('[🎨 APIService] 🔍 Response keys:', Object.keys(response.data || {}));
      console.log('[🎨 APIService] ✅ Generation started with ID:', response.data.generation_id);
      console.log('[🎨 APIService] 🔍 Actual ID field value:', response.data.id);
      
      // Backend might return 'generationId' instead of 'generation_id'
      const generationId = response.data.generation_id || response.data.generationId || response.data.id;
      
      return {
        generation_id: generationId,
        status: response.data.status || 'started',
        message: response.data.message || 'Generation started successfully'
      };
    } catch (error: any) {
      console.error('[🎨 APIService] ❌ Generation request failed!');
      console.error('[🎨 APIService] ❌ Error details:', error);
      if (error.response) {
        console.error('[🎨 APIService] ❌ Response status:', error.response.status);
        console.error('[🎨 APIService] ❌ Response data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('[🎨 APIService] ❌ No response received. Request:', error.request);
      } else {
        console.error('[🎨 APIService] ❌ Setup error:', error.message);
      }
      throw this.handleError(error);
    }
  }

  // Images API
  public async fetchAllImages(): Promise<{ images: string[]; count: number }> {
    try {
      const response = await this.get<{ images: string[]; count: number }>('/images');
      console.log(`[📸 APIService] Fetched ${response.count} images from backend`);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Fetch images grouped by generation batch
  public async fetchImageBatches(): Promise<{ 
    batches: Array<{
      id: string;
      images: string[];
      created_at: string;
      higgsfield_id: string;
    }>; 
    count: number 
  }> {
    try {
      const response = await this.get<{ 
        batches: Array<{
          id: string;
          images: string[];
          created_at: string;
          higgsfield_id: string;
        }>; 
        count: number 
      }>('/images/batches');
      console.log(`[📸 APIService] Fetched ${response.count} image batches from backend`);
      return response;
    } catch (error) {
      console.log('[📸 APIService] Batch endpoint not available, falling back to individual images');
      // Since we can't get proper batch info, just return all images as individual "batches"
      // This prevents the mixing issue until the proper batch endpoint is implemented
      const individualResponse = await this.fetchAllImages();
      
      // For now, create individual "batches" of 1 image each to avoid mixing
      // This is safer than guessing which images belong together
      const batches = individualResponse.images.map((image, index) => ({
        id: `single-${index}`,
        images: [image],
        created_at: new Date(Date.now() - (index * 1000)).toISOString(), // Stagger timestamps
        higgsfield_id: `single-${index}`,
      }));
      
      console.log(`[📸 APIService] Created ${batches.length} individual image "batches" to prevent mixing`);
      return { batches, count: batches.length };
    }
  }

  // User Models API
  public async fetchUserModels(): Promise<{
    models: Array<{
      id: string;
      user_id: string;
      name: string;
      status: string;
      higgsfield_id?: string;
      thumbnail_url?: string;
      photo_count: number;
      created_at: string;
      updated_at: string;
    }>;
    count: number;
    userId: string;
  }> {
    try {
      const response = await this.get<any>('/users/models');
      console.log(`[📱 APIService] Fetched ${response.models.length} models from backend`);
      
      // Debug: Log the first model to see what we received
      if (response.models.length > 0) {
        console.log('[📱 APIService] Sample model received:', JSON.stringify(response.models[0], null, 2));
      }
      
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Push Notifications
  public async registerDeviceToken(deviceToken: string, platform: 'ios' | 'android' | 'expo' = 'expo'): Promise<void> {
    try {
      Logger.apiLog.info('🚀 Starting device token registration', {
        tokenPreview: deviceToken.substring(0, 30) + '...',
        tokenLength: deviceToken.length,
        platform,
        endpoint: `${API_CONFIG.baseURL}/users/register-device`
      });
      
      const payload = {
        deviceToken,
        platform,
      };
      
      Logger.apiLog.debug('📤 Registration payload', payload);
      
      const startTime = Date.now();
      const response = await this.post('/users/register-device', payload);
      const duration = Date.now() - startTime;
      
      Logger.apiLog.info('✅ Device token registered successfully', { 
        response,
        duration: `${duration}ms`
      });
    } catch (error: any) {
      Logger.apiLog.error('❌ Failed to register device token', {
        error: error.message,
        response: error?.response?.data,
        status: error?.response?.status,
        endpoint: `${API_CONFIG.baseURL}/users/register-device`,
        tokenPreview: deviceToken.substring(0, 30) + '...'
      });
      throw this.handleError(error);
    }
  }

  public async hasDeviceToken(): Promise<boolean> {
    try {
      const response = await this.get('/users/device-token-status');
      console.log('[🔔 APIService] Raw response:', JSON.stringify(response, null, 2));
      const hasToken = response.hasDeviceToken || false;
      console.log('[🔔 APIService] Device token status:', hasToken);
      return hasToken;
    } catch (error) {
      console.error('[🔔 APIService] ❌ Failed to check device token status:', error);
      // Return false if we can't check, so the popup will show (better safe than sorry)
      return false;
    }
  }

  // Supabase Presets API (direct to Supabase, no auth required)
  public async fetchPresets(): Promise<Array<{
    id: string;
    style_id: string;
    name: string;
    image_url: string;
    prompt: string;
    category: string;
    sort_order: number;
    is_active: boolean;
  }>> {
    try {
      const url = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.presetsTable}?select=*&is_active=eq.true&order=sort_order`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_CONFIG.apiKey}`,
          'apikey': SUPABASE_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[📋 APIService] Fetched ${response.data.length} presets from Supabase`);
      return response.data;
    } catch (error) {
      console.error('[📋 APIService] Failed to fetch presets:', error);
      throw this.handleError(error);
    }
  }

  // Training API
  public async trainCharacter(formData: FormData): Promise<{ model_id: string; status: string }> {
    try {
      console.log('[🏋️ APIService] Starting character training');
      
      const response = await this.axiosInstance.post('/train', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.generationTimeout, // Use longer timeout for training
      });
      
      console.log('[🏋️ APIService] Training started:', response.data);
      return response.data;
    } catch (error) {
      console.error('[🏋️ APIService] Training request failed:', error);
      throw this.handleError(error);
    }
  }

  public async getTrainingStatus(modelId: string): Promise<{
    model: any;
    training_status: string;
  }> {
    try {
      const response = await this.get<any>(`/train/${modelId}/status`);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || error.response.data?.error || error.message;
        
        switch (status) {
          case 401:
            return new Error('Authentication failed');
          case 403:
            return new Error('Access denied');
          case 404:
            return new Error('Resource not found');
          case 429:
            return new Error('Too many requests. Please try again later.');
          case 500:
            return new Error('Server error. Please try again later.');
          default:
            return new Error(`Request failed: ${message}`);
        }
      } else if (error.request) {
        // Network error
        return new Error('Network error. Please check your connection.');
      }
    }
    
    return error instanceof Error ? error : new Error('An unknown error occurred');
  }

  // Training API Methods (matching Swift implementation)
  public async startModelTraining(formData: FormData): Promise<{
    success: boolean;
    modelId: string;
    message?: string;
  }> {
    try {
      console.log('[🚀 APIService] Starting character training');
      
      const response = await this.axiosInstance.post('/train', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.generationTimeout, // Use longer timeout for training
      });

      console.log('[🚀 APIService] Training started:', response.data);
      return {
        success: true,
        modelId: response.data.modelId,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('[🚀 APIService] Training request failed:', error);
      throw this.handleError(error);
    }
  }

  public async getTrainingProgress(modelId: string): Promise<{
    status: string;
    progress?: number;
    message?: string;
  }> {
    try {
      console.log('[🔄 APIService] Checking training status for:', modelId);
      
      const response = await this.get<any>(`/train/${modelId}/status`);
      
      console.log('[🔄 APIService] Training status response:', response);
      
      return {
        status: response.status || response.training_status || 'pending',
        progress: response.progress,
        message: response.message,
      };
    } catch (error: any) {
      console.error('[🔄 APIService] Failed to get training status:', error);
      throw this.handleError(error);
    }
  }

  // Delete a model using direct Supabase API call
  async deleteModel(modelId: string): Promise<void> {
    try {
      console.log('[🗑️ APIService] Deleting model via Supabase:', modelId);
      
      // Get user auth token for Supabase RLS
      const authToken = await AuthService.getAccessToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      // Direct Supabase REST API call to delete model
      const supabaseUrl = `${SUPABASE_CONFIG.url}/rest/v1/models?id=eq.${modelId}`;
      
      const response = await axios.delete(supabaseUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_CONFIG.apiKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      });
      
      if (response.status === 204 || response.status === 200) {
        console.log('[🗑️ APIService] ✅ Model deleted successfully via Supabase:', modelId);
        
        // Update user model count after successful deletion
        await this.updateUserModelCount(-1);
        
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error: any) {
      console.error('[🗑️ APIService] ❌ Failed to delete model via Supabase:', error);
      
      // If the direct Supabase approach fails, log the error details
      if (error.response) {
        console.error('[🗑️ APIService] Response status:', error.response.status);
        console.error('[🗑️ APIService] Response data:', error.response.data);
      }
      
      throw this.handleError(error);
    }
  }

  // Rename a model using direct Supabase API call
  async renameModel(modelId: string, newName: string): Promise<void> {
    try {
      console.log('[✏️ APIService] Renaming model via Supabase:', modelId, 'to:', newName);
      
      // Get user auth token for Supabase RLS
      const authToken = await AuthService.getAccessToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      // Direct Supabase REST API call to update model name
      const supabaseUrl = `${SUPABASE_CONFIG.url}/rest/v1/models?id=eq.${modelId}`;
      
      const response = await axios.patch(supabaseUrl, 
        { name: newName },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_CONFIG.apiKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );
      
      if (response.status === 204 || response.status === 200) {
        console.log('[✏️ APIService] ✅ Model renamed successfully via Supabase:', modelId);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error: any) {
      console.error('[✏️ APIService] ❌ Failed to rename model via Supabase:', error);
      
      // If the direct Supabase approach fails, log the error details
      if (error.response) {
        console.error('[✏️ APIService] Response status:', error.response.status);
        console.error('[✏️ APIService] Response data:', error.response.data);
      }
      
      throw this.handleError(error);
    }
  }

  // Update user model count in Supabase users table
  private async updateUserModelCount(deltaCount: number): Promise<void> {
    try {
      console.log('[👤 APIService] Updating user model count by:', deltaCount);
      
      const authToken = await AuthService.getAccessToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      // Get current user ID from AuthService (it should decode the JWT)
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        console.warn('[👤 APIService] Could not get current user ID for model count update');
        return;
      }

      // First get current model count
      const currentUserResponse = await axios.get(
        `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${userId}&select=model_count`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_CONFIG.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!currentUserResponse.data || currentUserResponse.data.length === 0) {
        console.warn('[👤 APIService] Could not find user record for model count update');
        return;
      }

      const currentCount = currentUserResponse.data[0].model_count || 0;
      const newCount = Math.max(0, currentCount + deltaCount); // Ensure it doesn't go negative

      // Update the user model count
      const updateResponse = await axios.patch(
        `${SUPABASE_CONFIG.url}/rest/v1/users?id=eq.${userId}`,
        { model_count: newCount },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_CONFIG.apiKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          }
        }
      );

      if (updateResponse.status === 200 || updateResponse.status === 204) {
        console.log('[👤 APIService] ✅ User model count updated:', currentCount, '→', newCount);
      } else {
        console.warn('[👤 APIService] ⚠️ User model count update returned unexpected status:', updateResponse.status);
      }

    } catch (error: any) {
      console.error('[👤 APIService] ❌ Failed to update user model count:', error);
      if (error.response) {
        console.error('[👤 APIService] Response status:', error.response.status);
        console.error('[👤 APIService] Response data:', error.response.data);
      }
      // Don't throw - this is a secondary operation that shouldn't fail the main delete
    }
  }

  // Camera API Methods
  public async captureAndGenerate(formData: FormData): Promise<{
    success: boolean;
    data?: {
      captureId: string;
      prompt: string;
      generationId?: string;
      estimatedTime?: number;
      metadata?: any;
    };
    error?: string;
  }> {
    try {
      console.log('[📸 APIService] Starting camera capture and generation');
      
      const response = await this.axiosInstance.post('/camera/capture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_CONFIG.generationTimeout, // Use longer timeout
      });

      console.log('[📸 APIService] Capture successful:', response.data);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error('[📸 APIService] Capture failed:', error);
      const handledError = this.handleError(error);
      return {
        success: false,
        error: handledError.message,
      };
    }
  }

  public async analyzePhoto(formData: FormData): Promise<{
    success: boolean;
    data?: {
      prompt: string;
      metadata?: any;
    };
    error?: string;
  }> {
    try {
      console.log('[🔍 APIService] Starting photo analysis');
      
      const response = await this.axiosInstance.post('/camera/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[🔍 APIService] Analysis successful:', response.data);
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      console.error('[🔍 APIService] Analysis failed:', error);
      const handledError = this.handleError(error);
      return {
        success: false,
        error: handledError.message,
      };
    }
  }

  public async getCaptureHistory(limit?: number, offset?: number): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      console.log('[📋 APIService] Getting capture history');
      
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await this.get<any>(`/camera/captures?${params.toString()}`);

      console.log('[📋 APIService] Capture history loaded:', response.length, 'items');
      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      console.error('[📋 APIService] Failed to get capture history:', error);
      const handledError = this.handleError(error);
      return {
        success: false,
        error: handledError.message,
      };
    }
  }
}

// Export singleton instance
export const APIService = new APIServiceClass();
export default APIService;