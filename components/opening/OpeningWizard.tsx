import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { OpeningSchema } from '@/components/OpeningSchema';
import { ChoiceStep, type ChoiceOption } from '@/components/opening/ChoiceStep';
import { PhotoStep } from '@/components/opening/PhotoStep';
import { colors, radius, spacing } from '@/constants/theme';
import { checkDimension } from '@/lib/measurements/validation';
import {
  DIMENSION_LIMITS,
  FLOOR_OPTIONS,
  OPENING_SIDE_OPTIONS,
  ROOM_OPTIONS,
  type Opening,
  type OpeningInput,
  type OpeningSide,
} from '@/lib/measurements/types';

const STEPS = ['floor', 'room', 'photo', 'height', 'width', 'thickness', 'side'] as const;
type Step = (typeof STEPS)[number];
type DimensionKey = 'height' | 'width' | 'thickness';

const DIMENSION_STEPS: Step[] = ['height', 'width', 'thickness'];

const STEP_COPY: Record<Step, { title: string; hint: string }> = {
  floor: { title: 'Этаж', hint: 'Выберите этаж, на котором находится проем' },
  room: { title: 'Помещение', hint: 'Выберите помещение из списка или введите свое' },
  photo: { title: 'Фото проема', hint: 'Фото можно пропустить' },
  height: { title: 'Высота проема', hint: 'Замерьте от пола до верхней точки проема' },
  width: { title: 'Ширина проема', hint: 'Замерьте между боковыми стенами проема' },
  thickness: { title: 'Толщина', hint: 'Глубина проема от одной стороны стены до другой' },
  side: { title: 'Сторона открывания', hint: 'Схема покажет, как откроется дверь' },
};

const FLOOR_CHOICES: ChoiceOption[] = FLOOR_OPTIONS.map((floor) => ({ value: floor, label: floor }));
const ROOM_CHOICES: ChoiceOption[] = ROOM_OPTIONS.map((room) => ({ value: room, label: room }));
const SIDE_CHOICES: ChoiceOption[] = OPENING_SIDE_OPTIONS.map((option) => ({ value: option.id, label: option.label }));

type Draft = {
  floor: string;
  room: string;
  photoDataUrl: string | null;
  height: string;
  width: string;
  thickness: string;
  side: OpeningSide | null;
};

const EMPTY_DRAFT: Draft = {
  floor: '',
  room: '',
  photoDataUrl: null,
  height: '',
  width: '',
  thickness: '',
  side: null,
};

function draftFromOpening(opening: Opening): Draft {
  return {
    floor: opening.floor ?? '',
    room: opening.room ?? '',
    photoDataUrl: opening.photoDataUrl,
    height: opening.height === null ? '' : String(opening.height),
    width: opening.width === null ? '' : String(opening.width),
    thickness: opening.thickness === null ? '' : String(opening.thickness),
    side: opening.side,
  };
}

function clearStep(draft: Draft, step: Step): Draft {
  switch (step) {
    case 'floor':
      return { ...draft, floor: '' };
    case 'room':
      return { ...draft, room: '' };
    case 'photo':
      return { ...draft, photoDataUrl: null };
    case 'height':
    case 'width':
    case 'thickness':
      return { ...draft, [step]: '' };
    case 'side':
      return { ...draft, side: null };
  }
}

function toOpeningInput(draft: Draft): OpeningInput {
  return {
    floor: draft.floor.trim() || null,
    room: draft.room.trim() || null,
    photoDataUrl: draft.photoDataUrl,
    height: checkDimension(draft.height, DIMENSION_LIMITS.height).value,
    width: checkDimension(draft.width, DIMENSION_LIMITS.width).value,
    thickness: checkDimension(draft.thickness, DIMENSION_LIMITS.thickness).value,
    side: draft.side,
  };
}

type Props = {
  initial?: Opening;
  onComplete: (opening: OpeningInput) => void;
  onCancel: () => void;
};

