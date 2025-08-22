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
  Image,
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
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
                  maxLength={15}
                  autoFocus={true}
                />
              </View>

              {/* Error Message */}
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null}
            </View>

            {/* Continue Button - Custom Image Style */}
            <TouchableOpacity
              style={styles.continueButtonContainer}
              onPress={handleSendOTP}
              disabled={!isValidPhoneNumber() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingButton}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.loadingText}>Sending...</Text>
                </View>
              ) : (
                <Image 
                  source={require('../../../assets/images/ui/phonescreen_button.png')}
                  style={[
                    styles.buttonImage,
                    { opacity: isValidPhoneNumber() ? 1.0 : 0.5 }
                  ]}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>

            {/* Terms of Service */}
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
            
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
  topSpacer: {
    height: 20, // Reduced height to move image up
  },
  imageContainer: {
    alignItems: 'center', // Reduced spacing between image and input field
  },
  phoneScreenImage: {
    width: '100%',
    maxWidth: 380, // Even bigger size
    height: 280,   // Even bigger height
  },
  inputContainer: {
    marginBottom: 0, // No space between input and button
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
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
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  continueButtonContainer: {
    alignItems: 'center',    // Space from input field to button // Space after button
  },
  buttonImage: {
    width: '100%',
    maxWidth: 320, // Match phone screen image width
    aspectRatio: 531/67, // Use the original aspect ratio (≈7.9:1)
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
  termsText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 20, // Add some margin from bottom
  },
  bottomSpacer: {
    height: 40, // Fixed height instead of flex
  },
});