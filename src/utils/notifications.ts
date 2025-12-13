// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // ✅ Check if running on a platform that supports push notifications
    if (Platform.OS === 'web') {
      console.warn('⚠️ Push notifications are not supported on web');
      return null;
    }

    // ✅ Check for existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permission not granted');
      return null;
    }

    // ✅ Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('❌ EAS project ID not found in app config');
      console.log('Available config:', Constants.expoConfig?.extra);
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('✅ Push token obtained:', token);
    console.log('Platform info:', {
      os: Platform.OS,
      version: Platform.Version,
    });

    // ✅ Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D81E5B',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Optional: Create additional channels for different notification types
      await Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#D81E5B',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return token;
  } catch (error: any) {
    console.error('❌ Push notification registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Configure how notifications are handled when app is in foreground
 */
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Get device push token info (for debugging)
 */
export async function getDeviceInfo() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      permissionStatus: status,
      hasProjectId: !!projectId,
      projectId: projectId || 'not configured',
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}