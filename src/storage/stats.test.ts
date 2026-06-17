import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, type SessionRecord } from './stats.ts';

// Build a completed record dated at local noon on y-m-d (round-trips through local TZ).
function rec(y: number, m: number, d: number, opts: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `${y}-${m}-${d}-${Math.random()}`,
    dateISO: new Date(y, m - 1, d, 12, 0, 0).toISOString(),
    presetName: 'Boxing',
    totalMs: 60_000,
    plannedMs: 60_000,
    roundsCompleted: 3,
    roundsPlanned: 3,
    completed: true,
    ...opts,
  };
}

test('computeStats: totals over completed sessions only', () => {
  const now = new Date(2026, 5, 13, 18);
  const s = computeStats(
    [rec(2026, 6, 13), rec(2026, 6, 13), rec(2026, 6, 10, { completed: false, roundsCompleted: 1 })],
    now,
  );
  assert.equal(s.totalSessions, 2);
  assert.equal(s.totalRounds, 6);
  assert.equal(s.totalMs, 120_000);
});

test('computeStats: streak counts consecutive local days back from today', () => {
  const now = new Date(2026, 5, 13, 18); // June 13 2026
  const s = computeStats([rec(2026, 6, 13), rec(2026, 6, 12), rec(2026, 6, 11)], now);
  assert.equal(s.currentStreakDays, 3);
});

test('computeStats: streak breaks on a gap', () => {
  const now = new Date(2026, 5, 13, 18);
  const s = computeStats([rec(2026, 6, 13), rec(2026, 6, 11)], now); // missing the 12th
  assert.equal(s.currentStreakDays, 1);
});

test('computeStats: streak still live if last session was yesterday', () => {
  const now = new Date(2026, 5, 13, 9); // nothing logged today yet
  const s = computeStats([rec(2026, 6, 12), rec(2026, 6, 11)], now);
  assert.equal(s.currentStreakDays, 2);
});

test('computeStats: zero streak when newest completed session is older than yesterday', () => {
  const now = new Date(2026, 5, 13, 9);
  const s = computeStats([rec(2026, 6, 10)], now);
  assert.equal(s.currentStreakDays, 0);
});

test('computeStats: empty history', () => {
  const s = computeStats([], new Date(2026, 5, 13));
  assert.deepEqual(s, { totalSessions: 0, totalMs: 0, totalRounds: 0, currentStreakDays: 0 });
});
