const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Background round bells are scheduled through expo-notifications, which only
 * uses exact alarms when canScheduleExactAlarms() is true (Android 12+);
 * otherwise it falls back to inexact alarms the OS may deliver minutes late.
 *
 * - USE_EXACT_ALARM (Android 13+): granted at install. Google Play permits it
 *   for apps whose core function is a timer; requires the Play Console
 *   permissions declaration.
 * - SCHEDULE_EXACT_ALARM capped at API 32: granted by default on Android 12/12L,
 *   where USE_EXACT_ALARM doesn't exist yet.
 */
module.exports = function withExactAlarms(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const perms = (manifest['uses-permission'] = manifest['uses-permission'] ?? []);
    const add = (name, extra = {}) => {
      if (!perms.some((p) => p.$['android:name'] === name)) {
        perms.push({ $: { 'android:name': name, ...extra } });
      }
    };
    add('android.permission.USE_EXACT_ALARM');
    add('android.permission.SCHEDULE_EXACT_ALARM', { 'android:maxSdkVersion': '32' });
    return cfg;
  });
};
