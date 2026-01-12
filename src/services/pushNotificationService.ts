// services/pushNotificationService.ts - Integrated with your app
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class PushNotificationService {
  private navigationRef: any = null;

  /**
   * Set navigation reference for deep linking
   */
  setNavigationRef(ref: any) {
    this.navigationRef = ref;
  }

  /**
   * Configure how notifications are handled
   */
  configure() {
    // Configure Android notification channels
    if (Platform.OS === 'android') {
      this.setupAndroidChannels();
    }
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels() {
    try {
      // High-priority channel for incoming calls
      await Notifications.setNotificationChannelAsync('incoming-calls', {
        name: 'Incoming Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
      });

      // Normal channel for regular notifications
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#D81E5B',
        sound: 'default',
      });

      console.log('✅ Android notification channels configured');
    } catch (error) {
      console.error('❌ Failed to setup Android channels:', error);
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Must use physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications require a physical device');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'b17d8d1f-7620-4a54-9baa-9166dc7a27ea', // Your project ID from app.config.ts
      });

      const token = tokenData.data;
      console.log('✅ Push token obtained:', token);

      return token;
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Handle notification received while app is in FOREGROUND
   */
  handleNotificationReceived(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.log('📬 Notification received (foreground):', data);

      // For incoming calls, navigate to IncomingCallScreen
      if (data.type === 'incoming_call' && this.navigationRef) {
        this.navigationRef.navigate('IncomingCall', {
          appointmentId: data.appointmentId,
          callerName: data.callerName,
          callerImage: data.callerImage,
          callerType: data.callerType,
          channelName: data.channelName,
        });
      }

      callback(notification);
    });
  }

  /**
   * Handle notification TAPPED by user
   */
  handleNotificationResponse(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('👆 Notification tapped:', data);

      // For incoming calls, navigate to IncomingCallScreen
      if (data.type === 'incoming_call' && this.navigationRef) {
        this.navigationRef.navigate('IncomingCall', {
          appointmentId: data.appointmentId,
          callerName: data.callerName,
          callerImage: data.callerImage,
          callerType: data.callerType,
          channelName: data.channelName,
        });
      }

      callback(response);
    });
  }

  /**
   * Handle notification when app was CLOSED and opened via notification
   */
  async getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
    const response = await Notifications.getLastNotificationResponse();
    
    if (response) {
      const data = response.notification.request.content.data;
      console.log('📱 App opened via notification:', data);

      // For incoming calls, navigate to IncomingCallScreen
      if (data.type === 'incoming_call' && this.navigationRef) {
        setTimeout(() => {
          this.navigationRef?.navigate('IncomingCall', {
            appointmentId: data.appointmentId,
            callerName: data.callerName,
            callerImage: data.callerImage,
            callerType: data.callerType,
            channelName: data.channelName,
          });
        }, 1000);
      }
    }

    return response;
  }

  /**
   * Clear all delivered notifications
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Clear specific notification
   */
  async clearNotification(notificationId: string) {
    await Notifications.dismissNotificationAsync(notificationId);
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📞 Incoming Call (Test)',
        body: 'Dr. Test is calling you',
        data: {
          type: 'incoming_call',
          appointmentId: 'test-123',
          callerName: 'Dr. Test',
          callerType: 'Doctor',
          channelName: 'test-channel',
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Show immediately
    });
  }
}

export default new PushNotificationService();