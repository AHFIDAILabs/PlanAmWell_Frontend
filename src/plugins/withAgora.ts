// plugins/withAgora.ts
import { 
  ConfigPlugin, 
  withPlugins, 
  withAndroidManifest, 
  withInfoPlist,
  AndroidConfig 
} from '@expo/config-plugins';

// Add Android permissions
const withAgoraAndroid: ConfigPlugin = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.INTERNET',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.BLUETOOTH',
      'android.permission.ACCESS_WIFI_STATE',
    ];

    permissions.forEach((permission) => {
      const exists = manifest['uses-permission']?.some(
        (p: any) => p.$['android:name'] === permission
      );
      
      if (!exists) {
        manifest['uses-permission']!.push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });
};

// Add iOS permissions
const withAgoraIOS: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults.NSCameraUsageDescription = 
      config.modResults.NSCameraUsageDescription || 
      'This app needs camera access for video calls with your doctor.';
    
    config.modResults.NSMicrophoneUsageDescription = 
      config.modResults.NSMicrophoneUsageDescription || 
      'This app needs microphone access for video calls with your doctor.';

    return config;
  });
};

const withAgora: ConfigPlugin = (config) => {
  return withPlugins(config, [withAgoraAndroid, withAgoraIOS]);
};

export default withAgora;