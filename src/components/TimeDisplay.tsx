import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  warmup: 'Warm-up',
  work: 'Round',
  rest: 'Rest',
  cooldown: 'Cool-down',
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
  // Fit small phones (320dp) and don't let long times ("30:00") graze the ring.
  const { width } = useWindowDimensions();
  const ringSize = Math.min(290, width - 48);
  const timeFontSize = Math.round(ringSize * 0.28);

  const progress = segmentDurationMs > 0 ? remainingMs / segmentDurationMs : 0;

  // "Next: Round 4 · 3:00" — say WHICH round is next, not just "Round".
  let nextText: string | null = null;
  if (nextPhase) {
    const nextRound = nextPhase === 'work' ? (phase === 'rest' ? round + 1 : round) : null;
    const label = nextRound ? `${NEXT_LABEL.work} ${nextRound}` : NEXT_LABEL[nextPhase];
    nextText = `Next: ${label} · ${formatTime(nextDurationMs)}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.phase}>{PHASE_LABEL[phase]}</Text>

      <ProgressRing
        size={ringSize}
        strokeWidth={12}
        progress={phase === 'done' ? 0 : progress}
        color="#ffffff"
        trackColor={colors.ringTrack}
      >
        <Text
          style={[styles.time, { fontSize: timeFontSize, lineHeight: timeFontSize + 6, maxWidth: ringSize - 48 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`${formatTime(remainingMs)} remaining`}
        >
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
          {nextText && <Text style={styles.metaText}>{nextText}</Text>}
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
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  round: { color: colors.textDim, fontSize: 20, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  meta: { alignItems: 'center', marginTop: 22, gap: 4 },
  metaText: { color: colors.textDim, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});
