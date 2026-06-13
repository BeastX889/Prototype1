import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  label: string;
  value: number;
  /** Render the numeric value (e.g. as M:SS or a plain count). */
  format?: (v: number) => string;
  /**
   * If provided, the value becomes tappable to type an exact value. Returns the
   * parsed number, or null if the text can't be parsed (edit is then discarded).
   */
  parse?: (text: string) => number | null;
  /** Keyboard for the type-to-edit field. 'time' allows the ":" character. */
  keyboardKind?: 'numeric' | 'time';
  step?: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export function Stepper({
  label,
  value,
  format = (v) => String(v),
  parse,
  keyboardKind = 'numeric',
  step = 1,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const set = (next: number) => onChange(Math.max(min, Math.min(max, next)));

  const startEdit = () => {
    if (!parse) return;
    setDraft(format(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = parse?.(draft);
    if (parsed != null && Number.isFinite(parsed)) set(parsed);
    setEditing(false);
  };

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

        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            autoFocus
            selectTextOnFocus
            keyboardType={keyboardKind === 'time' ? 'numbers-and-punctuation' : 'number-pad'}
            returnKeyType="done"
            style={[styles.value, styles.input]}
            accessibilityLabel={`Edit ${label}`}
          />
        ) : (
          <Pressable
            onPress={startEdit}
            disabled={!parse}
            accessibilityLabel={parse ? `Edit ${label}` : undefined}
          >
            <Text style={[styles.value, parse && styles.editable]}>{format(value)}</Text>
          </Pressable>
        )}

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
  // Underline hints that the value can be tapped to type an exact number.
  editable: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 2,
  },
});
