import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PhoneNumberScreen from './PhoneNumberScreen';
import OTPVerificationScreen from './OTPVerificationScreen';
import ProfileCompletionScreen from './ProfileCompletionScreen';
import AvatarTrainingScreen from './AvatarTrainingScreen';
import ImageConfirmationScreen from './ImageConfirmationScreen';
import NotificationPermissionScreen from './NotificationPermissionScreen';
import { useAuth } from '../../context/AuthContext';
import { AuthState } from '../../types/auth.types';

type AuthFlowStep = 'phone' | 'otp' | 'profile' | 'avatar' | 'confirmation' | 'notifications';

interface AuthFlowScreenProps {
  onAuthComplete: () => void;
}

export default function AuthFlowScreen({ onAuthComplete }: AuthFlowScreenProps) {
  const { authState, user } = useAuth();
  const [currentStep, setCurrentStep] = useState<AuthFlowStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tempFolderName, setTempFolderName] = useState<string | undefined>();

  // Check if user is already authenticated and completed onboarding
  useEffect(() => {
    console.log('[AuthFlowScreen] 🔄 Auth state effect triggered:', authState, 'User:', user ? `exists (onboarding: ${user.onboardingCompleted})` : 'null');
    
    if (authState === AuthState.AUTHENTICATED && user?.onboardingCompleted) {
      console.log('[AuthFlowScreen] ✅ User authenticated and onboarded, completing auth flow');
      onAuthComplete();
    } else if (authState === AuthState.AUTHENTICATED && user && !user.onboardingCompleted) {
      console.log('[AuthFlowScreen] ⚠️ User authenticated but needs onboarding');
      // Check if user has profile data, skip profile step if complete
      if (user.name) {
        console.log('[AuthFlowScreen] User has profile, skipping to avatar step');
        setCurrentStep('avatar');
      } else {
        console.log('[AuthFlowScreen] User needs profile completion');
        setCurrentStep('profile');
      }
    }
  }, [authState, user?.onboardingCompleted, user?.name]);

  const handleOTPSent = (phone: string) => {
    setPhoneNumber(phone);
    setCurrentStep('otp');
  };

  const handleVerificationSuccess = () => {
    console.log('[AuthFlowScreen] 🎯 handleVerificationSuccess called');
    console.log('[AuthFlowScreen] Current auth state:', authState);
    console.log('[AuthFlowScreen] Current user:', user ? `exists (onboarding: ${user.onboardingCompleted})` : 'null');
    
    // Don't make navigation decisions immediately - let useEffect handle it when auth state updates
    console.log('[AuthFlowScreen] Waiting for auth state to propagate...');
  };

  const handleProfileComplete = () => {
    setCurrentStep('avatar');
  };

  const handleAvatarUploadComplete = (folderName?: string) => {
    setTempFolderName(folderName);
    setCurrentStep('confirmation');
  };

  const handleImageConfirmationContinue = () => {
    setCurrentStep('notifications');
  };

  const handleOnboardingComplete = () => {
    onAuthComplete();
  };

  const handleGoBack = () => {
    switch (currentStep) {
      case 'otp':
        setCurrentStep('phone');
        break;
      case 'profile':
        setCurrentStep('otp');
        break;
      case 'avatar':
        setCurrentStep('profile');
        break;
      case 'confirmation':
        setCurrentStep('avatar');
        break;
      case 'notifications':
        setCurrentStep('confirmation');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      {currentStep === 'phone' && (
        <PhoneNumberScreen onOTPSent={handleOTPSent} />
      )}
      
      {currentStep === 'otp' && (
        <OTPVerificationScreen
          phoneNumber={phoneNumber}
          onVerificationSuccess={handleVerificationSuccess}
          onGoBack={handleGoBack}
        />
      )}

      {currentStep === 'profile' && (
        <ProfileCompletionScreen
          onProfileComplete={handleProfileComplete}
        />
      )}

      {currentStep === 'avatar' && (
        <AvatarTrainingScreen
          onUploadComplete={handleAvatarUploadComplete}
        />
      )}

      {currentStep === 'confirmation' && (
        <ImageConfirmationScreen
          tempFolderName={tempFolderName}
          onContinue={handleImageConfirmationContinue}
        />
      )}

      {currentStep === 'notifications' && (
        <NotificationPermissionScreen
          onComplete={handleOnboardingComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});