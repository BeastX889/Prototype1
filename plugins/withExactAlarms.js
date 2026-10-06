const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Background round bells are scheduled through expo-notifications, which only
 * uses exact alarms when canScheduleExactAlarms() is true (Android 12+);
 * otherwise it falls back to inexact alarms the OS may deliver minutes late.
 *
 * - SCHEDULE_EXACT_ALARM: granted by default on Android 12/13. On Android 14+
 *   new installs start without it; Setup has a button that opens the
 *   "Alarms & reminders" screen so the user can allow it.
 * - USE_EXACT_ALARM is deliberately NOT used: Google Play only allows it for
 *   alarm-clock and calendar apps.
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
    add('android.permission.SCHEDULE_EXACT_ALARM');
    return cfg;
  });
};
