import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { OpeningSchema } from '@/components/OpeningSchema';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, radius, spacing } from '@/constants/theme';
import { usePhotoUrl } from '@/lib/backend/photoStorage';
import { formatDate, getRoomLabels, getSideLabel, millimetersOrNotSpecified, textOrNotSpecified } from '@/lib/measurements/format';
import { previewReport, shareReport } from '@/lib/measurements/shareReport';
import { getAllowedTransitions, getTransitionLabel } from '@/lib/measurements/statusTransitions';
import type { Measurement, MeasurementStatus, Opening } from '@/lib/measurements/types';

type Props = {
  measurement: Measurement;
  onBack: () => void;
  onEditDetails: () => void;
  onEditOpening: (openingId: string) => void;
  onAddOpening: () => void;
  onDeleteOpening: (openingId: string) => void;
  onDelete: () => void;
  onSetStatus?: (status: MeasurementStatus) => Promise<boolean>;
};

export function MeasurementDetail({
  measurement,
  onBack,
  onEditDetails,
  onEditOpening,
  onAddOpening,
  onDeleteOpening,
  onDelete,
  onSetStatus,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const roomLabels = getRoomLabels(measurement.openings);
  const allowedTransitions = getAllowedTransitions(measurement.status);
  // Редактирование доступно только в работе: done/archived закрыты для правок
  const editable = measurement.status === 'draft' || measurement.status === 'active';

  async function handleReport(action: 'preview' | 'share') {
    setExportMessage(null);
    try {
      await (action === 'preview' ? previewReport(measurement) : shareReport(measurement));
    } catch (error) {
      console.error('Не удалось подготовить PDF', error);
      const detail = error instanceof Error ? error.message : String(error);
      setExportMessage({
        kind: 'error',
        text:
          Platform.OS === 'web'
            ? 'Браузер заблокировал окно отчета. Разрешите всплывающие окна и повторите.'
            : `Не удалось подготовить PDF. ${detail}`,
      });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
        <Text style={styles.backText}>Назад к списку</Text>
      </Pressable>

      <View style={styles.summary}>
        <Text style={styles.address}>{textOrNotSpecified(measurement.address)}</Text>
        <Text style={styles.summaryText}>Заказчик: {textOrNotSpecified(measurement.clientName)}</Text>
        <Text style={styles.summaryText}>Этаж объекта: {textOrNotSpecified(measurement.floor)}</Text>
        <Text style={styles.summaryText}>
          Подъезд {textOrNotSpecified(measurement.entrance)}, квартира {textOrNotSpecified(measurement.apartment)}
        </Text>
        <Text style={styles.summaryText}>Создан {formatDate(measurement.createdAt)}</Text>
        {measurement.notes.trim() ? <Text style={styles.notes}>Заметки: {measurement.notes.trim()}</Text> : null}
      </View>

      <View style={styles.statusBlock}>
        <Text style={styles.sectionTitle}>Статус</Text>
        <StatusBadge status={measurement.status} />
        {onSetStatus && allowedTransitions.length > 0 ? (
          <View style={styles.statusActions}>
            {allowedTransitions.map((status) => (
              <AppButton
                key={status}
                label={getTransitionLabel(measurement.status, status)}
                variant="secondary"
                onPress={() => void onSetStatus(status)}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {Platform.OS !== 'web' ? (
          <AppButton label="Просмотреть / сохранить PDF" onPress={() => void handleReport('preview')} />
        ) : null}
        <AppButton
          label={Platform.OS === 'web' ? 'Сохранить в PDF' : 'Отправить PDF'}
          variant={Platform.OS === 'web' ? 'primary' : 'secondary'}
          onPress={() => void handleReport('share')}
        />
        {editable ? <AppButton label="Редактировать данные объекта" variant="secondary" onPress={onEditDetails} /> : null}
        {exportMessage ? (
          <Text style={exportMessage.kind === 'error' ? styles.errorText : styles.successText}>{exportMessage.text}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Проемы ({measurement.openings.length})</Text>
      {measurement.openings.length === 0 ? <Text style={styles.emptyText}>Проемы пока не добавлены</Text> : null}
      {measurement.openings.map((opening, index) => (
        <OpeningCard
          key={opening.id}
          opening={opening}
          roomLabel={roomLabels[index]}
          editable={editable}
          onEdit={() => onEditOpening(opening.id)}
          onDelete={() => onDeleteOpening(opening.id)}
        />
      ))}
      {editable ? <AppButton label="Добавить проем" onPress={onAddOpening} /> : null}

      <View style={styles.deleteBlock}>
        {confirmingDelete ? (
          <>
            <Text style={styles.confirmText}>Удалить замер вместе со всеми проемами?</Text>
            <AppButton label="Да, удалить" variant="danger" onPress={onDelete} />
            <AppButton label="Не удалять" variant="secondary" onPress={() => setConfirmingDelete(false)} />
          </>
        ) : (
          <AppButton label="Удалить замер" variant="secondary" onPress={() => setConfirmingDelete(true)} />
        )}
      </View>
    </ScrollView>
  );
}

function OpeningCard({
  opening,
  roomLabel,
  editable,
  onEdit,
  onDelete,
}: {
  opening: Opening;
  roomLabel: string;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // photoDataUrl — путь Storage (подписанный URL) или data URL в mock-режиме
  const photoUrl = usePhotoUrl(opening.photoDataUrl);
  return (
    <View style={styles.openingCard}>
      <View style={styles.openingHeader}>
        <Text style={styles.openingTitle}>{roomLabel}</Text>
        {editable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Удалить проем"
            onPress={() => setConfirmingDelete(true)}
            style={styles.trashButton}>
            <Trash2 size={18} color={colors.error} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.openingMeta}>Этаж: {textOrNotSpecified(opening.floor)}</Text>
      <Text style={styles.openingMeta}>
        Высота: {millimetersOrNotSpecified(opening.height)} · Ширина: {millimetersOrNotSpecified(opening.width)} · Толщина: {millimetersOrNotSpecified(opening.thickness)}
      </Text>
      <Text style={styles.openingMeta}>Открывание: {getSideLabel(opening.side)}</Text>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : null}
      <View style={styles.schema}>
        <OpeningSchema side={opening.side} width={200} />
      </View>
      {editable ? (
        confirmingDelete ? (
          <View style={styles.deleteBlock}>
            <Text style={styles.confirmText}>Удалить этот проем? Это действие нельзя отменить.</Text>
            <AppButton label="Да, удалить проем" variant="danger" onPress={onDelete} />
            <AppButton label="Не удалять" variant="secondary" onPress={() => setConfirmingDelete(false)} />
          </View>
        ) : (
          <AppButton label="Изменить проем" variant="secondary" onPress={onEdit} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
  },
  backText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  summary: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  address: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.text,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.xs,
  },
  statusBlock: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statusActions: {
    gap: spacing.xs,
    marginTop: 2,
  },
  errorText: {
    fontSize: 9,
    color: colors.error,
  },
  successText: {
    fontSize: 9,
    color: colors.success,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  openingCard: {
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  openingTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  openingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  openingMeta: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    marginTop: 4,
    backgroundColor: colors.borderSoft,
  },
  schema: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  deleteBlock: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  confirmText: {
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
  },
});
