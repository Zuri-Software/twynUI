import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { AuthState, getAuthErrorMessage } from '../../types/auth.types';
import CountryPicker, { Country, DEFAULT_COUNTRY } from '../../components/ui/CountryPicker';

interface PhoneNumberScreenProps {
  onOTPSent: (phone: string) => void;
}

export default function PhoneNumberScreen({ onOTPSent }: PhoneNumberScreenProps) {
  const { sendOTP, authState } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoading = authState === AuthState.SENDING_OTP;

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    
    // Format based on country (simplified for US/CA format)
    if (selectedCountry.dialCode === '+1') {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    return digits;
  };

  const isValidPhoneNumber = (): boolean => {
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Simplified validation - check length based on country
    if (selectedCountry.dialCode === '+1') {
      return digits.length === 10;
    }
    
    return digits.length >= 10;
  };

  const handleSendOTP = async () => {
    if (!isValidPhoneNumber()) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    try {
      setErrorMessage('');
      const fullPhoneNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;
      console.log('[PhoneNumberScreen] Sending OTP to:', fullPhoneNumber);
      
      await sendOTP(fullPhoneNumber);
      onOTPSent(fullPhoneNumber);
    } catch (error: any) {
      console.error('[PhoneNumberScreen] Send OTP error:', error);
      if (error.type) {
        setErrorMessage(getAuthErrorMessage(error));
      } else {
        setErrorMessage(error.message || 'Failed to send OTP. Please try again.');
      }
    }
  };

  const handlePhoneNumberChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Enter your phone number</Text>
              <Text style={styles.subtitle}>
                We'll send you a verification code
              </Text>
            </View>

            {/* Phone Input */}
            <View style={styles.inputContainer}>
              <View style={styles.phoneInputWrapper}>
                {/* Country Selector */}
                <CountryPicker
                  selectedCountry={selectedCountry}
                  onCountrySelect={setSelectedCountry}
                  style={styles.countrySelector}
                />

                {/* Phone Number Input */}
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  placeholder="Phone Number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  maxLength={15} // Allow for different country formats
                />
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  backgroundColor: isValidPhoneNumber() && !isLoading ? '#007AFF' : '#cccccc',
                },
              ]}
              onPress={handleSendOTP}
              disabled={!isValidPhoneNumber() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>

            {/* Terms of Service */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
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
  inputContainer: {
    marginBottom: 32,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  countrySelector: {
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  continueButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonText: {
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
  termsText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#007AFF',
    fontWeight: '500',
  },
});