export function OpeningWizard({ initial, onComplete, onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => (initial ? draftFromOpening(initial) : EMPTY_DRAFT));

  const step = STEPS[stepIndex];
  const copy = STEP_COPY[step];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isDimensionStep = DIMENSION_STEPS.includes(step);

  const dimensionChecks = {
    height: checkDimension(draft.height, DIMENSION_LIMITS.height),
    width: checkDimension(draft.width, DIMENSION_LIMITS.width),
    thickness: checkDimension(draft.thickness, DIMENSION_LIMITS.thickness),
  };

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateDimension(key: DimensionKey, text: string) {
    setDraft((prev) => ({ ...prev, [key]: text }));
  }

  function commit(next: Draft) {
    if (isLastStep) {
      onComplete(toOpeningInput(next));
      return;
    }
    setDraft(next);
    setStepIndex((index) => index + 1);
  }

  function goNext() {
    if (isDimensionStep && dimensionChecks[step as DimensionKey].error) return;
    commit(draft);
  }

  function skipStep() {
    commit(clearStep(draft, step));
  }

  function goBack() {
    if (stepIndex === 0) {
      onCancel();
      return;
    }
    setStepIndex((index) => index - 1);
  }

  const buttonLabel = isLastStep
    ? initial
      ? 'Сохранить изменения'
      : 'Сохранить проем'
    : step === 'photo' && draft.photoDataUrl === null
      ? 'Пропустить'
      : 'Далее';

  function renderStepContent() {
    switch (step) {
      case 'floor':
        return (
          <ChoiceStep
            options={FLOOR_CHOICES}
            value={draft.floor}
            onChange={(floor) => updateDraft({ floor })}
            customLabel="Свой вариант"
          />
        );
      case 'room':
        return (
          <ChoiceStep
            options={ROOM_CHOICES}
            value={draft.room}
            onChange={(room) => updateDraft({ room })}
            customLabel="Другое"
          />
        );
      case 'photo':
        return <PhotoStep photoDataUrl={draft.photoDataUrl} onChange={(photoDataUrl) => updateDraft({ photoDataUrl })} />;
      case 'height':
      case 'width':
      case 'thickness': {
        const check = dimensionChecks[step];
        return (
          <FormField
            label="Размер"
            suffix="мм"
            keyboardType="numeric"
            placeholder="Например, 2100"
            value={draft[step]}
            onChangeText={(text) => updateDimension(step, text)}
            error={check.error ?? undefined}
            warning={check.warning ?? undefined}
            autoFocus
            onConfirm={goNext}
            confirmDisabled={check.error !== null}
          />
        );
      }
      case 'side':
        return (
          <View style={styles.sideContent}>
            <ChoiceStep
              options={SIDE_CHOICES}
              value={draft.side ?? ''}
              onChange={(side) => updateDraft({ side: (side || null) as OpeningSide | null })}
            />
            <View style={styles.schemaCard}>
              <OpeningSchema side={draft.side} />
            </View>
          </View>
        );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={stepIndex === 0 ? 'Отменить замер проема' : 'Назад'}
            onPress={goBack}
            style={styles.iconButton}>
            {stepIndex === 0 ? (
              <X size={24} color={colors.text} strokeWidth={2} />
            ) : (
              <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
            )}
          </Pressable>
          <Text style={styles.progressText}>
            Шаг {stepIndex + 1} из {STEPS.length}
          </Text>
          {isDimensionStep ? (
            <View style={styles.iconButton} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Пропустить шаг"
              onPress={skipStep}
              style={styles.iconButton}>
              <Check size={24} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View key={step} style={styles.stepBody}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.hint}>{copy.hint}</Text>
          {renderStepContent()}
        </View>
      </ScrollView>

      {isDimensionStep ? null : (
        <View style={styles.footer}>
          <AppButton label={buttonLabel} onPress={goNext} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.md,
  },
  stepBody: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sideContent: {
    gap: spacing.sm,
  },
  schemaCard: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  footer: {
    padding: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
