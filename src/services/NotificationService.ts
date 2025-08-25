import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { APIService } from './APIService';

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
    console.log('[NotificationService] 🚀 Initializing...');

    try {
      // Only run on physical devices
      if (!Device.isDevice) {
        console.log('[NotificationService] ❌ Notifications only work on physical devices');
        return false;
      }

      console.log('[NotificationService] 📱 Running on physical device, proceeding...');

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('[NotificationService] 🔍 Existing permission status:', existingStatus);
      let finalStatus = existingStatus;

      // If not already granted, request permissions
      if (existingStatus !== 'granted') {
        console.log('[NotificationService] 📋 Requesting permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
        console.log('[NotificationService] 📋 Permission request result:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] ❌ Notification permission not granted, final status:', finalStatus);
        return false;
      }

      console.log('[NotificationService] ✅ Permission granted, getting push token...');

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync();
      
      this.expoPushToken = tokenData.data;
      console.log('[NotificationService] 🎯 Push token obtained:', this.expoPushToken);
      console.log('[NotificationService] 🎯 Token length:', this.expoPushToken?.length);

      // Register token with backend
      console.log('[NotificationService] 🌐 Starting token registration with backend...');
      await this.registerTokenWithBackend();

      // Set up notification listeners
      console.log('[NotificationService] 👂 Setting up notification listeners...');
      this.setupListeners();

      console.log('[NotificationService] ✅ Initialization completed successfully!');
      return true;
    } catch (error) {
      console.error('[NotificationService] ❌ Initialization failed:', error);
      console.error('[NotificationService] ❌ Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Register device token with backend
   */
  private async registerTokenWithBackend(): Promise<void> {
    if (!this.expoPushToken) {
      console.log('[NotificationService] ❌ No push token to register');
      return;
    }

    try {
      // Use 'expo' as platform since we're using Expo push tokens
      const platform = 'expo';
      console.log('[NotificationService] 🚀 Calling APIService.registerDeviceToken with token:', this.expoPushToken.substring(0, 30) + '...');
      console.log('[NotificationService] 🚀 Platform:', platform);
      
      await APIService.registerDeviceToken(this.expoPushToken, platform);
      
      console.log('[NotificationService] ✅ Token registered with backend successfully');
    } catch (error) {
      console.error('[NotificationService] ❌ Failed to register token with backend:', error);
      console.error('[NotificationService] ❌ Error details:', JSON.stringify(error, null, 2));
      console.error('[NotificationService] ❌ Error response:', error?.response?.data);
      console.error('[NotificationService] ❌ Error status:', error?.response?.status);
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