/**
 * Pure, dependency-free timer engine for the boxing/MMA timer.
 *
 * Everything here is a pure function of its inputs (no Date.now(), no globals),
 * which keeps it trivially unit-testable and lets the rest of the app derive the
 * live state from a single saved start-timestamp. That timestamp approach is what
 * makes the timer stay accurate even if the OS suspends the JS runtime while the
 * app is backgrounded.
 */

export type Phase = 'prep' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'done';
export type SoundType = 'bell' | 'endBell' | 'finalBell' | 'warning' | 'beep';

export interface TimerSettings {
  /** Get-ready countdown before round 1 (seconds). 0 = skip. */
  prepSec: number;
  /** Work / round length (seconds). */
  roundSec: number;
  /** Rest length between rounds (seconds). 0 = no rest. */
  restSec: number;
  /** Number of work rounds. */
  rounds: number;
  /** Warning fires this many seconds before a round ends. 0 = no warning. */
  warningSec: number;
  /** Master sound toggle. */
  soundEnabled: boolean;
  /** Optional warm-up block before round 1 (seconds). 0 = none. */
  warmupSec: number;
  /** Optional cool-down block after the last round (seconds). 0 = none. */
  cooldownSec: number;
  /** Per-round work durations (seconds), index = round-1. Empty/missing => use roundSec. */
  roundDurations: number[];
  /** Spoken round/phase announcements (TTS). */
  voiceEnabled: boolean;
  /** Call out boxing combos during work rounds (requires voiceEnabled). */
  comboCaller: boolean;
  /** Seconds between combo calls. */
  comboIntervalSec: number;
  /** How bells interact with other audio: mix over, duck, or pause it (solo). */
  audioMode: 'mix' | 'duck' | 'solo';
  /** Bell playback volume, 0–1. */
  volume: number;
}

export interface Segment {
  phase: 'prep' | 'warmup' | 'work' | 'rest' | 'cooldown';
  /** 1-based round this segment belongs to (prep/warmup count toward round 1). */
  round: number;
  durationMs: number;
  /** Offset from timer start (ms). */
  startMs: number;
  /** Offset from timer start (ms). */
  endMs: number;
}

export interface SoundEvent {
  /** Offset from timer start (ms). */
  atMs: number;
  sound: SoundType;
  /** Human-readable label, used as the notification body when backgrounded. */
  label: string;
}

export interface SpeechEvent {
  /** Offset from timer start (ms). */
  atMs: number;
  text: string;
  /** announcements preempt speech; combos defer to anything already speaking. */
  kind: 'announce' | 'combo';
}

export interface TimerState {
  phase: Phase;
  /** Current round (1-based). During prep this is the upcoming round (1). */
  round: number;
  totalRounds: number;
  /** Time left in the current segment (ms), rounded up to whole seconds elsewhere. */
  remainingMs: number;
  /** Total length of the current segment (ms); use with remainingMs for the ring fraction. */
  segmentDurationMs: number;
  /** Time left in the whole session (ms). */
  totalRemainingMs: number;
  /** Index into the schedule array; -1 when done. */
  segmentIndex: number;
  /** Phase of the upcoming segment, or null if this is the last one. */
  nextPhase: Phase | null;
  /** Length of the upcoming segment (ms); 0 if there is none. */
  nextDurationMs: number;
  /** True during a work segment within the final `warningSec` seconds. */
  isWarning: boolean;
  done: boolean;
}

const SECOND = 1000;

/** Boxing combos called out by the combo caller. Edit freely. */
export const COMBOS: string[] = [
  'Jab',
  'Jab, cross',
  'Jab, cross, hook',
  'Double jab, cross',
  'Cross, hook',
  'Jab, cross, hook, cross',
  'Jab, jab, cross',
  'Hook, cross, hook',
  'Jab, body cross',
  'Uppercut, hook',
  'Jab, cross, slip',
  'One, two',
  'One, two, three',
  'Jab, cross, roll, hook',
];

/** Deterministic combo selection (testable; cycles through the list). */
export function comboForIndex(i: number): string {
  const n = COMBOS.length;
  return COMBOS[((i % n) + n) % n];
}

