import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { buildSchedule, formatTime, totalDurationMs, type TimerSettings } from '@/timer/engine';
import { saveCustomPreset, summarize, type Preset } from '@/storage/presets';
import { PHASE_COLORS, colors } from '@/theme';

interface Props {
  settings: TimerSettings;
  onRepeat: () => void;
  onDone: () => void;
}

/** Summary shown after a workout finishes (replaces the old snap-back to idle). */
export function WorkoutComplete({ settings, onRepeat, onDone }: Props) {
  const [saved, setSaved] = useState(false);
  const plannedMs = totalDurationMs(buildSchedule(settings));

  const save = async () => {
    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: `Custom ${summarize(settings)}`,
      builtIn: false,
      settings,
    };
    await saveCustomPreset(preset);
    setSaved(true);
  };

  return (
    <View style={[styles.fill, { backgroundColor: PHASE_COLORS.done }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.center}>
          <Text style={styles.title}>WORKOUT{'\n'}COMPLETE</Text>
          <Text style={styles.stat}>{settings.rounds} rounds</Text>
          <Text style={styles.stat}>{formatTime(plannedMs)} total</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={onRepeat}
            style={({ pressed }) => [styles.btn, styles.primary, pressed && styles.pressed]}
          >
            <Text style={[styles.btnText, styles.primaryText]}>REPEAT</Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable
              onPress={save}
              disabled={saved}
              style={({ pressed }) => [styles.btn, styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.btnText}>{saved ? 'Saved ✓' : 'Save preset'}</Text>
            </Pressable>
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [styles.btn, styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.btnText}>Done</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => router.push('/history')} hitSlop={10}>
            <Text style={styles.link}>View history</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 18,
  },
  stat: { color: colors.text, fontSize: 24, fontWeight: '700' },
  controls: { paddingBottom: 40, paddingHorizontal: 20, gap: 12, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center', minWidth: 130 },
  primary: { backgroundColor: colors.text, alignSelf: 'stretch' },
  secondary: { backgroundColor: 'rgba(255,255,255,0.15)', flex: 1 },
  pressed: { opacity: 0.6 },
  btnText: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  primaryText: { color: '#111' },
  link: { color: colors.textDim, fontSize: 15, fontWeight: '600', marginTop: 4 },
});
