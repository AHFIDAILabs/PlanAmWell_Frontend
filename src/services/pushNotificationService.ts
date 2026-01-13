import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/App';
import { NotificationData } from '../types/backendType';

// Define notification data types
class PushNotificationService {
  private navigationRef: NavigationProp<AppStackParamList> | null = null;

  setNavigationRef(ref: NavigationProp<AppStackParamList>) {
    this.navigationRef = ref;
  }

  configure() {
    if (Platform.OS === 'android') {
      this.setupAndroidChannels();
    }
  }

  private async setupAndroidChannels() {
    try {
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

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications require a physical device');
      return null;
    }

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

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'b17d8d1f-7620-4a54-9baa-9166dc7a27ea',
    });

    console.log('✅ Push token obtained:', tokenData.data);
    return tokenData.data;
  }

handleNotificationReceived(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener((notification) => {
    // ⚠️ Cast the data manually
    const data = notification.request.content.data as NotificationData;

    // Handle incoming call deep link
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


  handleNotificationResponse(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    // ⚠️ Cast the data manually
    const data = response.notification.request.content.data as NotificationData;

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


  async getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  const response = await Notifications.getLastNotificationResponse();
  if (!response) return null;

  // ⚠️ Cast the data manually
  const data = response.notification.request.content.data as NotificationData;

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

  return response;
}

  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  async clearNotification(notificationId: string) {
    await Notifications.dismissNotificationAsync(notificationId);
  }

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
        } as NotificationData,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null,
    });
  }
}

export default new PushNotificationService();
