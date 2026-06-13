import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SoundEvent, SoundType } from '@/timer/engine';

/**
 * Pre-scheduled local notifications are the backbone of background operation.
 * When the app goes to the background we queue one notification per upcoming
 * sound event; the OS fires them (with sound) at the right instant even if our
 * JS runtime is frozen. On returning to the foreground we cancel them all and
 * let in-app playback take over again.
 *
 * Custom sounds: on iOS the bundled wav filename is passed via `content.sound`;
 * on Android (8+) the sound comes from a per-sound notification channel.
 */

const SOUND_FILES: Record<SoundType, string> = {
  bell: 'bell.wav',
  endBell: 'end-bell.wav',
  finalBell: 'final-bell.wav',
  warning: 'warning.wav',
  beep: 'beep.wav',
};

const CHANNELS: Record<SoundType, string> = {
  bell: 'timer-bell',
  endBell: 'timer-end-bell',
  finalBell: 'timer-final-bell',
  warning: 'timer-warning',
  beep: 'timer-beep',
};

let configured = false;

// Show banner + play sound even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: false,
    shouldSetBadge: false,
  }),
});

/** Request permission and (on Android) create one channel per sound. Returns granted. */
export async function initNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false; // notifications/background unused on web
  const { status } = await Notifications.getPermissionsAsync();
  let granted = status === 'granted';
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.status === 'granted';
  }

  if (Platform.OS === 'android' && !configured) {
    for (const sound of Object.keys(CHANNELS) as SoundType[]) {
      await Notifications.setNotificationChannelAsync(CHANNELS[sound], {
        name: `Timer ${sound}`,
        importance: Notifications.AndroidImportance.HIGH,
        sound: SOUND_FILES[sound],
        vibrationPattern: [0, 200],
        bypassDnd: false,
      });
    }
  }
  configured = true;
  return granted;
}

/**
 * Schedule notifications for every sound event still in the future.
 * @param events full sound timeline (offsets from session start)
 * @param elapsedMs how far into the session we are right now
 */
export async function scheduleSoundEvents(events: SoundEvent[], elapsedMs: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelSoundEvents();

  for (const ev of events) {
    const seconds = (ev.atMs - elapsedMs) / 1000;
    if (seconds <= 0) continue; // already passed

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Boxing / MMA Timer',
        body: ev.label,
        sound: SOUND_FILES[ev.sound],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: CHANNELS[ev.sound],
      },
    });
  }
}

/** Cancel all pending timer notifications (call on resume / pause / reset). */
export async function cancelSoundEvents(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
