import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from '../services/AuthService';
import NotificationService from '../services/NotificationService';
import { AuthState, UserProfile } from '../types/auth.types';

interface ProfileData {
  name: string;
  dateOfBirth: string;
  gender: string;
}

interface AuthContextType {
  authState: AuthState;
  user: UserProfile | null;
  isLoading: boolean;
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<UserProfile>;
  updateProfile: (profileData: ProfileData) => Promise<boolean>;
  completeOnboarding: () => Promise<boolean>;
  getAuthHeader: () => Promise<string | null>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  initializeNotifications: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('🔐 [AuthProvider] Initializing AuthProvider');
  
  const [authState, setAuthState] = useState<AuthState>(AuthState.LOADING);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('🔐 [AuthProvider] State - authState:', authState, 'user:', user ? 'exists' : 'null', 'isLoading:', isLoading);

  useEffect(() => {
    console.log('🔐 [AuthProvider] Setting up auth initialization and subscription');
    
    // Initialize auth service and subscribe to auth state changes
    const initializeAuth = async () => {
      try {
        console.log('🔐 [AuthProvider] Starting AuthService.initialize()');
        await AuthService.initialize();
        console.log('🔐 [AuthProvider] ✅ AuthService.initialize() completed');
      } catch (error) {
        console.error('🔐 [AuthProvider] ❌ AuthService.initialize() failed:', error);
      }
    };

    const unsubscribe = AuthService.subscribe((newState, newUser) => {
      console.log('[AuthContext] Auth state changed:', newState, 'User:', newUser ? newUser.phone : 'null');
      setAuthState(newState);
      setUser(newUser || null);
      setIsLoading(newState === AuthState.LOADING);
      
      // Initialize notifications when user is authenticated
      if (newState === AuthState.AUTHENTICATED && newUser) {
        console.log('[AuthContext] ✅ User authenticated, initializing notifications...');
        NotificationService.initialize().then(success => {
          if (success) {
            console.log('[AuthContext] ✅ Notifications initialized successfully');
          } else {
            console.log('[AuthContext] ⚠️ Notification initialization failed');
          }
        }).catch(error => {
          console.error('[AuthContext] ❌ Notification initialization error:', error);
        });
      }
    });

    initializeAuth();

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const sendOTP = async (phone: string): Promise<void> => {
    try {
      await AuthService.sendOTP(phone);
    } catch (error) {
      console.error('[AuthContext] Send OTP error:', error);
      throw error;
    }
  };

  const verifyOTP = async (phone: string, token: string): Promise<UserProfile> => {
    try {
      const user = await AuthService.verifyOTP(phone, token);
      return user;
    } catch (error) {
      console.error('[AuthContext] Verify OTP error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData: ProfileData): Promise<boolean> => {
    try {
      return await AuthService.updateProfile(profileData);
    } catch (error) {
      console.error('[AuthContext] Update profile error:', error);
      return false;
    }
  };

  const completeOnboarding = async (): Promise<boolean> => {
    try {
      return await AuthService.completeOnboarding();
    } catch (error) {
      console.error('[AuthContext] Complete onboarding error:', error);
      return false;
    }
  };

  const getAuthHeader = async (): Promise<string | null> => {
    try {
      return await AuthService.getAuthHeader();
    } catch (error) {
      console.error('[AuthContext] Get auth header error:', error);
      return null;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      return await AuthService.refreshToken();
    } catch (error) {
      console.error('[AuthContext] Refresh token error:', error);
      return false;
    }
  };

  const initializeNotifications = async (): Promise<boolean> => {
    try {
      console.log('[AuthContext] Manual notification initialization requested');
      const success = await NotificationService.initialize();
      if (success) {
        console.log('[AuthContext] ✅ Manual notification initialization successful');
      } else {
        console.log('[AuthContext] ⚠️ Manual notification initialization failed');
      }
      return success;
    } catch (error) {
      console.error('[AuthContext] ❌ Manual notification initialization error:', error);
      return false;
    }
  };

  const contextValue: AuthContextType = {
    authState,
    user,
    isLoading,
    sendOTP,
    verifyOTP,
    updateProfile,
    completeOnboarding,
    getAuthHeader,
    logout,
    refreshToken,
    initializeNotifications,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;