const num = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d;

/**
 * Coerce any loaded/partial object into a complete, valid TimerSettings.
 * This is the backward-compatibility keystone: settings saved before new fields
 * existed (or any corrupt data) are filled with safe defaults. Route every load
 * site through this.
 */
export function normalizeSettings(raw: unknown): TimerSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const roundSec = Math.max(1, Math.floor(num(r.roundSec, 180)));
  const warningSec = Math.max(0, Math.floor(num(r.warningSec, 10)));
  return {
    prepSec: Math.max(0, Math.floor(num(r.prepSec, 10))),
    roundSec,
    restSec: Math.max(0, Math.floor(num(r.restSec, 60))),
    rounds: Math.max(1, Math.floor(num(r.rounds, 3))),
    warningSec: Math.min(warningSec, roundSec),
    soundEnabled: r.soundEnabled !== false,
    warmupSec: Math.max(0, Math.floor(num(r.warmupSec, 0))),
    cooldownSec: Math.max(0, Math.floor(num(r.cooldownSec, 0))),
    roundDurations: Array.isArray(r.roundDurations)
      ? r.roundDurations.map((x) =>
          typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : roundSec,
        )
      : [],
    voiceEnabled: r.voiceEnabled === true,
    comboCaller: r.comboCaller === true,
    comboIntervalSec: Math.max(5, Math.floor(num(r.comboIntervalSec, 20))),
    audioMode: r.audioMode === 'mix' || r.audioMode === 'solo' ? r.audioMode : 'duck',
    volume: Math.max(0, Math.min(1, num(r.volume, 1))),
  };
}

/**
 * Build the ordered list of segments:
 *   [prep] -> [warmup] -> (work, rest) x rounds (no trailing rest) -> [cooldown]
 * Per-round work length comes from `roundDurations[r-1]` when present, else `roundSec`.
 */
export function buildSchedule(settings: TimerSettings): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  const push = (phase: Segment['phase'], round: number, durationMs: number) => {
    if (durationMs <= 0) return;
    segments.push({ phase, round, durationMs, startMs: cursor, endMs: cursor + durationMs });
    cursor += durationMs;
  };

  push('prep', 1, settings.prepSec * SECOND);
  push('warmup', 1, settings.warmupSec * SECOND);

  for (let r = 1; r <= settings.rounds; r++) {
    const workSec = settings.roundDurations[r - 1] ?? settings.roundSec;
    push('work', r, workSec * SECOND);
    if (r < settings.rounds) {
      push('rest', r, settings.restSec * SECOND);
    }
  }

  push('cooldown', settings.rounds, settings.cooldownSec * SECOND);

  return segments;
}

export function totalDurationMs(schedule: Segment[]): number {
  return schedule.length === 0 ? 0 : schedule[schedule.length - 1].endMs;
}

/**
 * Derive the live timer state from elapsed milliseconds since start.
 * `elapsedMs` is expected to already exclude any paused time.
 */
export function computeState(
  schedule: Segment[],
  settings: TimerSettings,
  elapsedMs: number,
): TimerState {
  const total = totalDurationMs(schedule);
  const clamped = Math.max(0, elapsedMs);

  if (schedule.length === 0 || clamped >= total) {
    return {
      phase: 'done',
      round: settings.rounds,
      totalRounds: settings.rounds,
      remainingMs: 0,
      segmentDurationMs: 0,
      totalRemainingMs: 0,
      segmentIndex: -1,
      nextPhase: null,
      nextDurationMs: 0,
      isWarning: false,
      done: true,
    };
  }

  const idx = schedule.findIndex((s) => clamped >= s.startMs && clamped < s.endMs);
  const seg = schedule[idx];
  const next = schedule[idx + 1];
  const remainingMs = seg.endMs - clamped;
  const isWarning =
    seg.phase === 'work' &&
    settings.warningSec > 0 &&
    remainingMs <= settings.warningSec * SECOND;

  return {
    phase: seg.phase,
    round: seg.round,
    totalRounds: settings.rounds,
    remainingMs,
    segmentDurationMs: seg.durationMs,
    totalRemainingMs: total - clamped,
    segmentIndex: idx,
    nextPhase: next ? next.phase : null,
    nextDurationMs: next ? next.durationMs : 0,
    isWarning,
    done: false,
  };
}

