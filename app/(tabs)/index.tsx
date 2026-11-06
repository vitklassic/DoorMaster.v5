import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ClipboardList, FilePlus, LogOut, type LucideIcon } from 'lucide-react-native';
import { ObjectForm } from '@/components/ObjectForm';
import { OpeningWizard } from '@/components/opening/OpeningWizard';
import { AppButton } from '@/components/AppButton';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import type { Tenant } from '@/lib/auth/tenant';
import { uploadOpeningPhoto } from '@/lib/backend/photoStorage';
import { isSupabaseConfigured } from '@/lib/backend/supabaseClient';
import { reportError } from '@/lib/diagnostics';
import { useMeasurements } from '@/lib/measurements/MeasurementsContext';
import { textOrNotSpecified } from '@/lib/measurements/format';
import { blobToDataUrl, type PickedPhoto } from '@/lib/measurements/photo';
import type { MeasurementDetails, OpeningInput } from '@/lib/measurements/types';

type Stage =
  | { kind: 'home' }
  | { kind: 'object' }
  | { kind: 'opening'; measurementId: string; key: number }
  | { kind: 'finish'; measurementId: string };

export default function NewMeasurementScreen() {
  const { measurements, syncError, createMeasurement, addOpening, updateOpening } = useMeasurements();
  const { user, signOut } = useAuth();
  const tenant: Tenant | null = user ? { userId: user.id, companyId: user.companyId } : null;
  const [stage, setStage] = useState<Stage>({ kind: 'home' });
  const [accountError, setAccountError] = useState<string | null>(null);

  const finishedMeasurement =
    stage.kind === 'finish' ? measurements.find((measurement) => measurement.id === stage.measurementId) : undefined;

  async function handleCreateMeasurement(input: MeasurementDetails) {
    const measurementId = await createMeasurement(input);
    if (measurementId) setStage({ kind: 'opening', measurementId, key: Date.now() });
  }

  // Порядок важен: путь фото содержит id проёма, поэтому сначала addOpening без фото,
  // затем upload в Storage, затем updateOpening с путём
  async function handleOpeningComplete(measurementId: string, opening: OpeningInput, photo: PickedPhoto | null) {
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
    setStage({ kind: 'finish', measurementId });
  }

  async function handleSignOut() {
    setAccountError(null);
    try {
      await signOut();
    } catch (error) {
      reportError(error, 'signOut');
      setAccountError('Не удалось выйти. Попробуйте еще раз');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {syncError ? <Text style={styles.banner}>{syncError}</Text> : null}
      {accountError ? <Text style={styles.banner}>{accountError}</Text> : null}

      {stage.kind === 'home' ? (
        <View style={styles.home}>
          <View style={styles.accountRow}>
            <Text style={styles.brand}>Замер дверей</Text>
            <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.signOut}>
              <LogOut size={16} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.signOutText}>Выйти</Text>
            </Pressable>
          </View>
          <Text style={styles.accountEmail} numberOfLines={1}>
            {user?.email}
          </Text>
          <Text style={styles.title}>Что будем делать?</Text>
          <View style={styles.actions}>
            <ActionCard
              icon={FilePlus}
              title="Создать новый замер"
              description="Адрес, заказчик и проемы"
              onPress={() => setStage({ kind: 'object' })}
            />
            <ActionCard
              icon={ClipboardList}
              title="Просмотреть готовый замер"
              description="Все сохраненные объекты"
              onPress={() => router.navigate('/history')}
            />
          </View>
        </View>
      ) : null}

      {stage.kind === 'object' ? (
        <ObjectForm
          onSubmit={handleCreateMeasurement}
          onCancel={() => setStage({ kind: 'home' })}
        />
      ) : null}

      {stage.kind === 'opening' ? (
        <OpeningWizard
          key={stage.key}
          onComplete={(opening, photo) => void handleOpeningComplete(stage.measurementId, opening, photo)}
          onCancel={() => setStage({ kind: 'home' })}
        />
      ) : null}

      {stage.kind === 'finish' ? (
        <View style={styles.finish}>
          <View style={styles.successIcon}>
            <Check size={36} color={colors.success} strokeWidth={2.5} />
          </View>
          <Text style={styles.title}>Проем сохранен</Text>
          <Text style={styles.subtitle}>
            {textOrNotSpecified(finishedMeasurement?.address)}. Проемов в замере: {finishedMeasurement?.openings.length ?? 0}
          </Text>
          <View style={styles.actions}>
            <AppButton
              label="Измерить следующий проем"
              onPress={() => setStage({ kind: 'opening', measurementId: stage.measurementId, key: Date.now() })}
            />
            <AppButton label="Сохранить и выйти" variant="secondary" onPress={() => setStage({ kind: 'home' })} />
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

type ActionCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  onPress: () => void;
};

function ActionCard({ icon: Icon, title, description, onPress }: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardIcon}>
        <Icon size={28} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
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
  home: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  signOutText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  accountEmail: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
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
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  finish: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
