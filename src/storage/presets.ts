import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TimerSettings } from '@/timer/engine';

export interface Preset {
  id: string;
  name: string;
  /** Short tag shown on the card, e.g. "12 × 3:00 / 1:00". */
  builtIn: boolean;
  settings: TimerSettings;
}

const baseSound = { warningSec: 10, soundEnabled: true } as const;

/** Built-in presets covering common boxing / MMA / interval formats. */
export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'boxing-pro',
    name: 'Boxing — Pro',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 180, restSec: 60, rounds: 12, ...baseSound },
  },
  {
    id: 'boxing-amateur',
    name: 'Boxing — Amateur',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 180, restSec: 60, rounds: 3, ...baseSound },
  },
  {
    id: 'mma-regular',
    name: 'MMA — Regular',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 300, restSec: 60, rounds: 3, ...baseSound },
  },
  {
    id: 'mma-championship',
    name: 'MMA — Championship',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 300, restSec: 60, rounds: 5, ...baseSound },
  },
  {
    id: 'tabata',
    name: 'Tabata',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 20, restSec: 10, rounds: 8, warningSec: 3, soundEnabled: true },
  },
  {
    id: 'hiit',
    name: 'HIIT — 45/15',
    builtIn: true,
    settings: { prepSec: 10, roundSec: 45, restSec: 15, rounds: 10, warningSec: 5, soundEnabled: true },
  },
];

export const DEFAULT_PRESET = BUILT_IN_PRESETS[1]; // Boxing — Amateur

const CUSTOM_KEY = 'timer.customPresets.v1';
const LAST_KEY = 'timer.lastSettings.v1';

/** Load user-saved custom presets (empty array if none / on error). */
export async function loadCustomPresets(): Promise<Preset[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

/** Persist a custom preset (replaces an existing one with the same id). */
export async function saveCustomPreset(preset: Preset): Promise<Preset[]> {
  const existing = await loadCustomPresets();
  const next = [...existing.filter((p) => p.id !== preset.id), preset];
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

export async function deleteCustomPreset(id: string): Promise<Preset[]> {
  const existing = await loadCustomPresets();
  const next = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

/** Remember the last-used settings so the app reopens where you left off. */
export async function saveLastSettings(settings: TimerSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_KEY, JSON.stringify(settings));
  } catch {
    // best-effort; ignore write failures
  }
}

export async function loadLastSettings(): Promise<TimerSettings> {
  try {
    const raw = await AsyncStorage.getItem(LAST_KEY);
    return raw ? (JSON.parse(raw) as TimerSettings) : DEFAULT_PRESET.settings;
  } catch {
    return DEFAULT_PRESET.settings;
  }
}

/** "12 × 3:00 / 1:00" style summary for a preset card. */
export function summarize(s: TimerSettings): string {
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  const rest = s.restSec > 0 ? ` / ${fmt(s.restSec)}` : '';
  return `${s.rounds} × ${fmt(s.roundSec)}${rest}`;
}
