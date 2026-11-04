import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Copy, UserPlus } from 'lucide-react-native';
import { AppButton } from '@/components/AppButton';
import { colors, radius, spacing } from '@/constants/theme';
import type { Tenant } from '@/lib/auth/tenant';
import { createInviteCode } from '@/lib/backend/inviteApi';

const GENERATE_ERROR_MESSAGE = 'Не удалось создать инвайт-код. Попробуйте еще раз';
const COPY_ERROR_MESSAGE = 'Не удалось скопировать код';

type Props = {
  tenant: Tenant;
};

export function InviteInstallerCard({ tenant }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    setCopied(false);
    try {
      setCode(await createInviteCode(tenant));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : GENERATE_ERROR_MESSAGE);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError(COPY_ERROR_MESSAGE);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <UserPlus size={16} color={colors.primary} strokeWidth={2} />
        <Text style={styles.title}>Пригласить монтажника</Text>
      </View>
      <Text style={styles.hint}>
        Код действует 7 дней. Монтажник введет его при регистрации и попадет в вашу компанию
      </Text>

      {code ? (
        <View style={styles.codeBox}>
          <Text style={styles.code} selectable>
            {code}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleCopy()}
            style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}>
            <Copy size={14} color={colors.primary} strokeWidth={2} />
            <Text style={styles.copyText}>{copied ? 'Скопировано' : 'Копировать'}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        label={generating ? 'Генерация...' : code ? 'Сгенерировать новый код' : 'Сгенерировать инвайт-код'}
        onPress={handleGenerate}
        disabled={generating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.sm,
    gap: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.text,
  },
  hint: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    color: colors.primary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  copyButtonPressed: {
    opacity: 0.7,
  },
  copyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  error: {
    fontSize: 10,
    color: colors.error,
  },
});
