import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { STATUS_LABELS } from '@/lib/measurements/statusTransitions';
import type { MeasurementStatus } from '@/lib/measurements/types';

// draft — серый, active — синий, done — зелёный, archived — приглушённый
const STATUS_COLORS: Record<MeasurementStatus, { text: string; background: string }> = {
  draft: { text: colors.textMuted, background: colors.borderSoft },
  active: { text: colors.primary, background: colors.primarySoft },
  done: { text: colors.success, background: colors.successSoft },
  archived: { text: colors.textSecondary, background: colors.borderSoft },
};

export function StatusBadge({ status }: { status: MeasurementStatus }) {
  const palette = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.text }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
