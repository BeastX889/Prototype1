import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeStats, type SessionRecord, type Stats } from '@/storage/stats';

export { computeStats };
export type { SessionRecord, Stats };

const KEY = 'timer.history.v1';
const MAX = 200;

/** Load saved sessions, newest first (empty on error). */
export async function loadHistory(): Promise<SessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

/** Prepend a session and cap the log. */
export async function addSession(rec: SessionRecord): Promise<SessionRecord[]> {
  const existing = await loadHistory();
  const next = [rec, ...existing].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
