import { ExpoConfig } from '@expo/config-types';

const config: ExpoConfig = {
  name: 'PlanAmWell',
  slug: 'PlanAmWell',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'planamwell',
  runtimeVersion: { policy: 'appVersion' },
  icon: './src/assets/plan.png',
  userInterfaceStyle: 'light',
   updates: {
    url: `https://u.expo.dev/b17d8d1f-7620-4a54-9baa-9166dc7a27ea`,
  },
  plugins: [
    'expo-asset',
    [
      'expo-notifications',
      {
        icon: './src/assets/plan.png',
        color: '#D81E5B',
      },
    ],
    './src/plugins/withAgora',
  ],
  splash: {
    image: './src/assets/plan.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    bundleIdentifier: 'com.planamwell.bundle',
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: 'Access camera for video calls',
      NSMicrophoneUsageDescription: 'Access microphone for video calls',
      // ✅ Required for universal links
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['planamwell'],
        },
      ],
      AssociatedDomains: [
        'applinks:planamwell.com', // ✅ iOS Universal Links
      ],
    },
  },
  android: {
    package: 'com.planamwell.bundle',
    googleServicesFile: './google-services.json',
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
    adaptiveIcon: {
      foregroundImage: './src/assets/plan.png',
      backgroundColor: '#ffffff',
    },
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          {
            scheme: 'https',
            host: 'planamwell.com',
            pathPrefix: '/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: { favicon: './src/assets/plan.png' },
  extra: {
    eas: { projectId: 'b17d8d1f-7620-4a54-9baa-9166dc7a27ea' },
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
