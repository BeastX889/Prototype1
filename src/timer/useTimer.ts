import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  buildSchedule,
  buildSoundEvents,
  buildSpeechEvents,
  computeState,
  totalDurationMs,
  type TimerSettings,
  type TimerState,
} from './engine';
import { initAudio, playSound, releaseAudio, setOutputMode, setVolume } from '@/audio/sounds';
import { say, stopSpeech } from '@/audio/speech';
import { buzz } from '@/haptics';
import {
  cancelSoundEvents,
  initNotifications,
  scheduleSoundEvents,
} from '@/notifications/schedule';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

const TICK_MS = 200;
const KEEP_AWAKE_TAG = 'timer-running';

/** Truthful record of what actually happened in a finished session. */
export interface SessionSummary {
  /** Real active (unpaused, unskipped) wall-clock time. */
  activeMs: number;
  /** Work rounds whose end was reached without being skipped. */
  roundsCompleted: number;
  /** Wall-clock ms timestamp of the moment the session actually finished. */
  completedAtTs: number;
}

export interface UseTimer {
  status: TimerStatus;
  state: TimerState;
  settings: TimerSettings;
  setSettings: (s: TimerSettings) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
  /** Valid once status === 'done'. */
  getSessionSummary: () => SessionSummary;
}

export function useTimer(initialSettings: TimerSettings): UseTimer {
  const [settings, setSettingsState] = useState(initialSettings);
  const [status, setStatus] = useState<TimerStatus>('idle');

  const schedule = useMemo(() => buildSchedule(settings), [settings]);
  const soundEvents = useMemo(() => buildSoundEvents(schedule, settings), [schedule, settings]);
  const speechEvents = useMemo(() => buildSpeechEvents(schedule, settings), [schedule, settings]);

  const [state, setState] = useState<TimerState>(() => computeState(schedule, settings, 0));

  // Timing refs (mutated outside render so the timestamp survives re-renders).
  const startTsRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const lastElapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<TimerStatus>('idle');
  statusRef.current = status;

  // Honest-session tracking: real active time and skipped rounds. skip() shifts
  // startTsRef, so the main clock can't be used for "time actually trained".
  const activeAccumRef = useRef(0);
  const runSegStartRef = useRef(0);
  const skippedWorkRef = useRef(0);

  // Initialise audio once. Cold start is by definition not mid-session, so
  // sweep any bells left scheduled by a previous run that was killed while
  // backgrounded (cancelling needs no permission). The notification-permission
  // ask itself is deferred to the first START — better context for the user.
  useEffect(() => {
    void initAudio(settings.audioMode, settings.volume);
    void cancelSoundEvents();
    return () => {
      releaseAudio();
      stopSpeech();
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, []);

  // Re-apply audio output mode / volume when the user changes them.
  useEffect(() => {
    setOutputMode(settings.audioMode);
    setVolume(settings.volume);
  }, [settings.audioMode, settings.volume]);

  const elapsedNow = useCallback(
    () => Date.now() - startTsRef.current - pausedAccumRef.current,
    [],
  );

  // Session-clock elapsed that is also correct while paused (excludes the
  // in-progress pause segment, which pausedAccumRef doesn't contain yet).
  const elapsedActive = useCallback(() => {
    const live = statusRef.current === 'paused' ? Date.now() - pauseStartedRef.current : 0;
    return elapsedNow() - live;
  }, [elapsedNow]);

  const playDue = useCallback(
    (prevEl: number, curEl: number) => {
      if (settings.soundEnabled) {
        for (const ev of soundEvents) {
          if (ev.atMs > prevEl && ev.atMs <= curEl) {
            playSound(ev.sound, true);
            buzz(ev.sound);
          }
        }
      }
      // Voice is independent of the sound toggle.
      if (settings.voiceEnabled) {
        for (const ev of speechEvents) {
          if (ev.atMs > prevEl && ev.atMs <= curEl) {
            say(ev.text, { interrupt: ev.kind === 'announce' });
          }
        }
      }
    },
    [settings.soundEnabled, settings.voiceEnabled, soundEvents, speechEvents],
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const el = elapsedNow();
    playDue(lastElapsedRef.current, el);
    lastElapsedRef.current = el;
    const next = computeState(schedule, settings, el);
    setState(next);
    if (next.done) {
      activeAccumRef.current += Date.now() - runSegStartRef.current;
      stopInterval();
      setStatus('done');
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
  }, [elapsedNow, playDue, schedule, settings, stopInterval]);

  // The interval must always call the LATEST tick (settings can change
  // mid-run, e.g. the mute toggle) — a fixed setInterval(tick) would keep
  // dispatching a stale closure.
  const tickRef = useRef(tick);
  tickRef.current = tick;

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => tickRef.current(), TICK_MS);
  }, [stopInterval]);

  const notifInitRef = useRef(false);

  const start = useCallback(() => {
    if (!notifInitRef.current) {
      notifInitRef.current = true;
      void initNotifications(); // permission ask on first start, not app launch
    }
    startTsRef.current = Date.now();
    pausedAccumRef.current = 0;
    // -1 (not 0) so events at t=0 — the opening bell when prep is 0, and the
    // "Get ready" announcement — fall inside the first (prev, cur] window.
    lastElapsedRef.current = -1;
    activeAccumRef.current = 0;
    runSegStartRef.current = Date.now();
    skippedWorkRef.current = 0;
    setStatus('running');
    setState(computeState(schedule, settings, 0));
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    startInterval();
  }, [schedule, settings, startInterval]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    pauseStartedRef.current = Date.now();
    activeAccumRef.current += Date.now() - runSegStartRef.current;
    stopInterval();
    setStatus('paused');
    void cancelSoundEvents();
    stopSpeech();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [stopInterval]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    pausedAccumRef.current += Date.now() - pauseStartedRef.current;
    runSegStartRef.current = Date.now();
    setStatus('running');
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    startInterval();
  }, [startInterval]);

  const reset = useCallback(() => {
    stopInterval();
    startTsRef.current = 0;
    pausedAccumRef.current = 0;
    lastElapsedRef.current = 0;
    activeAccumRef.current = 0;
    skippedWorkRef.current = 0;
    setStatus('idle');
    setState(computeState(schedule, settings, 0));
    void cancelSoundEvents();
    stopSpeech();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [schedule, settings, stopInterval]);

  // Jump to the end of the current segment (skip the round / rest).
  const skip = useCallback(() => {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') return;
    // Use the pause-aware clock: while paused, elapsedNow() is inflated by the
    // live pause and would compute a wrong (even negative) jump.
    const el = elapsedActive();
    const seg = schedule[state.segmentIndex];
    if (!seg) return;
    const jump = seg.endMs - el;
    startTsRef.current -= jump; // advance "now" forward within the session
    if (statusRef.current === 'paused') {
      // Rebase the in-progress pause so resume lands exactly on the boundary.
      pausedAccumRef.current += Date.now() - pauseStartedRef.current;
      pauseStartedRef.current = Date.now();
    }
    if (seg.phase === 'work') skippedWorkRef.current += 1;
    // Fire the boundary cues (end bell / next-round announcement) exactly once.
    playDue(seg.endMs - 1, seg.endMs);
    lastElapsedRef.current = seg.endMs;
    const next = computeState(schedule, settings, seg.endMs);
    setState(next);
    if (next.done) {
      if (statusRef.current === 'running') {
        activeAccumRef.current += Date.now() - runSegStartRef.current;
      }
      stopInterval();
      setStatus('done');
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
  }, [elapsedActive, playDue, schedule, settings, state.segmentIndex, stopInterval]);

  // Foreground <-> background: swap between in-app ticking and pre-scheduled notifications.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (statusRef.current !== 'running') return;
      if (next === 'background' || next === 'inactive') {
        stopInterval();
        stopSpeech(); // TTS doesn't run backgrounded; notifications cover transitions
        const el = elapsedNow();
        if (settings.soundEnabled) void scheduleSoundEvents(soundEvents, el);
      } else if (next === 'active') {
        void cancelSoundEvents();
        // Skip replaying any sounds that fired (via notification) while away.
        lastElapsedRef.current = elapsedNow();
        startInterval();
      }
    });
    return () => sub.remove();
  }, [elapsedNow, settings.soundEnabled, soundEvents, startInterval, stopInterval]);

  // Changing settings while idle updates the displayed starting time.
  const setSettings = useCallback(
    (s: TimerSettings) => {
      setSettingsState(s);
      if (statusRef.current === 'idle' || statusRef.current === 'done') {
        setStatus('idle');
        setState(computeState(buildSchedule(s), s, 0));
      }
    },
    [],
  );

  const getSessionSummary = useCallback((): SessionSummary => {
    const plannedMs = totalDurationMs(schedule);
    return {
      activeMs: activeAccumRef.current,
      roundsCompleted: Math.max(0, settings.rounds - skippedWorkRef.current),
      // elapsed hit plannedMs at completion, so this holds even after skips
      // shifted startTsRef — and stays correct if 'done' was detected late
      // (e.g. on the first tick after returning from background).
      completedAtTs: startTsRef.current + pausedAccumRef.current + plannedMs,
    };
  }, [schedule, settings.rounds]);

  // Clean up interval on unmount.
  useEffect(() => () => stopInterval(), [stopInterval]);

  return useMemo(
    () => ({ status, state, settings, setSettings, start, pause, resume, reset, skip, getSessionSummary }),
    [status, state, settings, setSettings, start, pause, resume, reset, skip, getSessionSummary],
  );
}

export { totalDurationMs };
