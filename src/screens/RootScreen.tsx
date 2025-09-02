import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { GalleryProvider } from '../context/GalleryContext';
import { GenerationProvider } from '../context/GenerationContext';
import { TrainingProvider } from '../context/TrainingContext';
import { AppStateProvider } from '../context/AppStateContext';
import { CameraProvider } from '../context/CameraContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { Loading, LoadingType } from '../components/ui/LoadingStates';
import { AuthState } from '../types/auth.types';
import AuthFlowScreen from './auth/AuthFlowScreen';
import AppNavigator from '../navigation/AppNavigator';
import NotificationService from '../services/NotificationService';

function AppContent() {
  console.log('🎯 [RootScreen] AppContent rendering');
  
  try {
    const { authState, user, isLoading } = useAuth();
    
    console.log('[RootScreen] Auth state:', authState, 'User:', user ? `exists (onboarding: ${user.onboardingCompleted})` : 'null', 'Loading:', isLoading);

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (authState === AuthState.AUTHENTICATED && user) {
      console.log('[RootScreen] User authenticated, initializing notifications...');
      NotificationService.initialize().then((success) => {
        if (success) {
          console.log('[RootScreen] ✅ Notifications initialized successfully');
        } else {
          console.log('[RootScreen] ⚠️ Notifications initialization failed');
        }
      });
    }
  }, [authState, user]);

  if (isLoading || authState === AuthState.LOADING) {
    console.log('[RootScreen] 🔄 Still loading, showing spinner');
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Loading
          type={LoadingType.PULSE}
          message="Loading your experience..."
          size="large"
          color="#007AFF"
        />
      </SafeAreaView>
    );
  }

  if (authState === AuthState.AUTHENTICATED && user) {
    console.log('[RootScreen] 🎯 User authenticated, rendering main app. User:', user.name, 'Onboarding completed:', user.onboardingCompleted);
    
    // Check if user has completed onboarding
    if (!user.onboardingCompleted) {
      console.log('[RootScreen] 📋 User needs to complete onboarding, showing AuthFlowScreen');
      return (
        <AuthFlowScreen
          onAuthComplete={() => {
            // Onboarding complete, will be handled by auth state change
            console.log('[RootScreen] 🎯 Onboarding completed callback called');
          }}
        />
      );
    }
    
    console.log('[RootScreen] ✅ User authenticated and onboarding completed, rendering main app');
    console.log('[RootScreen] ✅ Rendering full app with context providers');
    
    // Full app with proper context stack and error boundaries
    return (
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('❌ [RootScreen] App state error:', error);
          // TODO: Handle app state specific errors
        }}
      >
        <AppStateProvider>
          <ErrorBoundary
            onError={(error, errorInfo) => {
              console.error('❌ [RootScreen] Context providers error:', error);
            }}
          >
            <FavoritesProvider>
              <TrainingProvider>
                <GenerationProvider>
                  <GalleryProvider>
                    <CameraProvider>
                      <ErrorBoundary
                        onError={(error, errorInfo) => {
                          console.error('❌ [RootScreen] Navigation error:', error);
                          // TODO: Handle navigation specific errors
                        }}
                      >
                        <AppNavigator key={`nav-${authState}-${user?.id || 'none'}`} />
                      </ErrorBoundary>
                    </CameraProvider>
                  </GalleryProvider>
                </GenerationProvider>
              </TrainingProvider>
            </FavoritesProvider>
          </ErrorBoundary>
        </AppStateProvider>
      </ErrorBoundary>
    );
  }

  // Only show AuthFlowScreen for non-authenticated users
  if (authState === AuthState.UNAUTHENTICATED || authState === AuthState.SENDING_OTP || authState === AuthState.VERIFYING_OTP) {
    console.log('[RootScreen] 📱 Showing authentication flow');
    return (
      <AuthFlowScreen
        onAuthComplete={() => {
          // Auth complete, will be handled by auth state change
          console.log('[RootScreen] 🎯 Authentication completed callback called');
          console.log('[RootScreen] Current authState at completion:', authState);
          console.log('[RootScreen] Current user at completion:', user ? `exists (${user.name})` : 'null');
        }}
      />
    );
  }

  // Fallback for unexpected states
  console.log('[RootScreen] ⚠️ Unexpected auth state:', authState, 'showing loading');
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <Loading
        type={LoadingType.DOTS}
        message="Initializing..."
        color="#007AFF"
      />
      <Text style={styles.debugText}>
        Debug: Auth State = {authState}
      </Text>
    </SafeAreaView>
  );
  } catch (error) {
    console.error('❌ [RootScreen] Error in AppContent:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
        <Text style={{ color: 'white', fontSize: 20 }}>ERROR IN APPCONTENT</Text>
        <Text style={{ color: 'white', fontSize: 16 }}>{String(error)}</Text>
      </View>
    );
  }
}

export default function RootScreen() {
  console.log('🏠 [RootScreen] Root component rendering');
  
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('❌ [RootScreen] Root error boundary caught:', error);
        console.error('❌ [RootScreen] Error info:', errorInfo);
        // TODO: Report to crash analytics service
      }}
    >
      <AuthProvider>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('❌ [RootScreen] Auth context error:', error);
            // TODO: Handle auth-specific errors
          }}
        >
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  debugText: {
    marginTop: 20,
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});