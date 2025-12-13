// src/utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // ✅ Check if running on physical device
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      console.log('Device info:', {
        isDevice: Device.isDevice,
        deviceType: Device.deviceType,
        modelName: Device.modelName,
      });
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
      console.error('❌ EAS project ID not found');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('✅ Push token obtained:', token);
    console.log('Device info:', {
      brand: Device.brand,
      model: Device.modelName,
      os: Device.osName,
      osVersion: Device.osVersion,
    });

    // ✅ Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return token;
  } catch (error: any) {
    console.error('❌ Push notification registration error:', error);
    return null;
  }
}