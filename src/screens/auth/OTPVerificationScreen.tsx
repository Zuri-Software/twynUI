import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { AuthState, getAuthErrorMessage } from '../../types/auth.types';

interface OTPVerificationScreenProps {
  phoneNumber: string;
  onVerificationSuccess: () => void;
  onGoBack: () => void;
}

export default function OTPVerificationScreen({
  phoneNumber,
  onVerificationSuccess,
  onGoBack,
}: OTPVerificationScreenProps) {
  const { verifyOTP, sendOTP, authState } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(60); // Match SwiftUI 60s timer
  const [canResend, setCanResend] = useState(false);

  const isLoading = authState === AuthState.VERIFYING_OTP;

  // Timer for resend functionality
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer, canResend]);

  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(digitsOnly);

    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    try {
      setErrorMessage('');
      console.log('[OTPVerificationScreen] Verifying OTP:', otpCode);
      
      const user = await verifyOTP(phoneNumber, otpCode);
      console.log('[OTPVerificationScreen] OTP verified, user onboarding status:', user.onboardingCompleted);
      
      onVerificationSuccess();
    } catch (error: any) {
      console.error('[OTPVerificationScreen] Verify OTP error:', error);
      if (error.type) {
        setErrorMessage(getAuthErrorMessage(error));
      } else {
        setErrorMessage(error.message || 'Invalid code. Please try again.');
      }
      
      // Clear OTP field on error
      setOtpCode('');
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setErrorMessage('');
      setCanResend(false);
      setResendTimer(60); // Match SwiftUI 60s timer
      
      await sendOTP(phoneNumber);
      Alert.alert('Success', 'Verification code sent successfully');
    } catch (error: any) {
      console.error('[OTPVerificationScreen] Resend OTP error:', error);
      if (error.type) {
        setErrorMessage(getAuthErrorMessage(error));
      } else {
        setErrorMessage(error.message || 'Failed to resend code. Please try again.');
      }
      setCanResend(true);
      setResendTimer(0);
    }
  };

  const isOtpComplete = otpCode.length === 6;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            {/* Top Spacer - Fixed Height */}
            <View style={styles.topSpacer} />
            
            {/* Phone Screen Image */}
            <View style={styles.imageContainer}>
              <Image 
                source={require('../../../assets/images/training/phonescreen.png')}
                style={styles.phoneScreenImage}
                resizeMode="contain"
              />
            </View>

            {/* OTP Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.otpInput}
                value={otpCode}
                onChangeText={handleOtpChange}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus={true}
              />

              {/* Error Message */}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </View>

            {/* Verify Button - Custom Image Style */}
            <TouchableOpacity
              style={styles.verifyButtonContainer}
              onPress={handleVerifyOTP}
              disabled={!isOtpComplete || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Verifying...</Text>
                </View>
              ) : (
                <Image 
                  source={require('../../../assets/images/ui/otp_button.png')}
                  style={[
                    styles.buttonImage,
                    { opacity: isOtpComplete ? 1.0 : 0.5 }
                  ]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOTP}>
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendTimerText}>
                  Resend code in {resendTimer}s
                </Text>
              )}
            </View>
            
            {/* Bottom Spacer - Fixed Height */}
            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    minHeight: '100%',
  },
  content: {
    paddingHorizontal: 24,
    minHeight: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 0,
    padding: 8,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  topSpacer: {
    height: 20,
  },
  imageContainer: {
    alignItems: 'center',
  },
  phoneScreenImage: {
    width: '100%',
    maxWidth: 380,
    height: 280,
  },
  inputContainer: {
    marginBottom: 0,
  },
  otpInput: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  verifyButtonContainer: {
    alignItems: 'center',
  },
  buttonImage: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 531/67,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#cccccc',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  resendTimerText: {
    fontSize: 12,
    color: '#666666',
  },
  bottomSpacer: {
    height: 40,
  },
});