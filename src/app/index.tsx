import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTimer } from '@/timer/useTimer';
import { buildSchedule, totalDurationMs, type TimerSettings } from '@/timer/engine';
import { loadLastSettings, saveLastSettings, summarize } from '@/storage/presets';
import { addSession } from '@/storage/history';
import { TimeDisplay } from '@/components/TimeDisplay';
import { RoundDots } from '@/components/RoundDots';
import { Controls } from '@/components/Controls';
import { WorkoutComplete } from '@/components/WorkoutComplete';
import { phaseColor, colors } from '@/theme';

// Match the splash background so launch doesn't flash a different dark.
const SPLASH_BG = '#10161d';

export default function TimerScreen() {
  const [initial, setInitial] = useState<TimerSettings | null>(null);

  useEffect(() => {
    loadLastSettings().then(setInitial);
  }, []);

  if (!initial) {
    return <View style={[styles.fill, { backgroundColor: SPLASH_BG }]} />;
  }
  return <Timer initial={initial} />;
}

function Timer({ initial }: { initial: TimerSettings }) {
  const { status, state, settings, setSettings, start, pause, resume, reset, skip, getSessionSummary } =
    useTimer(initial);

  // Reload the last-chosen preset when returning from settings — only while idle,
  // so the "Workout Complete" screen persists after a session finishes.
  useFocusEffect(
    useCallback(() => {
      if (status === 'idle') {
        loadLastSettings().then((s) => setSettings(s));
      }
    }, [status, setSettings]),
  );

  // Android hardware back must not silently kill a live workout.
  const statusRef = useRef(status);
  statusRef.current = status;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = statusRef.current;
      if (s === 'running') {
        pause();
        return true; // swallow: back pauses instead of exiting
      }
      if (s === 'paused') {
        Alert.alert('End workout?', 'Your session is paused. Leave and lose it?', [
          { text: 'Keep training', style: 'cancel' },
          { text: 'End workout', style: 'destructive', onPress: () => reset() },
        ]);
        return true;
      }
      return false; // idle/done: default behavior
    });
    return () => sub.remove();
  }, [pause, reset]);

  // Log a session once when the workout finishes naturally.
  const loggedRef = useRef(false);
  useEffect(() => {
    if (status !== 'done') {
      loggedRef.current = false;
      return;
    }
    if (loggedRef.current) return;
    loggedRef.current = true;
    const plannedMs = totalDurationMs(buildSchedule(settings));
    // Log what actually happened, not the plan: skipping rounds must not
    // inflate history/stats, and finishing while backgrounded must not book
    // the workout to the reopen time.
    const summary = getSessionSummary();
    void addSession({
      id: `${Date.now()}`,
      dateISO: new Date(summary.completedAtTs).toISOString(),
      presetName: summarize(settings),
      totalMs: summary.activeMs,
      plannedMs,
      roundsCompleted: summary.roundsCompleted,
      roundsPlanned: settings.rounds,
      completed: true,
    });
  }, [status, settings, getSessionSummary]);

  // Pulsing white overlay during the final-seconds warning.
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state.isWarning && status === 'running') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.45, duration: 450, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => {
        loop.stop();
        flash.setValue(0);
      };
    }
    flash.setValue(0);
  }, [state.isWarning, status, flash]);

  if (status === 'done') {
    return (
      <WorkoutComplete
        settings={settings}
        onRepeat={() => {
          reset();
          start();
        }}
        onDone={reset}
      />
    );
  }

  const toggleSound = () => {
    const next = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(next);
    void saveLastSettings(next);
  };

  // Tap the timer area to pause / resume (buttons still work too).
  const tapToggle = () => {
    if (status === 'running') pause();
    else if (status === 'paused') resume();
  };

  const idle = status === 'idle';
  const bg = phaseColor(state.phase, state.isWarning);

  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.topBar}>
          <Pressable
            onPress={toggleSound}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Toggle sound"
          >
            <Ionicons
              name={settings.soundEnabled ? 'notifications' : 'notifications-off'}
              size={26}
              color={colors.text}
            />
          </Pressable>
          <View style={styles.topRight}>
            <Pressable
              onPress={() => router.push('/history')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="History"
              disabled={!idle}
            >
              <Ionicons name="stats-chart" size={24} color={colors.text} style={!idle && styles.disabled} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              disabled={!idle}
            >
              <Ionicons name="settings-sharp" size={24} color={colors.text} style={!idle && styles.disabled} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={styles.center}
          onPress={tapToggle}
          accessibilityRole="button"
          accessibilityLabel={status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : undefined}
        >
          <TimeDisplay
            remainingMs={state.remainingMs}
            segmentDurationMs={state.segmentDurationMs}
            totalRemainingMs={state.totalRemainingMs}
            phase={state.phase}
            round={state.round}
            totalRounds={state.totalRounds}
            nextPhase={state.nextPhase}
            nextDurationMs={state.nextDurationMs}
          />
          <View style={styles.dots}>
            <RoundDots round={state.round} totalRounds={state.totalRounds} phase={state.phase} />
          </View>
          {/* Fixed-height slot so pausing doesn't shift the whole layout. */}
          <View style={styles.pausedSlot}>
            {status === 'paused' && <Text style={styles.paused}>PAUSED — tap to resume</Text>}
          </View>
        </Pressable>

        <View style={styles.controls}>
          <Controls
            status={status}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={reset}
            onSkip={skip}
          />
        </View>
      </SafeAreaView>

      {/* Warning pulse — sits above everything but ignores touches. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: colors.flash, opacity: flash }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  topRight: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  disabled: { opacity: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { marginTop: 26 },
  pausedSlot: { height: 40, justifyContent: 'center' },
  paused: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  controls: { paddingBottom: 40, paddingHorizontal: 20 },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
