import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import type { SoundType } from '@/timer/engine';

/**
 * In-app sound playback. Sounds are mixed *over* whatever the user is already
 * playing (music / YouTube) rather than interrupting it, and the audio session is
 * kept alive in the background so bells still fire while the app is minimized.
 */

const SOURCES: Record<SoundType, number> = {
  bell: require('@/assets/sounds/bell.wav'),
  endBell: require('@/assets/sounds/end-bell.wav'),
  finalBell: require('@/assets/sounds/final-bell.wav'),
  warning: require('@/assets/sounds/warning.wav'),
  beep: require('@/assets/sounds/beep.wav'),
};

let players: Partial<Record<SoundType, AudioPlayer>> = {};
let initialized = false;

/** Configure the background-capable, non-interrupting audio session and preload players. */
export async function initAudio(): Promise<void> {
  if (initialized) return;
  initialized = true;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // Mix with (don't stop) the user's music; duck it slightly while a bell plays.
    interruptionMode: 'duckOthers',
  });

  for (const key of Object.keys(SOURCES) as SoundType[]) {
    players[key] = createAudioPlayer(SOURCES[key]);
  }
}

/** Play a one-shot sound from the start. No-op if muted via `enabled`. */
export function playSound(sound: SoundType, enabled: boolean): void {
  if (!enabled) return;
  const player = players[sound];
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // playback failures shouldn't crash the timer
  }
}

/** Release native players (call on unmount). */
export function releaseAudio(): void {
  for (const p of Object.values(players)) p?.remove();
  players = {};
  initialized = false;
}