/**
 * Build the absolute timeline of sound events. Used both to play sounds in-app
 * (matched against the tick) and to pre-schedule local notifications so alerts
 * still fire while the app is backgrounded.
 */
export function buildSoundEvents(schedule: Segment[], settings: TimerSettings): SoundEvent[] {
  const events: SoundEvent[] = [];
  const end = totalDurationMs(schedule);

  for (const seg of schedule) {
    if (seg.phase === 'work') {
      events.push({ atMs: seg.startMs, sound: 'bell', label: `Round ${seg.round} — fight!` });

      const warnAt = seg.endMs - settings.warningSec * SECOND;
      if (settings.warningSec > 0 && warnAt > seg.startMs) {
        events.push({
          atMs: warnAt,
          sound: 'warning',
          label: `${settings.warningSec}s left in round ${seg.round}`,
        });
      }

      // Per-round end bell, except the very last segment end (covered by finalBell below).
      if (seg.endMs < end) {
        events.push({ atMs: seg.endMs, sound: 'endBell', label: `End of round ${seg.round}` });
      }
    } else if (seg.phase === 'rest' || seg.phase === 'prep' || seg.phase === 'warmup') {
      // Countdown beeps for the final 3 seconds.
      const label =
        seg.phase === 'prep'
          ? 'Get ready…'
          : seg.phase === 'warmup'
            ? 'Warm-up — round 1 next'
            : `Rest — round ${seg.round + 1} next`;
      for (let t = 3; t >= 1; t--) {
        const atMs = seg.endMs - t * SECOND;
        if (atMs > seg.startMs) events.push({ atMs, sound: 'beep', label });
      }
    }
  }

  // Distinct "workout complete" bell at the very end (last work end, or cooldown end).
  if (end > 0) {
    events.push({ atMs: end, sound: 'finalBell', label: 'Workout complete!' });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

/**
 * Build the absolute timeline of spoken cues (TTS). Announcements at phase
 * transitions, plus combo calls during work rounds. Returns [] unless voice is on.
 */
export function buildSpeechEvents(schedule: Segment[], settings: TimerSettings): SpeechEvent[] {
  if (!settings.voiceEnabled) return [];

  const events: SpeechEvent[] = [];
  const end = totalDurationMs(schedule);
  let comboIdx = 0;

  for (const seg of schedule) {
    if (seg.phase === 'work') {
      events.push({ atMs: seg.startMs, text: `Round ${seg.round}, fight!`, kind: 'announce' });

      const warnAt = seg.endMs - settings.warningSec * SECOND;
      if (settings.warningSec > 0 && warnAt > seg.startMs) {
        events.push({ atMs: warnAt, text: `${settings.warningSec} seconds`, kind: 'announce' });
      }

      if (settings.comboCaller) {
        const interval = Math.max(5, settings.comboIntervalSec) * SECOND;
        // Stop calling combos before the round-end warning / bell so they don't collide.
        const guard = Math.max(settings.warningSec, 3) * SECOND;
        for (let t = seg.startMs + interval; t < seg.endMs - guard; t += interval) {
          events.push({ atMs: t, text: comboForIndex(comboIdx++), kind: 'combo' });
        }
      }
    } else {
      const text =
        seg.phase === 'prep'
          ? 'Get ready'
          : seg.phase === 'warmup'
            ? 'Warm up'
            : seg.phase === 'rest'
              ? 'Rest'
              : 'Cool down';
      events.push({ atMs: seg.startMs, text, kind: 'announce' });
    }
  }

  if (end > 0) {
    events.push({ atMs: end, text: 'Workout complete', kind: 'announce' });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}

/** Format milliseconds as M:SS, rounding up so the last second reads "0:01" not "0:00". */
export function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / SECOND));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
