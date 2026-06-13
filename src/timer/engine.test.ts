import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchedule,
  buildSoundEvents,
  computeState,
  formatTime,
  totalDurationMs,
  type TimerSettings,
} from './engine.ts';

const boxing: TimerSettings = {
  prepSec: 10,
  roundSec: 180,
  restSec: 60,
  rounds: 3,
  warningSec: 10,
  soundEnabled: true,
};

test('buildSchedule: prep + (work, rest) x rounds with no trailing rest', () => {
  const s = buildSchedule(boxing);
  // prep, work1, rest1, work2, rest2, work3  => 6 segments
  assert.equal(s.length, 6);
  assert.deepEqual(
    s.map((x) => x.phase),
    ['prep', 'work', 'rest', 'work', 'rest', 'work'],
  );
  // last segment is work (no rest after final round)
  assert.equal(s[s.length - 1].phase, 'work');
  // total = 10 + 3*180 + 2*60 = 670s
  assert.equal(totalDurationMs(s), 670 * 1000);
});

test('buildSchedule: zero prep and zero rest are omitted', () => {
  const s = buildSchedule({ ...boxing, prepSec: 0, restSec: 0 });
  assert.deepEqual(s.map((x) => x.phase), ['work', 'work', 'work']);
});

test('computeState: walks prep -> work -> rest -> done', () => {
  const s = buildSchedule(boxing);

  // 5s in => prep, upcoming round 1
  let st = computeState(s, boxing, 5_000);
  assert.equal(st.phase, 'prep');
  assert.equal(st.remainingMs, 5_000);

  // 10s in => exactly start of round 1 work
  st = computeState(s, boxing, 10_000);
  assert.equal(st.phase, 'work');
  assert.equal(st.round, 1);
  assert.equal(st.remainingMs, 180_000);
  // ring + next-phase data for the UI
  assert.equal(st.segmentDurationMs, 180_000);
  assert.equal(st.nextPhase, 'rest');
  assert.equal(st.nextDurationMs, 60_000);

  // during round 1, final 10s => warning flag
  st = computeState(s, boxing, 10_000 + 175_000);
  assert.equal(st.phase, 'work');
  assert.equal(st.isWarning, true);

  // just after round 1 ends => rest of round 1
  st = computeState(s, boxing, 10_000 + 180_000 + 1_000);
  assert.equal(st.phase, 'rest');
  assert.equal(st.round, 1);
  assert.equal(st.isWarning, false);

  // last work round has no next segment
  st = computeState(s, boxing, 10_000 + 180_000 + 60_000 + 180_000 + 60_000 + 1_000);
  assert.equal(st.phase, 'work');
  assert.equal(st.round, 3);
  assert.equal(st.nextPhase, null);
  assert.equal(st.nextDurationMs, 0);

  // past the end => done
  st = computeState(s, boxing, 999_000_000);
  assert.equal(st.phase, 'done');
  assert.equal(st.done, true);
  assert.equal(st.remainingMs, 0);
  assert.equal(st.nextPhase, null);
});

test('buildSoundEvents: bell at each round start, warning, end bell, prep beeps', () => {
  const s = buildSchedule(boxing);
  const ev = buildSoundEvents(s, boxing);

  // 3 prep countdown beeps at 7s, 8s, 9s
  const beeps = ev.filter((e) => e.sound === 'beep' && e.atMs < 10_000);
  assert.deepEqual(beeps.map((e) => e.atMs).sort((a, b) => a - b), [7_000, 8_000, 9_000]);

  // bell at start of round 1 (10s)
  assert.ok(ev.some((e) => e.sound === 'bell' && e.atMs === 10_000));

  // warning 10s before round 1 ends (10s + 180s - 10s = 180s)
  assert.ok(ev.some((e) => e.sound === 'warning' && e.atMs === 180_000));

  // end bell at end of round 1 (190s) — a normal round
  assert.ok(ev.some((e) => e.sound === 'endBell' && e.atMs === 190_000));

  // the LAST round (round 3, total 670s) ends with the distinct finalBell, not endBell
  assert.ok(ev.some((e) => e.sound === 'finalBell' && e.atMs === 670_000));
  assert.ok(!ev.some((e) => e.sound === 'endBell' && e.atMs === 670_000));

  // events are sorted ascending
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].atMs >= ev[i - 1].atMs);
});

test('formatTime: rounds up to whole seconds', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(1), '0:01');
  assert.equal(formatTime(59_400), '1:00');
  assert.equal(formatTime(180_000), '3:00');
  assert.equal(formatTime(65_000), '1:05');
});
