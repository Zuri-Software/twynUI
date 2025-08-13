// Auth Request Models
export interface SendOTPRequest {
  phone: string;
}

export interface VerifyOTPRequest {
  phone: string;
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Auth Response Models
export interface SendOTPResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  user: UserProfile;
  session: SessionData;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// User Models
export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  subscriptionTier: string;
  modelCount: number;
  monthlyGenerations: number;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserUsage {
  currentPeriod: UsagePeriod;
  limits: UsageLimits;
  modelsCreated: number;
  generationsThisMonth: number;
  canCreateModels: boolean;
  canGenerateImages: boolean;
}

export interface UsagePeriod {
  startDate: string;
  endDate: string;
  generationCount: number;
}

export interface UsageLimits {
  models: number; // -1 for unlimited
  monthlyGenerations: number; // -1 for unlimited
}

export interface BackendModel {
  id: string;
  user_id: string;
  name: string;
  status: string;
  higgsfield_id?: string;
  thumbnail_url?: string;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserModelsResponse {
  models: BackendModel[];
  count: number;
  userId: string;
}

// Auth State
export enum AuthState {
  UNAUTHENTICATED = 'unauthenticated',
  SENDING_OTP = 'sending_otp',
  VERIFYING_OTP = 'verifying_otp',
  AUTHENTICATED = 'authenticated',
  LOADING = 'loading',
}

// Auth Errors
export enum AuthErrorType {
  INVALID_PHONE_NUMBER = 'invalid_phone_number',
  INVALID_OTP = 'invalid_otp',
  NETWORK_ERROR = 'network_error',
  INVALID_RESPONSE = 'invalid_response',
  TOKEN_EXPIRED = 'token_expired',
  UNKNOWN = 'unknown',
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
}

export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.type) {
    case AuthErrorType.INVALID_PHONE_NUMBER:
      return 'Please enter a valid phone number';
    case AuthErrorType.INVALID_OTP:
      return 'Invalid OTP. Please try again';
    case AuthErrorType.NETWORK_ERROR:
      return `Network error: ${error.message}`;
    case AuthErrorType.INVALID_RESPONSE:
      return 'Invalid response from server';
    case AuthErrorType.TOKEN_EXPIRED:
      return 'Session expired. Please login again';
    case AuthErrorType.UNKNOWN:
      return `Unknown error: ${error.message}`;
    default:
      return 'An error occurred';
  }
};