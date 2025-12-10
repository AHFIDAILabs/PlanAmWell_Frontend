import { ExpoConfig } from '@expo/config-types';

const config: ExpoConfig = {
  name: 'PlanAmWell',
  slug: 'PlanAmWell',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/images/logo1.png',
  userInterfaceStyle: 'light',
  newArchEnabled: false,
  plugins: [
    'expo-asset',
    [
      'expo-notifications',
      {
        icon: './src/assets/images/logo1.png',
        color: '#D81E5B',
      },
    ],
  ],
  splash: {
    image: './src/assets/images/logo1.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.planamwell.bundle',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/images/logo1.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.planamwell.bundle',
    permissions: ['NOTIFICATIONS', 'VIBRATE'],
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'b17d8d1f-7620-4a54-9baa-9166dc7a27ea',
    },
  },
};

export default config;