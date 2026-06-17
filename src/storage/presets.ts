import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeSettings, type TimerSettings } from '@/timer/engine';

export interface Preset {
  id: string;
  name: string;
  /** Short tag shown on the card, e.g. "12 × 3:00 / 1:00". */
  builtIn: boolean;
  settings: TimerSettings;
}

/** Built-in presets. `normalizeSettings` fills every field with safe defaults. */
export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'boxing-pro',
    name: 'Boxing — Pro',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 180, restSec: 60, rounds: 12, warningSec: 10 }),
  },
  {
    id: 'boxing-amateur',
    name: 'Boxing — Amateur',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 180, restSec: 60, rounds: 3, warningSec: 10 }),
  },
  {
    id: 'mma-regular',
    name: 'MMA — Regular',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 300, restSec: 60, rounds: 3, warningSec: 10 }),
  },
  {
    id: 'mma-championship',
    name: 'MMA — Championship',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 300, restSec: 60, rounds: 5, warningSec: 10 }),
  },
  {
    id: 'tabata',
    name: 'Tabata',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 20, restSec: 10, rounds: 8, warningSec: 3 }),
  },
  {
    id: 'hiit',
    name: 'HIIT — 45/15',
    builtIn: true,
    settings: normalizeSettings({ prepSec: 10, roundSec: 45, restSec: 15, rounds: 10, warningSec: 5 }),
  },
];

export const DEFAULT_PRESET = BUILT_IN_PRESETS[1]; // Boxing — Amateur

const CUSTOM_KEY = 'timer.customPresets.v1';
const LAST_KEY = 'timer.lastSettings.v1';

/** Load user-saved custom presets (empty array if none / on error). Settings normalized. */
export async function loadCustomPresets(): Promise<Preset[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Preset[];
    return parsed.map((p) => ({ ...p, settings: normalizeSettings(p.settings) }));
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
    return normalizeSettings(raw ? JSON.parse(raw) : DEFAULT_PRESET.settings);
  } catch {
    return DEFAULT_PRESET.settings;
  }
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

/** "12 × 3:00 / 1:00" style summary, with warm-up/cool-down markers and "varied" rounds. */
export function summarize(s: TimerSettings): string {
  const varied = s.roundDurations.length > 0 && new Set(s.roundDurations.slice(0, s.rounds)).size > 1;
  const work = varied ? 'varied' : fmt(s.roundSec);
  const rest = s.restSec > 0 ? ` / ${fmt(s.restSec)}` : '';
  const wu = s.warmupSec > 0 ? `WU ${fmt(s.warmupSec)} · ` : '';
  const cd = s.cooldownSec > 0 ? ` · CD ${fmt(s.cooldownSec)}` : '';
  return `${wu}${s.rounds} × ${work}${rest}${cd}`;
}
