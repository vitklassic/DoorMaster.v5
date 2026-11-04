import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, spacing } from '@/constants/theme';
import type { MeasurementDetails } from '@/lib/measurements/types';

type FieldErrors = Partial<Record<'entrance', string>>;

const EMPTY_VALUES: MeasurementDetails = { homeName: '', address: '', clientName: '', floor: '', entrance: '', apartment: '', notes: '' };

function validate(values: MeasurementDetails): FieldErrors {
  const errors: FieldErrors = {};
  const entrance = values.entrance.trim();
  if (entrance && !/^\d+$/.test(entrance)) errors.entrance = 'Используйте только цифры';
  return errors;
}

type Props = {
  initial?: MeasurementDetails;
  submitLabel?: string;
  onSubmit: (details: MeasurementDetails) => void;
  onCancel: () => void;
};

export function ObjectForm({ initial, submitLabel = 'Далее', onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<MeasurementDetails>(initial ?? EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});

  function updateField(key: keyof MeasurementDetails, text: string) {
    setValues((prev) => ({ ...prev, [key]: text }));
  }

  function handleSubmit() {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      homeName: values.homeName.trim(),
      address: values.address.trim(),
      clientName: values.clientName.trim(),
      floor: values.floor.trim(),
      entrance: values.entrance.trim(),
      apartment: values.apartment.trim(),
      notes: values.notes.trim(),
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FormField
        label="Название замера"
        placeholder="Например, Квартира на Ленина 15"
        value={values.homeName}
        onChangeText={(text) => updateField('homeName', text)}
      />
      <Text style={styles.title}>Данные объекта</Text>
      <Text style={styles.subtitle}>Заполните нужные поля. Пустые поля можно оставить без заполнения</Text>

      <FormField
        label="Адрес"
        placeholder="Город, улица, дом"
        value={values.address}
        onChangeText={(text) => updateField('address', text)}
      />
      <FormField
        label="ФИО заказчика"
        placeholder="Иванов Иван Иванович"
        value={values.clientName}
        onChangeText={(text) => updateField('clientName', text)}
      />
      <FormField
        label="Номер подъезда"
        placeholder="Например, 2"
        keyboardType="numeric"
        value={values.entrance}
        onChangeText={(text) => updateField('entrance', text)}
        error={errors.entrance}
      />
      <FormField
        label="Этаж объекта"
        keyboardType="numeric"
        value={values.floor}
        onChangeText={(text) => updateField('floor', text.replace(/\D/g, ''))}
      />
      <FormField
        label="Номер квартиры"
        placeholder="Например, 45"
        keyboardType="numeric"
        value={values.apartment}
        onChangeText={(text) => updateField('apartment', text)}
      />
      <FormField
        label="Заметки"
        placeholder="Особенности объекта, пожелания заказчика"
        value={values.notes}
        onChangeText={(text) => updateField('notes', text)}
        multiline
      />

      <View style={styles.actions}>
        <AppButton label={submitLabel} onPress={handleSubmit} />
        <AppButton label="Отмена" variant="secondary" onPress={onCancel} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
