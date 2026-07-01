import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { type TimerSettings } from '@/timer/engine';
import {
  BUILT_IN_PRESETS,
  deleteCustomPreset,
  loadCustomPresets,
  loadLastSettings,
  saveCustomPreset,
  saveLastSettings,
  summarize,
  type Preset,
} from '@/storage/presets';
import { PresetCard } from '@/components/PresetCard';
import { PerRoundEditor } from '@/components/PerRoundEditor';
import { Stepper } from '@/components/Stepper';
import { initAudio, playSound, setOutputMode, setVolume } from '@/audio/sounds';
import { mmss, parseMmss, parseCount } from '@/format';
import { colors } from '@/theme';

const AUDIO_MODES: { key: TimerSettings['audioMode']; label: string }[] = [
  { key: 'mix', label: 'Mix' },
  { key: 'duck', label: 'Duck' },
  { key: 'solo', label: 'Solo' },
];

function settingsEqual(a: TimerSettings, b: TimerSettings): boolean {
  return (
    a.prepSec === b.prepSec &&
    a.roundSec === b.roundSec &&
    a.restSec === b.restSec &&
    a.rounds === b.rounds &&
    a.warningSec === b.warningSec &&
    a.warmupSec === b.warmupSec &&
    a.cooldownSec === b.cooldownSec &&
    JSON.stringify(a.roundDurations) === JSON.stringify(b.roundDurations)
  );
}

