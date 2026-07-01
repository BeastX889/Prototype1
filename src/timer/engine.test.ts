import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSchedule,
  buildSoundEvents,
  buildSpeechEvents,
  comboForIndex,
  computeState,
  COMBOS,
  formatTime,
  normalizeSettings,
  totalDurationMs,
} from './engine.ts';

const boxing = normalizeSettings({
  prepSec: 10,
  roundSec: 180,
  restSec: 60,
  rounds: 3,
  warningSec: 10,
});

test('buildSchedule: prep + (work, rest) x rounds with no trailing rest', () => {
  const s = buildSchedule(boxing);
  assert.equal(s.length, 6);
  assert.deepEqual(
    s.map((x) => x.phase),
    ['prep', 'work', 'rest', 'work', 'rest', 'work'],
  );
  assert.equal(s[s.length - 1].phase, 'work');
  assert.equal(totalDurationMs(s), 670 * 1000);
});

test('buildSchedule: zero prep and zero rest are omitted', () => {
  const s = buildSchedule(normalizeSettings({ ...boxing, prepSec: 0, restSec: 0 }));
  assert.deepEqual(s.map((x) => x.phase), ['work', 'work', 'work']);
});

test('buildSchedule: warm-up and cool-down blocks', () => {
  const s = buildSchedule(
    normalizeSettings({ prepSec: 10, warmupSec: 120, roundSec: 180, restSec: 60, rounds: 2, cooldownSec: 90 }),
  );
  assert.deepEqual(
    s.map((x) => x.phase),
    ['prep', 'warmup', 'work', 'rest', 'work', 'cooldown'],
  );
  // 10 + 120 + 180 + 60 + 180 + 90 = 640s
  assert.equal(totalDurationMs(s), 640 * 1000);
});

test('buildSchedule: per-round custom durations (short array falls back to roundSec)', () => {
  const s = buildSchedule(
    normalizeSettings({ prepSec: 0, roundSec: 180, restSec: 0, rounds: 3, roundDurations: [120, 300] }),
  );
  assert.deepEqual(s.map((x) => x.durationMs), [120_000, 300_000, 180_000]);
});

test('normalizeSettings: fills defaults from a v1-shaped object', () => {
  const n = normalizeSettings({ prepSec: 10, roundSec: 180, restSec: 60, rounds: 3, warningSec: 10, soundEnabled: true });
  assert.equal(n.warmupSec, 0);
  assert.equal(n.cooldownSec, 0);
  assert.deepEqual(n.roundDurations, []);
  assert.equal(n.voiceEnabled, false);
  assert.equal(n.comboCaller, false);
  assert.equal(n.comboIntervalSec, 20);
  assert.equal(n.audioMode, 'duck');
  assert.equal(n.volume, 1);
});

test('normalizeSettings: sanitizes garbage roundDurations to roundSec', () => {
  const n = normalizeSettings({ roundSec: 180, roundDurations: ['x', -5, 90, NaN] });
  assert.deepEqual(n.roundDurations, [180, 180, 90, 180]);
});

test('computeState: walks prep -> work -> rest -> done', () => {
  const s = buildSchedule(boxing);

  let st = computeState(s, boxing, 5_000);
  assert.equal(st.phase, 'prep');
  assert.equal(st.remainingMs, 5_000);

  st = computeState(s, boxing, 10_000);
  assert.equal(st.phase, 'work');
  assert.equal(st.round, 1);
  assert.equal(st.remainingMs, 180_000);
  assert.equal(st.segmentDurationMs, 180_000);
  assert.equal(st.nextPhase, 'rest');
  assert.equal(st.nextDurationMs, 60_000);

  st = computeState(s, boxing, 10_000 + 175_000);
  assert.equal(st.isWarning, true);

  st = computeState(s, boxing, 10_000 + 180_000 + 1_000);
  assert.equal(st.phase, 'rest');
  assert.equal(st.isWarning, false);

  st = computeState(s, boxing, 999_000_000);
  assert.equal(st.done, true);
  assert.equal(st.remainingMs, 0);
});

test('buildSoundEvents: round start bells, warning, end bells, finalBell at session end', () => {
  const s = buildSchedule(boxing);
  const ev = buildSoundEvents(s, boxing);

  // prep countdown beeps at 7,8,9s
  const beeps = ev.filter((e) => e.sound === 'beep' && e.atMs < 10_000);
  assert.deepEqual(beeps.map((e) => e.atMs).sort((a, b) => a - b), [7_000, 8_000, 9_000]);

  assert.ok(ev.some((e) => e.sound === 'bell' && e.atMs === 10_000));
  assert.ok(ev.some((e) => e.sound === 'warning' && e.atMs === 180_000));
  // round 1 end (not the last) => endBell
  assert.ok(ev.some((e) => e.sound === 'endBell' && e.atMs === 190_000));
  // session end (670s) => finalBell, and no endBell there
  assert.ok(ev.some((e) => e.sound === 'finalBell' && e.atMs === 670_000));
  assert.ok(!ev.some((e) => e.sound === 'endBell' && e.atMs === 670_000));

  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].atMs >= ev[i - 1].atMs);
});

test('buildSoundEvents: finalBell fires at cool-down end when present', () => {
  const s = buildSchedule(
    normalizeSettings({ prepSec: 0, roundSec: 180, restSec: 0, rounds: 1, cooldownSec: 60, warningSec: 0 }),
  );
  const ev = buildSoundEvents(s, normalizeSettings({ prepSec: 0, roundSec: 180, restSec: 0, rounds: 1, cooldownSec: 60, warningSec: 0 }));
  const end = totalDurationMs(s); // 240s
  assert.ok(ev.some((e) => e.sound === 'finalBell' && e.atMs === end));
  // the work round ends at 180s — should NOT be a finalBell, and not the workout end
  assert.ok(!ev.some((e) => e.sound === 'finalBell' && e.atMs === 180_000));
});

test('buildSpeechEvents: empty when voice disabled', () => {
  assert.deepEqual(buildSpeechEvents(buildSchedule(boxing), boxing), []);
});

test('buildSpeechEvents: announcements at transitions', () => {
  const v = normalizeSettings({ ...boxing, voiceEnabled: true });
  const ev = buildSpeechEvents(buildSchedule(v), v);
  assert.ok(ev.some((e) => e.kind === 'announce' && e.atMs === 10_000 && /Round 1/.test(e.text)));
  assert.ok(ev.some((e) => e.kind === 'announce' && /seconds/.test(e.text)));
  assert.ok(ev.some((e) => e.text === 'Workout complete'));
});

test('buildSpeechEvents: combos spaced by interval, none in the end-guard window', () => {
  const v = normalizeSettings({
    prepSec: 0,
    roundSec: 60,
    restSec: 0,
    rounds: 1,
    warningSec: 10,
    voiceEnabled: true,
    comboCaller: true,
    comboIntervalSec: 15,
  });
  const ev = buildSpeechEvents(buildSchedule(v), v);
  const combos = ev.filter((e) => e.kind === 'combo');
  // round 0..60s, interval 15s starting at 15s, guard = last 10s => 15,30,45 (not 60, not within last 10s)
  assert.deepEqual(combos.map((e) => e.atMs), [15_000, 30_000, 45_000]);
  // deterministic text from COMBOS
  assert.equal(combos[0].text, comboForIndex(0));
  assert.ok(COMBOS.includes(combos[0].text));
});

test('formatTime: rounds up to whole seconds', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(1), '0:01');
  assert.equal(formatTime(59_400), '1:00');
  assert.equal(formatTime(65_000), '1:05');
});
