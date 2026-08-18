import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/App';
import { NotificationData } from '../types/backendType';

// Maps a notification action button press to what IncomingCallScreen should
// auto-run on mount — undefined for a plain tap (today's behavior: just open
// the screen and let the user choose).
function actionIdentifierToAutoAction(actionIdentifier: string): 'accept' | 'decline' | undefined {
  if (actionIdentifier === 'accept') return 'accept';
  if (actionIdentifier === 'decline') return 'decline';
  return undefined;
}

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
    if (Platform.OS === 'ios') {
      this.setupIosCallCategory();
    }
  }

  // Registers the Accept/Decline action buttons that appear directly on the
  // lock-screen notification, matched by sendIncomingCallPushNotification's
  // categoryIdentifier: 'INCOMING_CALL' (backend/src/util/sendPushNotification.ts).
  private async setupIosCallCategory() {
    try {
      // Both actions open the app — a truly silent/headless decline while the
      // app is fully killed on iOS needs a registered background task (or
      // CallKit), which is out of scope for this phase. Opening the app and
      // auto-running the decline immediately (see IncomingCallScreen's
      // autoAction handling) still saves the user the extra tap.
      await Notifications.setNotificationCategoryAsync('INCOMING_CALL', [
        {
          identifier: 'decline',
          buttonTitle: 'Decline',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'accept',
          buttonTitle: 'Accept',
          options: { opensAppToForeground: true },
        },
      ]);
      console.log('✅ iOS incoming-call notification category configured');
    } catch (error) {
      console.error('❌ Failed to setup iOS call category:', error);
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
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#D81E5B',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
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
        conversationId: data.conversationId,
        videoRequestId: data.videoRequestId,
        callType: data.callType,
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
        conversationId: data.conversationId,
        videoRequestId: data.videoRequestId,
        callType: data.callType,
        autoAction: actionIdentifierToAutoAction(response.actionIdentifier),
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
        conversationId: data.conversationId,
        videoRequestId: data.videoRequestId,
        callType: data.callType,
        autoAction: actionIdentifierToAutoAction(response.actionIdentifier),
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
