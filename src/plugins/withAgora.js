// plugins/withAgora.js
const { withPlugins, withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

// Add Android permissions
const withAgoraAndroid = (config) => {
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
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });
};

// Add iOS permissions
const withAgoraIOS = (config) => {
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

module.exports = (config) => {
  return withPlugins(config, [withAgoraAndroid, withAgoraIOS]);
};