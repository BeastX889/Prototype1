import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTimer } from '@/timer/useTimer';
import type { TimerSettings } from '@/timer/engine';
import { loadLastSettings, saveLastSettings } from '@/storage/presets';
import { TimeDisplay } from '@/components/TimeDisplay';
import { Controls } from '@/components/Controls';
import { phaseColor, colors } from '@/theme';

export default function TimerScreen() {
  const [initial, setInitial] = useState<TimerSettings | null>(null);

  useEffect(() => {
    loadLastSettings().then(setInitial);
  }, []);

  if (!initial) {
    return <View style={[styles.fill, { backgroundColor: colors.surface }]} />;
  }
  return <Timer initial={initial} />;
}

function Timer({ initial }: { initial: TimerSettings }) {
  const { status, state, settings, setSettings, start, pause, resume, reset, skip } =
    useTimer(initial);

  // Reload the last-chosen preset when returning from the settings screen (idle only).
  useFocusEffect(
    useCallback(() => {
      if (status === 'idle' || status === 'done') {
        loadLastSettings().then((s) => setSettings(s));
      }
    }, [status, setSettings]),
  );

  const toggleSound = () => {
    const next = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(next);
    void saveLastSettings(next);
  };

  const bg = phaseColor(state.phase, state.isWarning);

  return (
    <View style={[styles.fill, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.topBar}>
          <Pressable onPress={toggleSound} hitSlop={12} accessibilityLabel="Toggle sound">
            <Text style={styles.icon}>{settings.soundEnabled ? '🔔' : '🔕'}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            accessibilityLabel="Open settings"
            disabled={status === 'running'}
          >
            <Text style={[styles.icon, status === 'running' && styles.disabled]}>⚙︎</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <TimeDisplay
            remainingMs={state.remainingMs}
            phase={state.phase}
            round={state.round}
            totalRounds={state.totalRounds}
          />
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  icon: { fontSize: 28 },
  disabled: { opacity: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  controls: { paddingBottom: 40, paddingHorizontal: 20 },
});
