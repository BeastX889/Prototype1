import { StyleSheet, Text, View } from 'react-native';
import { formatTime, type Phase } from '@/timer/engine';
import { PHASE_LABEL, colors } from '@/theme';

interface Props {
  remainingMs: number;
  phase: Phase;
  round: number;
  totalRounds: number;
}

export function TimeDisplay({ remainingMs, phase, round, totalRounds }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.phase}>{PHASE_LABEL[phase]}</Text>
      <Text style={styles.time} accessibilityLabel={`${formatTime(remainingMs)} remaining`}>
        {formatTime(remainingMs)}
      </Text>
      {phase !== 'done' && (
        <Text style={styles.round}>
          Round {Math.min(round, totalRounds)} / {totalRounds}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  phase: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    opacity: 0.9,
  },
  time: {
    color: colors.text,
    fontSize: 112,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    marginVertical: 4,
  },
  round: { color: colors.textDim, fontSize: 22, fontWeight: '600', letterSpacing: 1 },
});
