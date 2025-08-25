import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
// import { BlurView } from 'expo-blur'; // Using standard View instead
import NotificationService from '../../services/NotificationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface NotificationPermissionPopupProps {
  visible: boolean;
  onComplete: () => void;
}

export default function NotificationPermissionPopup({ visible, onComplete }: NotificationPermissionPopupProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAllow = async () => {
    setIsLoading(true);
    try {
      console.log('[NotificationPopup] 🚀 User allowed notifications - starting initialization...');
      
      const success = await NotificationService.initialize();
      
      if (success) {
        console.log('[NotificationPopup] ✅ Notifications setup successful');
        console.log('[NotificationPopup] 🎯 Device token:', NotificationService.getPushToken());
      } else {
        console.log('[NotificationPopup] ❌ Notification setup failed');
      }
    } catch (error) {
      console.error('[NotificationPopup] ❌ Error setting up notifications:', error);
      console.error('[NotificationPopup] ❌ Full error:', JSON.stringify(error, null, 2));
    } finally {
      console.log('[NotificationPopup] 🔄 Setting loading to false and calling onComplete');
      setIsLoading(false);
      onComplete();
    }
  };

  const handleNotNow = () => {
    console.log('[NotificationPopup] User declined notifications');
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleNotNow}
    >
      {/* Background with Blur Effect */}
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={handleNotNow}
        />
        
        {/* Popup Content */}
        <View style={styles.popup}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔔</Text>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Enable Notifications</Text>
          
          {/* Message */}
          <Text style={styles.message}>
            Get notified when your avatar training completes and images are ready to view.
          </Text>
          
          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.allowButton}
              onPress={handleAllow}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.allowButtonText}>Setting up...</Text>
                </View>
              ) : (
                <Text style={styles.allowButtonText}>Allow</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.notNowButton}
              onPress={handleNotNow}
              disabled={isLoading}
            >
              <Text style={styles.notNowButtonText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dark overlay instead of blur
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  popup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    maxWidth: screenWidth - 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allowButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  notNowButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notNowButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '500',
  },
});