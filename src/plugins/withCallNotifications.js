// plugins/withCallNotifications.js
//
// Android manifest additions notifee's full-screen incoming-call pattern
// needs (asForegroundService + fullScreenAction): permissions to show a
// full-screen intent over the lock screen, run a phone-call-type foreground
// service, and keep the device awake/unlock the screen for the ring.
// See: https://notifee.app/react-native/docs/android/behaviour#full-screen
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
  'android.permission.WAKE_LOCK',
  'android.permission.DISABLE_KEYGUARD',
  'android.permission.POST_NOTIFICATIONS',
];

const withCallNotifications = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    PERMISSIONS.forEach((permission) => {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // `tools:replace` is required here — notifee's own library manifest
    // already declares this service with its default "shortService" type
    // (3-minute cap), and without `tools:replace` the manifest merger
    // errors out on the conflicting foregroundServiceType instead of
    // applying ours.
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Foreground service type must be declared explicitly for Android 14+
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) application.service = [];

      const serviceName = 'app.notifee.core.ForegroundService';
      const existing = application.service.find(
        (s) => s.$['android:name'] === serviceName
      );

      const serviceAttrs = {
        'android:name': serviceName,
        'android:foregroundServiceType': 'phoneCall',
        'android:exported': 'false',
        'tools:replace': 'android:foregroundServiceType',
      };

      if (existing) {
        Object.assign(existing.$, serviceAttrs);
      } else {
        application.service.push({ $: serviceAttrs });
      }
    }

    return config;
  });
};

module.exports = withCallNotifications;
