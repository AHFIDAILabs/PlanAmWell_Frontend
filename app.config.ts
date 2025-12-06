import { ExpoConfig } from '@expo/config-types';

const config: ExpoConfig = {
  name: 'PlanAmWell',
  slug: 'PlanAmWell',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/images/logo1.png',
  userInterfaceStyle: 'light',
  newArchEnabled: false,        // ← TypeScript ensures this is a real boolean
  plugins: ['expo-asset'],
  splash: {
    image: './src/assets/images/logo1.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',

  },
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/images/logo1.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    // predictiveBackGestureEnabled: false, // optional, can keep as boolean
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