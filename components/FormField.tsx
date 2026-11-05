import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import { colors, radius } from '@/constants/theme';
import { webInputReset } from '@/constants/inputReset';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  suffix?: string;
  error?: string;
  warning?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  onConfirm?: () => void;
  confirmDisabled?: boolean;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
  error,
  warning,
  autoFocus = false,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  onConfirm,
  confirmDisabled = false,
}: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const borderColor = error ? colors.error : warning ? colors.warning : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline, { borderColor }]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, webInputReset]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          multiline={multiline}
          secureTextEntry={secureTextEntry && !passwordVisible}
          autoCapitalize={autoCapitalize}
          textAlignVertical={multiline ? 'top' : 'center'}
          onSubmitEditing={onConfirm && !confirmDisabled ? onConfirm : undefined}
          returnKeyType={onConfirm ? 'done' : undefined}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
            onPress={() => setPasswordVisible((visible) => !visible)}
            hitSlop={12}
            style={({ pressed }) => [styles.passwordButton, pressed && styles.passwordButtonPressed]}>
            {passwordVisible ? (
              <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
            ) : (
              <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
            )}
          </Pressable>
        ) : onConfirm ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Подтвердить"
            accessibilityState={{ disabled: confirmDisabled }}
            disabled={confirmDisabled}
            onPress={onConfirm}
            hitSlop={12}
            style={({ pressed }) => [
              styles.confirmButton,
              confirmDisabled && styles.confirmButtonDisabled,
              pressed && !confirmDisabled && styles.confirmButtonPressed,
            ]}>
            <Check size={14} color={colors.surface} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && warning ? <Text style={styles.warning}>{warning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  inputRowMultiline: {
    alignItems: 'stretch',
    paddingTop: 8,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 96,
    paddingVertical: 8,
  },
  suffix: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  passwordButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  passwordButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  confirmButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.border,
  },
  confirmButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  error: {
    fontSize: 9,
    color: colors.error,
  },
  warning: {
    fontSize: 9,
    color: colors.warning,
  },
});
