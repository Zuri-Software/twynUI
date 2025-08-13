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
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
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

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      return;
    }

    try {
      setErrorMessage('');
      console.log('[OTPVerificationScreen] Verifying OTP:', code);
      
      const user = await verifyOTP(phoneNumber, code);
      console.log('[OTPVerificationScreen] OTP verified, user onboarding status:', user.onboardingCompleted);
      
      onVerificationSuccess();
    } catch (error: any) {
      console.error('[OTPVerificationScreen] Verify OTP error:', error);
      if (error.type) {
        setErrorMessage(getAuthErrorMessage(error));
      } else {
        setErrorMessage(error.message || 'Invalid code. Please try again.');
      }
      
      // Clear OTP fields on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setErrorMessage('');
      setCanResend(false);
      setResendTimer(30);
      
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

  const isOtpComplete = otp.every(digit => digit !== '');
  const maskedPhoneNumber = phoneNumber.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1 $2-$3-$4');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a code to {maskedPhoneNumber}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  {
                    borderColor: digit ? '#007AFF' : errorMessage ? '#ff3333' : '#e5e5e5',
                    backgroundColor: digit ? '#f0f8ff' : '#ffffff',
                  },
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                backgroundColor: isOtpComplete && !isLoading ? '#007AFF' : '#cccccc',
              },
            ]}
            onPress={() => handleVerifyOTP()}
            disabled={!isOtpComplete || isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP}>
                <Text style={styles.resendButtonText}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimerText}>
                Resend in {resendTimer}s
              </Text>
            )}
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  verifyButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  resendButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  resendTimerText: {
    fontSize: 14,
    color: '#999999',
  },
});