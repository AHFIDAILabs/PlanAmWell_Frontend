// app.config.ts
import { ExpoConfig } from '@expo/config-types';
import path from 'path';

const config: ExpoConfig = {
  name: 'PlanAmWell',
  slug: 'PlanAmWell',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/images/logo1.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  plugins: [
    'expo-asset',
    [
      'expo-notifications',
      {
        icon: './src/assets/images/logo1.png',
        color: '#D81E5B',
      },
    ],
    // 🔹 Use absolute path
    path.resolve(__dirname, './plugins/withAgora.js'),
  ],
  splash: {
    image: './src/assets/images/logo1.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.planamwell.bundle',
    infoPlist: {
      NSCameraUsageDescription: 'This app needs access to your camera for video calls.',
      NSMicrophoneUsageDescription: 'This app needs access to your microphone for video calls.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/images/logo1.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.planamwell.bundle',
    permissions: [
      'NOTIFICATIONS',
      'VIBRATE',
      'CAMERA',
      'RECORD_AUDIO',
      'INTERNET',
      'MODIFY_AUDIO_SETTINGS',
      'ACCESS_NETWORK_STATE',
      'BLUETOOTH',
      'ACCESS_WIFI_STATE',
    ],
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'b17d8d1f-7620-4a54-9baa-9166dc7a27ea',
    },
    serverUrl: process.env.EXPO_PUBLIC_SERVER_URL,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
    openAIKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    whisperKey: process.env.EXPO_PUBLIC_WHISPER_API_KEY,
    agoraAppId: process.env.EXPO_PUBLIC_AGORA_APP_ID,
    agoraAppCertificate: process.env.EXPO_PUBLIC_AGORA_APP_CERTIFICATE,
  },
};

export default config;