import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { TimerSettings } from '@/timer/engine';
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
import { Stepper } from '@/components/Stepper';
import { colors } from '@/theme';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

function settingsEqual(a: TimerSettings, b: TimerSettings): boolean {
  return (
    a.prepSec === b.prepSec &&
    a.roundSec === b.roundSec &&
    a.restSec === b.restSec &&
    a.rounds === b.rounds &&
    a.warningSec === b.warningSec
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

  const update = (patch: Partial<TimerSettings>) => {
    const next = { ...settings, ...patch };
    // Keep the warning shorter than a round.
    next.warningSec = Math.min(next.warningSec, next.roundSec);
    setSettings(next);
    void saveLastSettings(next);
  };

  const applyPreset = (p: Preset) => {
    setSettings(p.settings);
    void saveLastSettings(p.settings);
  };

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

        <Text style={styles.section}>CUSTOMIZE</Text>
        <View style={styles.card}>
          <Stepper
            label="Round length"
            value={settings.roundSec}
            format={mmss}
            step={15}
            min={5}
            max={1800}
            onChange={(v) => update({ roundSec: v })}
          />
          <Stepper
            label="Rest length"
            value={settings.restSec}
            format={mmss}
            step={15}
            min={0}
            max={600}
            onChange={(v) => update({ restSec: v })}
          />
          <Stepper
            label="Rounds"
            value={settings.rounds}
            step={1}
            min={1}
            max={99}
            onChange={(v) => update({ rounds: v })}
          />
          <Stepper
            label="Prep countdown"
            value={settings.prepSec}
            format={mmss}
            step={5}
            min={0}
            max={60}
            onChange={(v) => update({ prepSec: v })}
          />
          <Stepper
            label="End warning"
            value={settings.warningSec}
            format={(v) => `${v}s`}
            step={5}
            min={0}
            max={Math.min(60, settings.roundSec)}
            onChange={(v) => update({ warningSec: v })}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => update({ soundEnabled: v })}
            />
          </View>
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
  content: { padding: 20, paddingTop: 4, gap: 10 },
  section: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 4,
  },
  presetList: { gap: 10 },
  card: { backgroundColor: colors.surface, gap: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
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
