import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
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
  
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [gender, setGender] = useState('female');
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Header Section */}
        <View style={styles.header}>
          {/* Logo placeholder - you can add actual logo later */}
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>TWYN</Text>
          </View>
          
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
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.inputText, styles.dateText]}>
              {formatDate(dateOfBirth)}
            </Text>
            <Text style={styles.inputLabel}>Date of Birth</Text>
          </TouchableOpacity>

          {/* Gender Selection */}
          <View style={styles.inputContainer}>
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Gender</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={gender}
                  onValueChange={setGender}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {genderOptions.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

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
          <DateTimePicker
            value={dateOfBirth}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

      </View>
    </SafeAreaView>
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
  logoPlaceholder: {
    width: 80,
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF48D8',
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
  inputLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderLabel: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'flex-end',
  },
  picker: {
    width: 120,
    height: 40,
  },
  pickerItem: {
    fontSize: 16,
    height: 120,
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
});