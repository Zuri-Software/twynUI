import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

interface ImageConfirmationScreenProps {
  tempFolderName?: string;
  onContinue: () => void;
}

export default function ImageConfirmationScreen({ 
  tempFolderName, 
  onContinue 
}: ImageConfirmationScreenProps) {

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Success Icon */}
        <View style={styles.iconSection}>
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>

        {/* Title and Description */}
        <View style={styles.messageSection}>
          <Text style={styles.title}>Photos Uploaded!</Text>
          
          <Text style={styles.description}>
            {tempFolderName 
              ? "Your photos are safely stored and ready for training when you upgrade."
              : "We'll help you set up your avatar when you're ready to upgrade."
            }
          </Text>

          {tempFolderName && (
            <View style={styles.folderInfo}>
              <Text style={styles.folderLabel}>Upload ID:</Text>
              <Text style={styles.folderName}>{tempFolderName}</Text>
            </View>
          )}
        </View>

        {/* Continue Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>

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
    alignItems: 'center',
  },
  iconSection: {
    marginBottom: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  messageSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  folderInfo: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  folderLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'monospace',
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#FF48D8',
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});