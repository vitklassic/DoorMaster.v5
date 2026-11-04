import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radius } from '@/constants/theme';
import { webInputReset } from '@/constants/inputReset';

export type ChoiceOption = { value: string; label: string };

type Props = {
  options: readonly ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  customLabel?: string;
};

export function ChoiceStep({ options, value, onChange, customLabel }: Props) {
  const [customActive, setCustomActive] = useState(
    () => customLabel !== undefined && value !== '' && !options.some((option) => option.value === value)
  );

  function selectOption(optionValue: string) {
    setCustomActive(false);
    onChange(optionValue);
  }

  function activateCustom() {
    setCustomActive(true);
    onChange('');
  }

  return (
    <View style={styles.list}>
      {options.map((option) => (
        <ChoiceRow
          key={option.value}
          label={option.label}
          selected={!customActive && value === option.value}
          onPress={() => selectOption(option.value)}
        />
      ))}
      {customLabel !== undefined ? (
        <>
          <ChoiceRow label={customLabel} selected={customActive} onPress={activateCustom} />
          {customActive ? (
            <TextInput
              style={[styles.customInput, webInputReset]}
              value={value}
              onChangeText={onChange}
              placeholder="Введите свой вариант"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

type RowProps = { label: string; selected: boolean; onPress: () => void };

function ChoiceRow({ label, selected, onPress }: RowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}>
      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{label}</Text>
      {selected ? <Check size={20} color={colors.primary} strokeWidth={2.5} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
  },
  rowLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  customInput: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 11,
    color: colors.text,
  },
});
