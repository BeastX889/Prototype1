import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { SoundType } from '@/timer/engine';

/**
 * Vibration feedback that fires alongside the timer's sounds, so a round change
 * is felt even with the phone in a pocket. No-ops on web (no haptics there) and
 * never throws — feedback must never interfere with the timer.
 */
export function buzz(sound: SoundType): void {
  if (Platform.OS === 'web') return;
  try {
    switch (sound) {
      case 'bell':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'endBell':
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'beep':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // ignore — haptics are best-effort
  }
}
