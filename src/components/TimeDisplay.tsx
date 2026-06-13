import { StyleSheet, Text, View } from 'react-native';
import { formatTime, type Phase } from '@/timer/engine';
import { PHASE_LABEL, colors } from '@/theme';
import { ProgressRing } from '@/components/ProgressRing';

interface Props {
  remainingMs: number;
  segmentDurationMs: number;
  totalRemainingMs: number;
  phase: Phase;
  round: number;
  totalRounds: number;
  nextPhase: Phase | null;
  nextDurationMs: number;
}

const NEXT_LABEL: Record<Phase, string> = {
  prep: 'Prep',
  work: 'Round',
  rest: 'Rest',
  done: '',
};

export function TimeDisplay({
  remainingMs,
  segmentDurationMs,
  totalRemainingMs,
  phase,
  round,
  totalRounds,
  nextPhase,
  nextDurationMs,
}: Props) {
  const progress = segmentDurationMs > 0 ? remainingMs / segmentDurationMs : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.phase}>{PHASE_LABEL[phase]}</Text>

      <ProgressRing
        size={290}
        strokeWidth={12}
        progress={phase === 'done' ? 0 : progress}
        color="#ffffff"
        trackColor={colors.ringTrack}
      >
        <Text style={styles.time} accessibilityLabel={`${formatTime(remainingMs)} remaining`}>
          {formatTime(remainingMs)}
        </Text>
        {phase !== 'done' && (
          <Text style={styles.round}>
            Round {Math.min(round, totalRounds)} / {totalRounds}
          </Text>
        )}
      </ProgressRing>

      {phase !== 'done' && (
        <View style={styles.meta}>
          {nextPhase && (
            <Text style={styles.metaText}>
              Next: {NEXT_LABEL[nextPhase]} {formatTime(nextDurationMs)}
            </Text>
          )}
          <Text style={styles.metaText}>Total left {formatTime(totalRemainingMs)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  phase: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 18,
  },
  time: {
    color: colors.text,
    fontSize: 86,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 92,
  },
  round: { color: colors.textDim, fontSize: 20, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  meta: { alignItems: 'center', marginTop: 22, gap: 4 },
  metaText: { color: colors.textDim, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
