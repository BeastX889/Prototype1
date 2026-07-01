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

  // Initialise audio + notification permissions once.
  useEffect(() => {
    void initAudio(settings.audioMode, settings.volume);
    void initNotifications();
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
      stopInterval();
      setStatus('done');
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
  }, [elapsedNow, playDue, schedule, settings, stopInterval]);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(tick, TICK_MS);
  }, [stopInterval, tick]);

  const start = useCallback(() => {
    startTsRef.current = Date.now();
    pausedAccumRef.current = 0;
    lastElapsedRef.current = 0;
    setStatus('running');
    setState(computeState(schedule, settings, 0));
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    startInterval();
  }, [schedule, settings, startInterval]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    pauseStartedRef.current = Date.now();
    stopInterval();
    setStatus('paused');
    void cancelSoundEvents();
    stopSpeech();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [stopInterval]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    pausedAccumRef.current += Date.now() - pauseStartedRef.current;
    setStatus('running');
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    startInterval();
  }, [startInterval]);

  const reset = useCallback(() => {
    stopInterval();
    startTsRef.current = 0;
    pausedAccumRef.current = 0;
    lastElapsedRef.current = 0;
    setStatus('idle');
    setState(computeState(schedule, settings, 0));
    void cancelSoundEvents();
    stopSpeech();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  }, [schedule, settings, stopInterval]);

  // Jump to the end of the current segment (skip the round / rest).
  const skip = useCallback(() => {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') return;
    const el = elapsedNow();
    const seg = schedule[state.segmentIndex];
    if (!seg) return;
    const jump = seg.endMs - el;
    startTsRef.current -= jump; // advance "now" forward within the session
    lastElapsedRef.current = seg.endMs;
    const next = computeState(schedule, settings, seg.endMs);
    setState(next);
    if (next.done) {
      stopInterval();
      setStatus('done');
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }
  }, [elapsedNow, schedule, settings, state.segmentIndex, stopInterval]);

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

  // Clean up interval on unmount.
  useEffect(() => () => stopInterval(), [stopInterval]);

  return useMemo(
    () => ({ status, state, settings, setSettings, start, pause, resume, reset, skip }),
    [status, state, settings, setSettings, start, pause, resume, reset, skip],
  );
}

export { totalDurationMs };
