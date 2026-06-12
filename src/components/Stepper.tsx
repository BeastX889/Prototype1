import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  label: string;
  value: number;
  /** Render the numeric value (e.g. as M:SS or a plain count). */
  format?: (v: number) => string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export function Stepper({
  label,
  value,
  format = (v) => String(v),
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  onChange,
}: Props) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, next)));
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => set(value - step)}
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{format(value)}</Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
          onPress={() => set(value + step)}
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: { color: colors.text, fontSize: 17, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  btnText: { color: colors.text, fontSize: 24, fontWeight: '700', lineHeight: 26 },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'center',
  },
});
