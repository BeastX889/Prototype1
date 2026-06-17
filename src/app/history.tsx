import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatTime } from '@/timer/engine';
import {
  clearHistory,
  computeStats,
  loadHistory,
  type SessionRecord,
  type Stats,
} from '@/storage/history';
import { colors } from '@/theme';

const ZERO: Stats = { totalSessions: 0, totalMs: 0, totalRounds: 0, currentStreakDays: 0 };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [stats, setStats] = useState<Stats>(ZERO);

  const refresh = () => loadHistory().then((r) => {
    setRecords(r);
    setStats(computeStats(r));
  });

  useEffect(() => {
    refresh();
  }, []);

  const onClear = async () => {
    await clearHistory();
    refresh();
  };

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Done">
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <Stat label="Sessions" value={`${stats.totalSessions}`} />
          <Stat label="Total time" value={formatTime(stats.totalMs)} />
          <Stat label="Rounds" value={`${stats.totalRounds}`} />
          <Stat label="Streak" value={`${stats.currentStreakDays}d`} />
        </View>

        {records.length === 0 ? (
          <Text style={styles.empty}>No workouts yet. Finish a session to log it here.</Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.item}>
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>{r.presetName}</Text>
                <Text style={styles.itemSub}>{formatDate(r.dateISO)}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemRounds}>
                  {r.roundsCompleted}/{r.roundsPlanned} rounds
                </Text>
                <Text style={styles.itemSub}>{formatTime(r.totalMs)}</Text>
              </View>
            </View>
          ))
        )}

        {records.length > 0 && (
          <Pressable onPress={onClear} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
            <Text style={styles.clearText}>Clear history</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  content: { padding: 20, paddingTop: 4, gap: 10, paddingBottom: 48 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 11, fontWeight: '600', marginTop: 2 },
  empty: { color: colors.textDim, fontSize: 15, textAlign: 'center', marginTop: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
  },
  itemMain: { flex: 1 },
  itemName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  itemSub: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemRounds: { color: colors.text, fontSize: 14, fontWeight: '600' },
  clear: { padding: 14, alignItems: 'center', marginTop: 8 },
  pressed: { opacity: 0.6 },
  clearText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
