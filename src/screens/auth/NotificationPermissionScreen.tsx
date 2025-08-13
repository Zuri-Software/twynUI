import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../context/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

interface NotificationPermissionScreenProps {
  onComplete: () => void;
}

export default function NotificationPermissionScreen({ onComplete }: NotificationPermissionScreenProps) {
  const { completeOnboarding } = useAuth();
  
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequestingPermission(true);

    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          allowProvisional: false,
          allowAnnouncements: false,
        },
      });

      console.log('[NotificationPermission] Permission status:', status);

      // Complete onboarding regardless of permission status
      await completeOnboardingFlow();
      
    } catch (error: any) {
      console.error('[NotificationPermission] Error requesting permissions:', error);
      // Continue with onboarding even if permission request fails
      await completeOnboardingFlow();
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleSkip = async () => {
    console.log('[NotificationPermission] User skipped notifications');
    await completeOnboardingFlow();
  };

  const completeOnboardingFlow = async () => {
    try {
      // Mark onboarding as completed in backend
      const success = await completeOnboarding();
      
      if (success) {
        console.log('[NotificationPermission] Onboarding completed successfully');
      } else {
        console.log('[NotificationPermission] Onboarding completion failed, but continuing');
      }
      
      // Proceed to main app
      onComplete();
      
    } catch (error: any) {
      console.error('[NotificationPermission] Error completing onboarding:', error);
      // Proceed anyway to avoid blocking the user
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Bell Icon */}
        <View style={styles.iconSection}>
          <View style={styles.bellIcon}>
            <Text style={styles.bellEmoji}>🔔</Text>
          </View>
        </View>

        {/* Title and Description */}
        <View style={styles.messageSection}>
          <Text style={styles.title}>Stay Updated</Text>
          
          <Text style={styles.description}>
            Get notified when your avatar training is complete and when new features are available.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {/* Enable Notifications Button */}
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableNotifications}
            disabled={isRequestingPermission}
          >
            {isRequestingPermission ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.enableButtonText}>Requesting...</Text>
              </View>
            ) : (
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            )}
          </TouchableOpacity>

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isRequestingPermission}
          >
            <Text style={styles.skipButtonText}>Not Now</Text>
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
  bellIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bellEmoji: {
    fontSize: 48,
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
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
  },
  enableButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    height: 50,
    paddingHorizontal: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});