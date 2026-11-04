import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';

const MIN_PASSWORD_LENGTH = 6;

export function ResetPasswordScreen() {
  const { completePasswordReset } = useAuth();
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
      return;
    }
    if (password !== repeatPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completePasswordReset(password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить пароль');
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.logo}>
          <KeyRound size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Новый пароль</Text>
        <Text style={styles.subtitle}>Придумайте новый пароль для входа в аккаунт</Text>

        <FormField
          label="Новый пароль"
          placeholder={`Не короче ${MIN_PASSWORD_LENGTH} символов`}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <FormField
          label="Повторите пароль"
          placeholder="Введите пароль еще раз"
          secureTextEntry
          autoCapitalize="none"
          value={repeatPassword}
          onChangeText={setRepeatPassword}
          onConfirm={handleSubmit}
          confirmDisabled={submitting}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton label={submitting ? 'Сохраняем...' : 'Сохранить пароль'} onPress={handleSubmit} disabled={submitting} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: colors.text,
  },
  subtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  error: {
    fontSize: 9,
    color: colors.error,
    marginBottom: spacing.xs,
  },
});
