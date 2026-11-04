import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { CompanyInstaller } from '@/lib/backend/profilesApi';

type Props = {
  installers: CompanyInstaller[];
  loading: boolean;
  error: string | null;
  horizontal: boolean;
};

export function InstallersSidebar({ installers, loading, error, horizontal }: Props) {
  const status = loading ? 'Загрузка...' : `Всего: ${installers.length}`;

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Монтажники</Text>
      <Text style={styles.count}>{status}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && installers.length === 0 ? (
        <Text style={styles.empty}>В компании пока нет монтажников</Text>
      ) : null}

      <View style={[styles.list, horizontal && styles.listHorizontal]}>
        {installers.map((installer) => (
          <View key={installer.id} style={[styles.row, horizontal && styles.rowChip]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{installer.email.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.email} numberOfLines={1}>
                {installer.email}
              </Text>
              <Text style={styles.role}>{ROLE_LABELS.installer}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: colors.text,
  },
  count: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  error: {
    fontSize: 9,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  empty: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.xs,
  },
  listHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  rowChip: {
    flexBasis: 'auto',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  email: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
  },
  role: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
  },
});
