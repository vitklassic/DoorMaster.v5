import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Search } from 'lucide-react-native';
import { MeasurementDetail } from '@/components/MeasurementDetail';
import { ObjectForm } from '@/components/ObjectForm';
import { OpeningWizard } from '@/components/opening/OpeningWizard';
import { colors, radius, spacing } from '@/constants/theme';
import { webInputReset } from '@/constants/inputReset';
import { formatDate, textOrNotSpecified } from '@/lib/measurements/format';
import { useMeasurements } from '@/lib/measurements/MeasurementsContext';
import type { Measurement, MeasurementDetails } from '@/lib/measurements/types';

type Editing = { kind: 'details' } | { kind: 'opening'; openingId: string } | { kind: 'new-opening' } | null;

export default function HistoryScreen() {
  const {
    measurements,
    loading,
    syncError,
    updateMeasurement,
    updateOpening,
    addOpening,
    deleteOpening,
    deleteMeasurement,
  } = useMeasurements();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  const selected = measurements.find((measurement) => measurement.id === selectedId) ?? null;
  const banner = syncError ? <Text style={styles.banner}>{syncError}</Text> : null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return measurements;
    return measurements.filter(
      (measurement) =>
        measurement.homeName.toLowerCase().includes(normalized) ||
        measurement.address.toLowerCase().includes(normalized) ||
        measurement.clientName.toLowerCase().includes(normalized)
    );
  }, [measurements, query]);

  if (selected && editing?.kind === 'details') {
    const details: MeasurementDetails = {
      homeName: selected.homeName,
      address: selected.address,
      clientName: selected.clientName,
      floor: selected.floor,
      entrance: selected.entrance,
      apartment: selected.apartment,
      notes: selected.notes,
    };
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ObjectForm
          initial={details}
          submitLabel="Сохранить изменения"
          onSubmit={async (input) => {
            const saved = await updateMeasurement(selected.id, input);
            if (saved) setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
        {banner}
      </SafeAreaView>
    );
  }

  const editingOpening =
    selected && editing?.kind === 'opening'
      ? selected.openings.find((opening) => opening.id === editing.openingId)
      : undefined;

  if (selected && editingOpening) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OpeningWizard
          key={editingOpening.id}
          initial={editingOpening}
          onComplete={async (opening) => {
            const saved = await updateOpening(editingOpening.id, opening);
            if (saved) setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
        {banner}
      </SafeAreaView>
    );
  }

  if (selected && editing?.kind === 'new-opening') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OpeningWizard
          onComplete={async (opening) => {
            const saved = await addOpening(selected.id, opening);
            if (saved) setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
        {banner}
      </SafeAreaView>
    );
  }

  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <MeasurementDetail
          measurement={selected}
          onBack={() => setSelectedId(null)}
          onEditDetails={() => setEditing({ kind: 'details' })}
          onEditOpening={(openingId) => setEditing({ kind: 'opening', openingId })}
          onAddOpening={() => setEditing({ kind: 'new-opening' })}
          onDeleteOpening={deleteOpening}
          onDelete={async () => {
            const deleted = await deleteMeasurement(selected.id);
            if (deleted) setSelectedId(null);
          }}
        />
        {banner}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {banner}
      <View style={styles.header}>
        <Text style={styles.title}>Мои замеры</Text>
        <View style={styles.searchRow}>
          <Search size={20} color={colors.textMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, webInputReset]}
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск по адресу или ФИО"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {loading ? 'Загружаем замеры...' : measurements.length === 0 ? 'Замеров пока нет' : 'Ничего не найдено'}
            </Text>
            {!loading ? (
              <Text style={styles.emptyText}>
                {measurements.length === 0
                  ? 'Создайте первый замер на вкладке «Новый замер»'
                  : 'Попробуйте другой адрес или ФИО'}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <MeasurementRow
            measurement={item}
            onPress={() => {
              setEditing(null);
              setSelectedId(item.id);
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function MeasurementRow({ measurement, onPress }: { measurement: Measurement; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowText}>
        <Text style={styles.rowAddress}>{textOrNotSpecified(measurement.homeName)}</Text>
        <Text style={styles.rowMeta}>{textOrNotSpecified(measurement.address)}</Text>
        <Text style={styles.rowMeta}>
          {formatDate(measurement.createdAt)} · проемов: {measurement.openings.length}
        </Text>
      </View>
      <ChevronRight size={22} color={colors.textMuted} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  banner: {
    padding: spacing.xs,
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.errorSoft,
    color: colors.error,
    fontSize: 9,
  },
  header: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    paddingVertical: 12,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  separator: {
    height: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  rowPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowAddress: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
