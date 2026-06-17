import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Stepper } from '@/components/Stepper';
import { mmss, parseMmss } from '@/format';
import { colors } from '@/theme';

interface Props {
  rounds: number;
  roundSec: number;
  roundDurations: number[];
  onChange: (durations: number[]) => void;
}

/** Optional editor for per-round work durations. Off => [] (all rounds use roundSec). */
export function PerRoundEditor({ rounds, roundSec, roundDurations, onChange }: Props) {
  const [open, setOpen] = useState(roundDurations.length > 0);

  // Build a full-length array seeded from current durations / roundSec.
  const seeded = (overrideIndex?: number, overrideValue?: number) =>
    Array.from({ length: rounds }, (_, i) =>
      i === overrideIndex && overrideValue != null ? overrideValue : (roundDurations[i] ?? roundSec),
    );

  const toggle = (on: boolean) => {
    setOpen(on);
    onChange(on ? seeded() : []);
  };

  return (
    <View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>Custom per-round times</Text>
        <Switch value={open} onValueChange={toggle} />
      </View>

      {open && rounds > 30 && (
        <Text style={styles.warn}>Editing {rounds} rounds individually — scroll to set each.</Text>
      )}

      {open &&
        Array.from({ length: rounds }, (_, i) => (
          <Stepper
            key={i}
            label={`Round ${i + 1}`}
            value={roundDurations[i] ?? roundSec}
            format={mmss}
            parse={parseMmss}
            keyboardKind="time"
            step={15}
            min={5}
            max={1800}
            onChange={(v) => onChange(seeded(i, v))}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: { color: colors.text, fontSize: 17, fontWeight: '600' },
  warn: { color: colors.textDim, fontSize: 13, marginBottom: 6 },
});
