import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Search } from 'lucide-react-native';
import { MeasurementDetail } from '@/components/MeasurementDetail';
import { ObjectForm } from '@/components/ObjectForm';
import { StatusBadge } from '@/components/StatusBadge';
import { OpeningWizard } from '@/components/opening/OpeningWizard';
import { colors, radius, spacing } from '@/constants/theme';
import { webInputReset } from '@/constants/inputReset';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Tenant } from '@/lib/auth/tenant';
import { deleteOpeningPhotos, uploadOpeningPhoto } from '@/lib/backend/photoStorage';
import { isSupabaseConfigured } from '@/lib/backend/supabaseClient';
import { formatDate, textOrNotSpecified } from '@/lib/measurements/format';
import { useMeasurements } from '@/lib/measurements/MeasurementsContext';
import { blobToDataUrl, type PickedPhoto } from '@/lib/measurements/photo';
import type { Measurement, MeasurementDetails, OpeningInput } from '@/lib/measurements/types';

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
    setStatus,
  } = useMeasurements();
  const { user } = useAuth();
  const tenant: Tenant | null = user ? { userId: user.id, companyId: user.companyId, role: user.role } : null;
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);

  // Порядок важен: путь фото содержит id проёма, поэтому сначала addOpening без фото,
  // затем upload в Storage, затем updateOpening с путём
  async function saveNewOpening(measurementId: string, opening: OpeningInput, photo: PickedPhoto | null) {
    const openingId = await addOpening(measurementId, { ...opening, photoDataUrl: null });
    if (!openingId) return;
    if (photo) {
      // На web — blob, на native — uri файла (C17)
      const file = photo.blob ?? photo.uri;
      if (tenant && isSupabaseConfigured && file) {
        try {
          const path = await uploadOpeningPhoto(tenant, measurementId, openingId, file);
          await updateOpening(openingId, { ...opening, photoDataUrl: path });
        } catch (error) {
          console.error('Не удалось загрузить фото проема', error);
        }
      } else if (photo.blob) {
        // Mock-режим (web без env): храним data URL в localStorage
        const dataUrl = await blobToDataUrl(photo.blob);
        await updateOpening(openingId, { ...opening, photoDataUrl: dataUrl });
      }
    }
    setEditing(null);
  }

  async function saveOpeningChanges(
    measurementId: string,
    openingId: string,
    opening: OpeningInput,
    photo: PickedPhoto | null
  ) {
    if (photo) {
      // На web — blob, на native — uri файла (C17)
      const file = photo.blob ?? photo.uri;
      if (tenant && isSupabaseConfigured && file) {
        try {
          const path = await uploadOpeningPhoto(tenant, measurementId, openingId, file);
          const saved = await updateOpening(openingId, { ...opening, photoDataUrl: path });
          if (saved) setEditing(null);
        } catch (error) {
          console.error('Не удалось загрузить фото проема', error);
        }
        return;
      }
      // Mock-режим: новое фото как data URL
      const dataUrl = await blobToDataUrl(photo.blob!);
      const savedWithPhoto = await updateOpening(openingId, { ...opening, photoDataUrl: dataUrl });
      if (savedWithPhoto) setEditing(null);
      return;
    }
    const saved = await updateOpening(openingId, opening);
    if (saved) setEditing(null);
  }

  async function removeOpening(openingId: string) {
    const opening = selected?.openings.find((item) => item.id === openingId);
    const deleted = await deleteOpening(openingId);
    if (deleted) await deleteOpeningPhotos([opening?.photoDataUrl]);
  }

  async function removeMeasurement(measurementId: string) {
    const measurement = measurements.find((item) => item.id === measurementId);
    const deleted = await deleteMeasurement(measurementId);
    if (deleted) await deleteOpeningPhotos(measurement?.openings.map((opening) => opening.photoDataUrl) ?? []);
    return deleted;
  }

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
          onComplete={(opening, photo) => void saveOpeningChanges(selected.id, editingOpening.id, opening, photo)}
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
          onComplete={(opening, photo) => void saveNewOpening(selected.id, opening, photo)}
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
          onDeleteOpening={(openingId) => void removeOpening(openingId)}
          onDelete={() => void removeMeasurement(selected.id).then((deleted) => {
            if (deleted) setSelectedId(null);
          })}
          onSetStatus={(status) => setStatus(selected.id, status)}
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
        <View style={styles.rowMetaRow}>
          <Text style={styles.rowMeta}>
            {formatDate(measurement.createdAt)} · проемов: {measurement.openings.length}
          </Text>
          <StatusBadge status={measurement.status} />
        </View>
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
  rowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
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
