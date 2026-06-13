/**
 * Pure, dependency-free timer engine for the boxing/MMA timer.
 *
 * Everything here is a pure function of its inputs (no Date.now(), no globals),
 * which keeps it trivially unit-testable and lets the rest of the app derive the
 * live state from a single saved start-timestamp. That timestamp approach is what
 * makes the timer stay accurate even if the OS suspends the JS runtime while the
 * app is backgrounded.
 */

export type Phase = 'prep' | 'work' | 'rest' | 'done';
export type SoundType = 'bell' | 'endBell' | 'warning' | 'beep';

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
}

export interface Segment {
  phase: 'prep' | 'work' | 'rest';
  /** 1-based round this segment belongs to (prep counts toward round 1). */
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

/** Build the ordered list of segments: [prep] -> (work, rest) x rounds (no trailing rest). */
export function buildSchedule(settings: TimerSettings): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  const push = (phase: Segment['phase'], round: number, durationMs: number) => {
    if (durationMs <= 0) return;
    segments.push({ phase, round, durationMs, startMs: cursor, endMs: cursor + durationMs });
    cursor += durationMs;
  };

  push('prep', 1, settings.prepSec * SECOND);

  for (let r = 1; r <= settings.rounds; r++) {
    push('work', r, settings.roundSec * SECOND);
    if (r < settings.rounds) {
      push('rest', r, settings.restSec * SECOND);
    }
  }

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
 * Build the absolute timeline of sound events for a schedule. Used both to play
 * sounds in-app (matched against the tick) and to pre-schedule local
 * notifications so alerts still fire while the app is backgrounded.
 */
export function buildSoundEvents(schedule: Segment[], settings: TimerSettings): SoundEvent[] {
  const events: SoundEvent[] = [];

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

      events.push({ atMs: seg.endMs, sound: 'endBell', label: `End of round ${seg.round}` });
    } else if (seg.phase === 'rest' || seg.phase === 'prep') {
      // Countdown beeps for the final 3 seconds of prep / rest.
      const label = seg.phase === 'prep' ? 'Get ready…' : `Rest — round ${seg.round + 1} next`;
      for (let t = 3; t >= 1; t--) {
        const atMs = seg.endMs - t * SECOND;
        if (atMs > seg.startMs) events.push({ atMs, sound: 'beep', label });
      }
    }
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
