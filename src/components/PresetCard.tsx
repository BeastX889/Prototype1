import { Pressable, StyleSheet, Text, View } from 'react-native';
import { summarize, type Preset } from '@/storage/presets';
import { colors } from '@/theme';

interface Props {
  preset: Preset;
  selected: boolean;
  onPress: () => void;
  onDelete?: () => void;
}

export function PresetCard({ preset, selected, onPress, onDelete }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{preset.name}</Text>
        <Text style={styles.summary}>{summarize(preset.settings)}</Text>
      </View>
      {selected && <Text style={styles.check}>✓</Text>}
      {onDelete && !preset.builtIn && (
        <Pressable onPress={onDelete} accessibilityLabel={`Delete ${preset.name}`} hitSlop={10}>
          <Text style={styles.delete}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  selected: { borderColor: colors.accent },
  pressed: { opacity: 0.7 },
  info: { flex: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  summary: { color: colors.textDim, fontSize: 14, marginTop: 4 },
  check: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  delete: { color: colors.danger, fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
});