export default function SettingsScreen() {
  const [settings, setSettings] = useState<TimerSettings | null>(null);
  const [custom, setCustom] = useState<Preset[]>([]);

  useEffect(() => {
    loadLastSettings().then(setSettings);
    loadCustomPresets().then(setCustom);
  }, []);

  if (!settings) return <View style={styles.fill} />;

  const commit = (next: TimerSettings) => {
    next.warningSec = Math.min(next.warningSec, next.roundSec);
    setSettings(next);
    void saveLastSettings(next);
  };

  const update = (patch: Partial<TimerSettings>) => commit({ ...settings, ...patch });

  // Changing the round count resizes a custom per-round array to match.
  const setRounds = (rounds: number) => {
    const next = { ...settings, rounds };
    if (settings.roundDurations.length > 0) {
      next.roundDurations = Array.from(
        { length: rounds },
        (_, i) => settings.roundDurations[i] ?? settings.roundSec,
      );
    }
    commit(next);
  };

  const applyPreset = (p: Preset) => commit({ ...p.settings });

  const onSaveCustom = async () => {
    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: `Custom ${summarize(settings)}`,
      builtIn: false,
      settings,
    };
    setCustom(await saveCustomPreset(preset));
  };

  const onDelete = async (id: string) => setCustom(await deleteCustomPreset(id));

  // Play the round bell now so the user can check audibility with their current settings.
  const soundCheck = async () => {
    await initAudio(settings.audioMode, settings.volume);
    setOutputMode(settings.audioMode);
    setVolume(settings.volume);
    playSound('bell', true);
  };

  const allPresets = [...BUILT_IN_PRESETS, ...custom];

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Setup</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Done">
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>PRESETS</Text>
        <View style={styles.presetList}>
          {allPresets.map((p) => (
            <PresetCard
              key={p.id}
              preset={p}
              selected={settingsEqual(p.settings, settings)}
              onPress={() => applyPreset(p)}
              onDelete={p.builtIn ? undefined : () => onDelete(p.id)}
            />
          ))}
        </View>

        <Text style={styles.section}>ROUNDS</Text>
        <Text style={styles.hint}>Use −/+ or tap a value to type it exactly (e.g. 2:30).</Text>
        <View style={styles.card}>
          <Stepper
            label="Round length"
            value={settings.roundSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={15}
            min={5}
            max={1800}
            onChange={(v) => update({ roundSec: v })}
          />
          <Stepper
            label="Rest length"
            value={settings.restSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={15}
            min={0}
            max={600}
            onChange={(v) => update({ restSec: v })}
          />
          <Stepper
            label="Rounds"
            value={settings.rounds}
            parse={parseCount}
            keyboardKind="numeric"
            step={1}
            min={1}
            max={99}
            onChange={setRounds}
          />
          <PerRoundEditor
            rounds={settings.rounds}
            roundSec={settings.roundSec}
            roundDurations={settings.roundDurations}
            onChange={(roundDurations) => update({ roundDurations })}
          />
          <Stepper
            label="Warm-up"
            value={settings.warmupSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={30}
            min={0}
            max={1800}
            onChange={(v) => update({ warmupSec: v })}
          />
          <Stepper
            label="Cool-down"
            value={settings.cooldownSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={30}
            min={0}
            max={1800}
            onChange={(v) => update({ cooldownSec: v })}
          />
          <Stepper
            label="Prep countdown"
            value={settings.prepSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={5}
            min={0}
            max={60}
            onChange={(v) => update({ prepSec: v })}
          />
          <Stepper
            label="End warning"
            value={settings.warningSec}
            format={(v) => `${v}s`}
            parse={parseCount}
            keyboardKind="numeric"
            step={5}
            min={0}
            max={Math.min(60, settings.roundSec)}
            onChange={(v) => update({ warningSec: v })}
          />
        </View>

        <Text style={styles.section}>AUDIO &amp; VOICE</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sound (bells &amp; beeps)</Text>
            <Switch value={settings.soundEnabled} onValueChange={(v) => update({ soundEnabled: v })} />
          </View>

          <View style={styles.modeRow}>
            <Text style={styles.switchLabel}>Over music</Text>
            <View style={styles.segment}>
              {AUDIO_MODES.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => update({ audioMode: m.key })}
                  style={[styles.segmentBtn, settings.audioMode === m.key && styles.segmentBtnOn]}
                  accessibilityLabel={`Audio mode ${m.label}`}
                >
                  <Text style={[styles.segmentText, settings.audioMode === m.key && styles.segmentTextOn]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.hint}>
            Mix = play over music · Duck = lower music briefly · Solo = pause music for the bell.
          </Text>

          <Stepper
            label="Volume"
            value={Math.round(settings.volume * 100)}
            format={(v) => `${v}%`}
            parse={parseCount}
            keyboardKind="numeric"
            step={10}
            min={0}
            max={100}
            onChange={(v) => update({ volume: Math.max(0, Math.min(1, v / 100)) })}
          />

          <Pressable
            onPress={soundCheck}
            style={({ pressed }) => [styles.soundCheck, pressed && styles.pressed]}
            accessibilityLabel="Sound check"
          >
            <Text style={styles.soundCheckText}>🔔 Sound check</Text>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Voice announcements</Text>
            <Switch value={settings.voiceEnabled} onValueChange={(v) => update({ voiceEnabled: v })} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Combo caller</Text>
            <Switch value={settings.comboCaller} onValueChange={(v) => update({ comboCaller: v })} />
          </View>
          {settings.comboCaller && (
            <>
              {!settings.voiceEnabled && (
                <Text style={styles.hint}>Combo caller needs Voice announcements on.</Text>
              )}
              <Stepper
                label="Combo every"
                value={settings.comboIntervalSec}
                format={(v) => `${v}s`}
                parse={parseCount}
                keyboardKind="numeric"
                step={5}
                min={5}
                max={120}
                onChange={(v) => update({ comboIntervalSec: v })}
              />
            </>
          )}
        </View>

        <Pressable
          onPress={onSaveCustom}
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>Save as custom preset</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  done: { color: colors.accent, fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingTop: 4, gap: 10, paddingBottom: 48 },
  section: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 4,
  },
  hint: { color: colors.textDim, fontSize: 13, marginBottom: 6 },
  presetList: { gap: 10 },
  card: { backgroundColor: colors.surface, gap: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 3 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  segmentBtnOn: { backgroundColor: colors.accent },
  segmentText: { color: colors.textDim, fontSize: 15, fontWeight: '700' },
  segmentTextOn: { color: colors.text },
  soundCheck: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  soundCheckText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  pressed: { opacity: 0.7 },
  saveText: { color: colors.text, fontSize: 17, fontWeight: '700' },
});
