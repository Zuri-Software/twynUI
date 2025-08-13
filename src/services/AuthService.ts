import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { 
  SendOTPRequest, 
  SendOTPResponse, 
  VerifyOTPRequest, 
  VerifyOTPResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile, 
  AuthState,
  AuthError,
  AuthErrorType 
} from '../types/auth.types';

const API_BASE_URL = 'https://twynbackend-production.up.railway.app/api';

class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;
  private authState: AuthState = AuthState.UNAUTHENTICATED;
  private listeners: Array<(state: AuthState, user?: UserProfile) => void> = [];

  // Secure storage keys
  private static readonly ACCESS_TOKEN_KEY = 'soul_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'soul_refresh_token';
  private static readonly USER_PROFILE_KEY = 'soul_user_profile';

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Subscribe to auth state changes
  public subscribe(listener: (state: AuthState, user?: UserProfile) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current state
    listener(this.authState, this.currentUser || undefined);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.authState, this.currentUser || undefined);
    });
  }

  private setState(newState: AuthState, user?: UserProfile) {
    this.authState = newState;
    this.currentUser = user || null;
    this.notifyListeners();
  }

  // Token management
  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(AuthService.ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(AuthService.REFRESH_TOKEN_KEY, refreshToken)
      ]);
    } catch (error) {
      console.error('[AuthService] Error storing tokens:', error);
      throw error;
    }
  }

  private async storeUserProfile(user: UserProfile): Promise<void> {
    try {
      await SecureStore.setItemAsync(AuthService.USER_PROFILE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('[AuthService] Error storing user profile:', error);
      throw error;
    }
  }

  public async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AuthService.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Error getting access token:', error);
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AuthService.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[AuthService] Error getting refresh token:', error);
      return null;
    }
  }

  public async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(AuthService.ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(AuthService.REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(AuthService.USER_PROFILE_KEY)
      ]);
    } catch (error) {
      console.error('[AuthService] Error clearing tokens:', error);
    }
  }

  // Initialize auth state on app launch
  public async initialize(): Promise<void> {
    console.log('[AuthService] 🚀 Starting initialization');
    this.setState(AuthState.LOADING);
    
    try {
      console.log('[AuthService] 🔍 Checking for stored tokens and user profile');
      const [accessToken, userProfileJson] = await Promise.all([
        this.getAccessToken(),
        SecureStore.getItemAsync(AuthService.USER_PROFILE_KEY)
      ]);

      console.log('[AuthService] Token exists:', !!accessToken, 'Profile exists:', !!userProfileJson);

      if (accessToken && userProfileJson) {
        const userProfile: UserProfile = JSON.parse(userProfileJson);
        console.log('[AuthService] ✅ Found existing auth, setting to AUTHENTICATED');
        this.setState(AuthState.AUTHENTICATED, userProfile);
      } else {
        console.log('[AuthService] ❌ No existing auth, setting to UNAUTHENTICATED');
        this.setState(AuthState.UNAUTHENTICATED);
      }
    } catch (error) {
      console.error('[AuthService] ❌ Error initializing:', error);
      this.setState(AuthState.UNAUTHENTICATED);
    }
  }

  // Send OTP
  public async sendOTP(phone: string): Promise<void> {
    this.setState(AuthState.SENDING_OTP);

    try {
      const request: SendOTPRequest = { phone };
      const response = await axios.post<SendOTPResponse>(`${API_BASE_URL}/auth/send-otp`, request);
      
      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      // Stay in sending OTP state - UI should navigate to OTP verification
    } catch (error) {
      this.setState(AuthState.UNAUTHENTICATED);
      throw this.handleAuthError(error);
    }
  }

  // Verify OTP
  public async verifyOTP(phone: string, token: string): Promise<UserProfile> {
    this.setState(AuthState.VERIFYING_OTP);

    try {
      const request: VerifyOTPRequest = { phone, token };
      const response = await axios.post<VerifyOTPResponse>(`${API_BASE_URL}/auth/verify-otp`, request);
      
      if (!response.data.success) {
        throw new Error('OTP verification failed');
      }

      // Store tokens and user profile
      await Promise.all([
        this.storeTokens(response.data.session.access_token, response.data.session.refresh_token),
        this.storeUserProfile(response.data.user)
      ]);

      this.setState(AuthState.AUTHENTICATED, response.data.user);
      return response.data.user;
    } catch (error) {
      this.setState(AuthState.UNAUTHENTICATED);
      throw this.handleAuthError(error);
    }
  }

  // Refresh access token
  public async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const request: RefreshTokenRequest = { refreshToken };
      const response = await axios.post<RefreshTokenResponse>(`${API_BASE_URL}/auth/refresh`, request);
      
      await this.storeTokens(response.data.access_token, response.data.refresh_token);
      return true;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      await this.logout();
      return false;
    }
  }

  // Logout
  public async logout(): Promise<void> {
    await this.clearTokens();
    this.setState(AuthState.UNAUTHENTICATED);
  }

  // Get current user
  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  // Get current auth state
  public getAuthState(): AuthState {
    return this.authState;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.authState === AuthState.AUTHENTICATED && this.currentUser !== null;
  }

  // Update user profile
  public async updateProfile(profileData: {
    name: string;
    dateOfBirth: string;
    gender: string;
  }): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await axios.patch(`${API_BASE_URL}/user/profile`, profileData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data.success && this.currentUser) {
        // Update stored user profile
        const updatedUser: UserProfile = {
          ...this.currentUser,
          ...profileData,
        };
        await this.storeUserProfile(updatedUser);
        this.setState(AuthState.AUTHENTICATED, updatedUser);
      }

      return response.data.success;
    } catch (error) {
      console.error('[AuthService] Update profile error:', error);
      return false;
    }
  }

  // Complete onboarding
  public async completeOnboarding(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post(`${API_BASE_URL}/user/complete-onboarding`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.data.success && this.currentUser) {
        // Mark user as having completed onboarding
        const updatedUser: UserProfile = {
          ...this.currentUser,
          onboardingCompleted: true,
        };
        await this.storeUserProfile(updatedUser);
        this.setState(AuthState.AUTHENTICATED, updatedUser);
      }

      return response.data.success;
    } catch (error) {
      console.error('[AuthService] Complete onboarding error:', error);
      return false;
    }
  }

  // Get auth header for API requests
  public async getAuthHeader(): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();
      return accessToken ? `Bearer ${accessToken}` : null;
    } catch (error) {
      console.error('[AuthService] Get auth header error:', error);
      return null;
    }
  }

  // Error handling
  private handleAuthError(error: any): AuthError {
    if (error.message) {
      if (error.message.includes('phone')) {
        return { type: AuthErrorType.INVALID_PHONE_NUMBER, message: error.message };
      }
      if (error.message.includes('OTP') || error.message.includes('token')) {
        return { type: AuthErrorType.INVALID_OTP, message: error.message };
      }
      if (error.message.includes('network') || error.message.includes('Network')) {
        return { type: AuthErrorType.NETWORK_ERROR, message: error.message };
      }
    }
    
    return { 
      type: AuthErrorType.UNKNOWN, 
      message: error.message || 'An unknown error occurred' 
    };
  }
}

export default AuthService.getInstance();