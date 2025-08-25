import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { APIService } from './APIService';
import { Logger } from '../utils/Logger';

// Simple event emitter for React Native
class SimpleEventEmitter {
  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {};

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    
    // Return subscription object with remove method
    return {
      remove: () => this.off(event, listener)
    };
  }

  off(event: string, listener: (...args: any[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private eventEmitter: SimpleEventEmitter;

  private constructor() {
    this.eventEmitter = new SimpleEventEmitter();
  }

  // Event emitter methods using custom SimpleEventEmitter
  public on(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.off(event, listener);
  }

  public emit(event: string, data: any) {
    this.eventEmitter.emit(event, data);
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service and request permissions
   */
  public async initialize(): Promise<boolean> {
    Logger.notificationLog.info('🚀 Initializing notification service...');

    try {
      // Only run on physical devices
      if (!Device.isDevice) {
        Logger.notificationLog.warn('❌ Notifications only work on physical devices');
        return false;
      }

      Logger.notificationLog.info('📱 Running on physical device, proceeding...');

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      Logger.notificationLog.info('🔍 Existing permission status', { status: existingStatus });
      let finalStatus = existingStatus;

      // If not already granted, request permissions
      if (existingStatus !== 'granted') {
        Logger.notificationLog.info('📋 Requesting permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        Logger.notificationLog.info('📋 Permission request result', { status: finalStatus });
      }

      if (finalStatus !== 'granted') {
        Logger.notificationLog.error('❌ Notification permission not granted', { finalStatus });
        return false;
      }

      Logger.notificationLog.info('✅ Permission granted, getting push token...');

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      
      this.expoPushToken = tokenData.data;
      Logger.notificationLog.info('🎯 Push token obtained', { 
        token: this.expoPushToken?.substring(0, 30) + '...', 
        tokenLength: this.expoPushToken?.length,
        fullToken: this.expoPushToken // Full token for debugging
      });

      // Register token with backend
      Logger.notificationLog.info('🌐 Starting token registration with backend...');
      await this.registerTokenWithBackend();

      // Set up notification listeners
      Logger.notificationLog.info('👂 Setting up notification listeners...');
      this.setupListeners();

      Logger.notificationLog.info('✅ Initialization completed successfully!');
      return true;
    } catch (error: any) {
      Logger.notificationLog.error('❌ Initialization failed', { 
        error: error.message,
        stack: error.stack,
        fullError: error
      });
      return false;
    }
  }

  /**
   * Register device token with backend
   */
  private async registerTokenWithBackend(): Promise<void> {
    if (!this.expoPushToken) {
      Logger.notificationLog.error('❌ No push token to register');
      return;
    }

    try {
      // Use 'expo' as platform since we're using Expo push tokens
      const platform = 'expo';
      Logger.notificationLog.info('🚀 Calling APIService.registerDeviceToken', { 
        tokenPreview: this.expoPushToken.substring(0, 30) + '...', 
        platform,
        tokenLength: this.expoPushToken.length
      });
      
      const startTime = Date.now();
      await APIService.registerDeviceToken(this.expoPushToken, platform);
      const duration = Date.now() - startTime;
      
      Logger.notificationLog.info('✅ Token registered with backend successfully', { 
        duration: `${duration}ms`,
        platform 
      });
    } catch (error: any) {
      Logger.notificationLog.error('❌ Failed to register token with backend', {
        error: error.message,
        response: error?.response?.data,
        status: error?.response?.status,
        fullError: error
      });
      throw error; // Re-throw to see if this affects the flow
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NotificationService] 📱 Notification received:', notification);
      
      // Handle different notification types
      this.handleNotificationReceived(notification);
    });

    // Listener for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[NotificationService] 👆 Notification tapped:', response);
      
      // Handle notification tap
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received while app is running
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const { title, body, data } = notification.request.content;
    console.log('[NotificationService] Processing notification:', { title, body, data });

    // Handle training completion notifications
    if (data?.type === 'training_completed') {
      this.handleTrainingCompletedNotification(data);
    }

    // Handle generation completion notifications  
    if (data?.type === 'generation_completed') {
      this.handleGenerationCompletedNotification(data);
    }
    
    // Handle generation failure notifications
    if (data?.type === 'generation_failed') {
      this.handleGenerationFailedNotification(data);
    }
    
    // Handle NSFW content notifications
    if (data?.type === 'generation_nsfw') {
      this.handleGenerationNSFWNotification(data);
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { data } = response.notification.request.content;
    console.log('[NotificationService] Handling notification tap with data:', data);

    // Navigate to appropriate screen based on notification type
    if (data?.type === 'training_completed') {
      // Navigate to Training tab
      // This would require navigation service integration
    }

    if (data?.type === 'generation_completed') {
      // Navigate to Gallery tab
      // This would require navigation service integration  
    }
  }

  /**
   * Handle training completion notification
   */
  private handleTrainingCompletedNotification(data: any): void {
    console.log('[NotificationService] 🎯 Training completed for model:', data.modelId);
    
    // Emit event for TrainingContext to refresh models
    this.emit('trainingCompleted', {
      modelId: data.modelId,
      modelName: data.modelName
    });
  }

  /**
   * Handle generation completion notification
   */
  private handleGenerationCompletedNotification(data: any): void {
    console.log('[NotificationService] 🎨 Generation completed:', data.generationId, 'with', data.imageCount, 'images');
    
    // Emit event for GalleryContext to refresh images
    this.emit('generationCompleted', {
      generationId: data.generationId,
      imageCount: data.imageCount,
      presetName: data.presetName
    });
    
    // Also emit event to remove skeleton generation from GenerationContext
    this.emit('removeSkeletonGeneration', {
      generationId: data.generationId
    });
  }

  private handleGenerationFailedNotification(data: any): void {
    console.log('[NotificationService] ❌ Generation failed:', data.generationId, 'reason:', data.errorMessage);
    
    // Emit event to mark skeleton generation as failed
    this.emit('generationFailed', {
      generationId: data.generationId,
      errorMessage: data.errorMessage || 'Generation failed. Please try again.'
    });
  }

  private handleGenerationNSFWNotification(data: any): void {
    console.log('[NotificationService] 🚫 Generation flagged as NSFW:', data.generationId);
    
    // Emit event to mark skeleton generation as NSFW (similar to failed but different message)
    this.emit('generationFailed', {
      generationId: data.generationId,
      errorMessage: 'Content flagged as inappropriate. Please try a different prompt.',
      isNSFW: true
    });
  }

  /**
   * Schedule a local notification (for testing)
   */
  public async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delaySeconds: number = 0
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } as any : null,
    });

    console.log('[NotificationService] 📅 Local notification scheduled:', notificationId);
    return notificationId;
  }

  /**
   * Simulate a generation completion notification (for testing)
   */
  public simulateGenerationCompletion(generationId: string, imageCount: number = 4, presetName: string = 'Test Preset'): void {
    console.log('[NotificationService] 🧪 Simulating generation completion for:', generationId);
    
    // Directly call the handler to simulate notification
    this.handleGenerationCompletedNotification({
      generationId,
      imageCount,
      presetName
    });
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[NotificationService] ❌ Notification cancelled:', notificationId);
  }

  /**
   * Get current push token
   */
  public getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  public async isEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Clean up listeners (call when app is closing)
   */
  public cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default NotificationService.getInstance();