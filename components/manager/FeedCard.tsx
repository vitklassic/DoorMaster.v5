import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, DoorOpen, MapPin } from 'lucide-react-native';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, radius, spacing } from '@/constants/theme';
import { formatDate, textOrNotSpecified } from '@/lib/measurements/format';
import type { FeedItem } from '@/lib/measurements/feed';

type Props = {
  item: FeedItem;
  onPress: (measurementId: string) => void;
};

export function FeedCard({ item, onPress }: Props) {
  const { measurement } = item;
  const openingCount = measurement.openings.length;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(measurement.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.details}>
        <View style={styles.headerRow}>
          <Text style={styles.homeName} numberOfLines={1}>
            {textOrNotSpecified(measurement.homeName)}
          </Text>
          <Text style={styles.date}>{formatDate(measurement.createdAt)}</Text>
        </View>

        <View style={styles.addressRow}>
          <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.address} numberOfLines={1}>
            {textOrNotSpecified(measurement.address)}
          </Text>
        </View>

        <Text style={styles.client} numberOfLines={1}>
          {textOrNotSpecified(measurement.clientName)}
        </Text>

        <View style={styles.badgesRow}>
          <View style={styles.openingBadge}>
            <DoorOpen size={13} color={colors.primary} strokeWidth={2} />
            <Text style={styles.openingCount}>Проемов: {openingCount}</Text>
          </View>
          <StatusBadge status={measurement.status} />
        </View>
      </View>

      <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  details: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  homeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.text,
  },
  date: {
    fontSize: 9,
    color: colors.textMuted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  client: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  openingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  openingCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
});
