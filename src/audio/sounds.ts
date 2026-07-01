import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type InterruptionMode,
} from 'expo-audio';
import type { SoundType } from '@/timer/engine';

/**
 * In-app sound playback. The audio session is kept alive in the background so
 * bells still fire while the app is minimized. How bells interact with the
 * user's own music is configurable (mix / duck / solo) to solve the common
 * "I can't hear the bell over Spotify" complaint.
 */

export type AudioMode = 'mix' | 'duck' | 'solo';

const INTERRUPTION: Record<AudioMode, InterruptionMode> = {
  mix: 'mixWithOthers', // play over music at full volume, no ducking
  duck: 'duckOthers', // briefly lower the music while the bell plays
  solo: 'doNotMix', // pause the user's music for the bell
};

const SOURCES: Record<SoundType, number> = {
  bell: require('@/assets/sounds/bell.wav'),
  endBell: require('@/assets/sounds/end-bell.wav'),
  finalBell: require('@/assets/sounds/final-bell.wav'),
  warning: require('@/assets/sounds/warning.wav'),
  beep: require('@/assets/sounds/beep.wav'),
};

let players: Partial<Record<SoundType, AudioPlayer>> = {};
let initialized = false;
let currentVolume = 1;

async function applyMode(mode: AudioMode): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: INTERRUPTION[mode],
  });
}

/** Configure the background-capable audio session and preload players. */
export async function initAudio(mode: AudioMode = 'duck', volume = 1): Promise<void> {
  if (initialized) return;
  initialized = true;
  currentVolume = volume;
  await applyMode(mode);
  for (const key of Object.keys(SOURCES) as SoundType[]) {
    const player = createAudioPlayer(SOURCES[key]);
    player.volume = volume;
    players[key] = player;
  }
}

/** Change how bells interact with other audio (mix / duck / solo). */
export function setOutputMode(mode: AudioMode): void {
  void applyMode(mode).catch(() => {});
}

/** Set playback volume (0–1) for all bells. */
export function setVolume(volume: number): void {
  currentVolume = Math.max(0, Math.min(1, volume));
  for (const p of Object.values(players)) {
    if (p) p.volume = currentVolume;
  }
}

/** Play a one-shot sound from the start. No-op if muted via `enabled`. */
export function playSound(sound: SoundType, enabled: boolean): void {
  if (!enabled) return;
  const player = players[sound];
  if (!player) return;
  try {
    player.volume = currentVolume;
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
