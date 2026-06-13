import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  /** Current round (1-based). */
  round: number;
  totalRounds: number;
}

const MAX_DOTS = 12;

/**
 * Shows session progress: a row of dots (filled = done/current) when the round
 * count is small, or a slim progress bar for larger counts to avoid overflow.
 */
export function RoundDots({ round, totalRounds }: Props) {
  const current = Math.min(round, totalRounds);

  if (totalRounds <= MAX_DOTS) {
    return (
      <View style={styles.row} accessibilityLabel={`Round ${current} of ${totalRounds}`}>
        {Array.from({ length: totalRounds }, (_, i) => (
          <View key={i} style={[styles.dot, i < current ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
    );
  }

  const pct = Math.max(0, Math.min(1, current / totalRounds));
  return (
    <View style={styles.barTrack} accessibilityLabel={`Round ${current} of ${totalRounds}`}>
      <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.text },
  dotOff: { backgroundColor: 'rgba(255,255,255,0.28)' },
  barTrack: {
    width: 220,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: colors.text },
});
