import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TimerStatus } from '@/timer/useTimer';
import { colors } from '@/theme';

interface Props {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
}

function Button({
  label,
  onPress,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'default' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.btnText, variant === 'primary' && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Controls({ status, onStart, onPause, onResume, onReset, onSkip }: Props) {
  return (
    <View style={styles.row}>
      {status === 'idle' && <Button label="START" variant="primary" onPress={onStart} />}

      {status === 'running' && (
        <>
          <Button label="Skip" onPress={onSkip} />
          <Button label="PAUSE" variant="primary" onPress={onPause} />
          <Button label="Reset" variant="danger" onPress={onReset} />
        </>
      )}

      {status === 'paused' && (
        <>
          <Button label="Skip" onPress={onSkip} />
          <Button label="RESUME" variant="primary" onPress={onResume} />
          <Button label="Reset" variant="danger" onPress={onReset} />
        </>
      )}

      {status === 'done' && <Button label="DONE — Reset" variant="primary" onPress={onReset} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center' },
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 96,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.text, paddingHorizontal: 36 },
  danger: { backgroundColor: 'rgba(214,69,69,0.85)' },
  pressed: { opacity: 0.6 },
  btnText: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  primaryText: { color: '#111' },
});
