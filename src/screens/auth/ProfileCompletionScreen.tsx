import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

interface ProfileCompletionScreenProps {
  onProfileComplete: () => void;
}

const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export default function ProfileCompletionScreen({ onProfileComplete }: ProfileCompletionScreenProps) {
  const { updateProfile } = useAuth();
  const nameInputRef = useRef<TextInput>(null);
  
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [gender, setGender] = useState('female');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCompleteProfile = async () => {
    if (name.trim().length === 0) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsCompleting(true);
    
    try {
      // Update user profile
      const success = await updateProfile({
        name: name.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
        gender: gender,
      });

      if (success) {
        onProfileComplete();
      } else {
        // Continue to next screen even if profile update fails
        onProfileComplete();
      }
    } catch (error: any) {
      console.error('[ProfileCompletion] Error updating profile:', error);
      // Continue to next screen even on error
      onProfileComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  const isValidName = name.trim().length > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          {/* Main App Logo */}
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
          
          {/* Champagne/celebration icon */}
          <View style={styles.celebrationIcon}>
            <Text style={styles.celebrationEmoji}>🥂</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Introduce Yourself</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={nameInputRef}
              style={styles.textInput}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholderTextColor="#999999"
            />
          </View>

          {/* Date of Birth */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => {
              nameInputRef.current?.blur();
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.inputText, styles.dateText]}>
              {formatDate(dateOfBirth)}
            </Text>
            <Text style={styles.inputLabel}>Date of Birth</Text>
          </TouchableOpacity>

          {/* Gender Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowGenderPicker(true)}
          >
            <Text style={[styles.inputText, styles.genderText]}>
              {genderOptions.find(option => option.value === gender)?.label}
            </Text>
            <Text style={styles.inputLabel}>Gender</Text>
          </TouchableOpacity>

          {/* Complete Button */}
          <TouchableOpacity
            style={[styles.completeButton, { opacity: isValidName ? 1.0 : 0.5 }]}
            onPress={handleCompleteProfile}
            disabled={!isValidName || isCompleting}
          >
            {isCompleting ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.buttonText}>Completing...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={[styles.modalButtonText, styles.doneButton]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Gender Picker Modal */}
        {showGenderPicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showGenderPicker}
            onRequestClose={() => setShowGenderPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowGenderPicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Select Gender</Text>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowGenderPicker(false)}
                  >
                    <Text style={[styles.modalButtonText, styles.doneButton]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.genderOptionsContainer}>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.genderOption,
                        gender === option.value && styles.selectedGenderOption
                      ]}
                      onPress={() => setGender(option.value)}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        gender === option.value && styles.selectedGenderOptionText
                      ]}>
                        {option.label}
                      </Text>
                      {gender === option.value && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>
        )}

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 16,
  },
  celebrationIcon: {
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 80,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
    maxHeight: 400,
  },
  inputContainer: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    minHeight: 56,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  inputText: {
    fontSize: 16,
    color: '#000000',
  },
  dateText: {
    paddingBottom: 4,
  },
  genderText: {
    paddingBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  completeButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalButton: {
    padding: 8,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  doneButton: {
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  datePicker: {
    backgroundColor: '#ffffff',
  },
  genderOptionsContainer: {
    padding: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 12,
  },
  selectedGenderOption: {
    backgroundColor: '#FF48D8',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  selectedGenderOptionText: {
    color: '#ffffff',
  },
  checkmark: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});