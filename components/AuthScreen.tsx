import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DoorOpen } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, radius, spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/backend/supabaseClient';
import { useAuth } from '@/lib/auth/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MIN_COMPANY_NAME_LENGTH = 2;
const MAX_COMPANY_NAME_LENGTH = 120;
const INVITE_CODE_LENGTH = 8;

type Mode = 'signin' | 'signup' | 'forgot';

const TITLES: Record<Mode, string> = {
  signin: 'Вход в аккаунт',
  signup: 'Создать аккаунт',
  forgot: 'Восстановление пароля',
};

const SUBTITLES: Record<Mode, string> = {
  signin: 'Войдите, чтобы открыть свои замеры дверей',
  signup: 'Замеры будут доступны только сотрудникам вашей компании',
  forgot: 'Укажите почту, и мы отправим ссылку для смены пароля',
};

export function AuthScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validateEmail(): string | null {
    if (!EMAIL_PATTERN.test(email.trim())) return 'Введите корректную почту';
    return null;
  }

  function validate(): string | null {
    const emailError = validateEmail();
    if (emailError) return emailError;
    if (mode === 'signup' && inviteCode.trim()) {
      if (inviteCode.trim().length !== INVITE_CODE_LENGTH) {
        return `Инвайт-код состоит из ${INVITE_CODE_LENGTH} символов`;
      }
    } else if (mode === 'signup') {
      const length = companyName.trim().length;
      if (length < MIN_COMPANY_NAME_LENGTH || length > MAX_COMPANY_NAME_LENGTH) {
        return `Название компании: от ${MIN_COMPANY_NAME_LENGTH} до ${MAX_COMPANY_NAME_LENGTH} символов`;
      }
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    }
    return null;
  }

  async function handleSubmit() {
    if (submitting) return;
    const validationError = mode === 'forgot' ? validateEmail() : validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email.trim());
        setResetSent(true);
      } else if (mode === 'signup') {
        await signUp(email.trim(), password, companyName.trim(), inviteCode.trim().toUpperCase());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось выполнить действие');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetSent(false);
  }

  const submitLabel = submitting
    ? 'Подождите...'
    : mode === 'forgot'
      ? 'Отправить ссылку'
      : mode === 'signup'
        ? 'Зарегистрироваться'
        : 'Войти';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.logo}>
          <DoorOpen size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <Text style={styles.title}>{TITLES[mode]}</Text>
        <Text style={styles.subtitle}>{SUBTITLES[mode]}</Text>

        {!isSupabaseConfigured ? (
          <Text style={styles.demoNote}>Демо-режим: замеры сохраняются только в этом браузере</Text>
        ) : null}

        {mode === 'forgot' && resetSent ? (
          <Text style={styles.success}>
            Если аккаунт с этой почтой существует, ссылка для смены пароля уже отправлена. Проверьте входящие.
          </Text>
        ) : (
          <>
            {mode === 'signup' ? (
              <FormField
                label="Инвайт-код компании (необязательно)"
                placeholder="Получите код у менеджера"
                autoCapitalize="none"
                value={inviteCode}
                onChangeText={setInviteCode}
              />
            ) : null}
            {mode === 'signup' && !inviteCode.trim() ? (
              <FormField
                label="Название компании"
                placeholder="Например, ООО «Двери Плюс»"
                value={companyName}
                onChangeText={setCompanyName}
              />
            ) : null}
            <FormField
              label="Почта"
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {mode !== 'forgot' ? (
              <>
                <FormField
                  label="Пароль"
                  placeholder={mode === 'signup' ? `Не короче ${MIN_PASSWORD_LENGTH} символов` : 'Ваш пароль'}
                  secureTextEntry
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  onConfirm={handleSubmit}
                  confirmDisabled={submitting}
                />
                {mode === 'signin' ? (
                  <Pressable accessibilityRole="button" onPress={() => switchMode('forgot')} style={styles.forgotLink}>
                    <Text style={styles.linkText}>Забыли пароль?</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <AppButton label={submitLabel} onPress={handleSubmit} disabled={submitting} />
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => switchMode(mode === 'signup' ? 'signin' : mode === 'forgot' ? 'signin' : 'signup')}
          style={styles.switchButton}>
          <Text style={styles.linkText}>
            {mode === 'signup'
              ? 'Уже есть аккаунт? Войти'
              : mode === 'forgot'
                ? 'Вернуться ко входу'
                : 'Нет аккаунта? Зарегистрироваться'}
          </Text>
        </Pressable>
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
  demoNote: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.textSecondary,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.borderSoft,
    marginBottom: spacing.sm,
  },
  success: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.success,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
    marginBottom: spacing.sm,
  },
  error: {
    fontSize: 9,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  switchButton: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  linkText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
});
