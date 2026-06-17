/** Pure session-history types and stats (no AsyncStorage import, so it's node-testable). */

export interface SessionRecord {
  id: string;
  /** ISO timestamp of completion. */
  dateISO: string;
  presetName: string;
  /** Actual elapsed time of the session. */
  totalMs: number;
  /** Planned total duration of the schedule. */
  plannedMs: number;
  roundsCompleted: number;
  roundsPlanned: number;
  /** True for a naturally-finished workout (counts toward stats/streak). */
  completed: boolean;
}

export interface Stats {
  totalSessions: number;
  totalMs: number;
  totalRounds: number;
  currentStreakDays: number;
}

/** Local-time YYYY-MM-DD bucket (NOT UTC — streaks must respect the user's day). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Stats over completed sessions only. Streak = consecutive local days with ≥1
 * completed session, counting back from today (or yesterday if nothing today yet).
 */
export function computeStats(records: SessionRecord[], now: Date = new Date()): Stats {
  const completed = records.filter((r) => r.completed);
  const totalSessions = completed.length;
  const totalMs = completed.reduce((a, r) => a + r.totalMs, 0);
  const totalRounds = completed.reduce((a, r) => a + r.roundsCompleted, 0);

  const days = new Set(completed.map((r) => ymd(new Date(r.dateISO))));
  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(ymd(cursor))) {
    // No session today — a streak can still be "live" if yesterday had one.
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(ymd(cursor))) {
      return { totalSessions, totalMs, totalRounds, currentStreakDays: 0 };
    }
  }
  while (days.has(ymd(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { totalSessions, totalMs, totalRounds, currentStreakDays: streak };
}
