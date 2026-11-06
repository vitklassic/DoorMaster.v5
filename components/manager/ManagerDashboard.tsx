import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LogOut, Search, ShieldAlert } from 'lucide-react-native';
import { FeedCard } from '@/components/manager/FeedCard';
import { InstallersSidebar } from '@/components/manager/InstallersSidebar';
import { InviteInstallerCard } from '@/components/manager/InviteInstallerCard';
import { MeasurementDetail } from '@/components/MeasurementDetail';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { reportError } from '@/lib/diagnostics';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { Tenant } from '@/lib/auth/tenant';
import { deleteOpeningPhotos } from '@/lib/backend/photoStorage';
import { listCompanyInstallers, subscribeToCompanyInstallers, type CompanyInstaller } from '@/lib/backend/profilesApi';
import { buildFeedItems, filterFeedItems } from '@/lib/measurements/feed';
import { useMeasurements } from '@/lib/measurements/MeasurementsContext';
import type { MeasurementStatus } from '@/lib/measurements/types';

const WIDE_BREAKPOINT = 960;
const SIDEBAR_WIDTH = 280;
const INSTALLERS_ERROR_MESSAGE = 'Не удалось загрузить список монтажников';

// «Все» по умолчанию = active + done: черновики в ленту менеджера не попадают,
// архив показывается отдельным фильтром
type StatusFilter = 'all' | 'active' | 'done' | 'archived';

const STATUS_FILTERS: { id: StatusFilter; label: string; statuses: MeasurementStatus[] }[] = [
  { id: 'all', label: 'Все', statuses: ['active', 'done'] },
  { id: 'active', label: 'Активные', statuses: ['active'] },
  { id: 'done', label: 'Готовые', statuses: ['done'] },
  { id: 'archived', label: 'Архив', statuses: ['archived'] },
];

export function ManagerDashboard() {
  const { user, signOut } = useAuth();

  if (user?.role !== 'manager') {
    return <AccessDenied />;
  }

  return (
    <ManagerWorkspace
      userId={user.id}
      companyId={user.companyId}
      email={user.email}
      onSignOut={signOut}
    />
  );
}

type WorkspaceProps = {
  userId: string;
  companyId: string;
  email: string;
  onSignOut: () => Promise<void>;
};

function ManagerWorkspace({ userId, companyId, email, onSignOut }: WorkspaceProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const { measurements, loading, syncError, deleteMeasurement, deleteOpening, setStatus } = useMeasurements();

  const tenant = useMemo<Tenant>(() => ({ userId, companyId }), [userId, companyId]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [installers, setInstallers] = useState<CompanyInstaller[]>([]);
  const [installersLoading, setInstallersLoading] = useState(true);
  const [installersError, setInstallersError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      setInstallersError(null);
      listCompanyInstallers(tenant)
        .then((list) => {
          if (active) setInstallers(list);
        })
        .catch((error) => {
          reportError(error, 'listCompanyInstallers');
          if (active) setInstallersError(INSTALLERS_ERROR_MESSAGE);
        })
        .finally(() => {
          if (active) setInstallersLoading(false);
        });
    };
    setInstallersLoading(true);
    load();
    const unsubscribe = subscribeToCompanyInstallers(tenant, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [tenant]);

  const activeFilter = STATUS_FILTERS.find((item) => item.id === statusFilter) ?? STATUS_FILTERS[0];
  const feedItems = useMemo(
    () =>
      buildFeedItems(
        measurements.filter(
          (measurement) => measurement.status !== 'draft' && activeFilter.statuses.includes(measurement.status)
        )
      ),
    [measurements, activeFilter]
  );
  const visibleItems = useMemo(() => filterFeedItems(feedItems, query), [feedItems, query]);

  const selected = measurements.find((m) => m.id === selectedId) ?? null;

  const emptyMessage =
    feedItems.length === 0
      ? 'Замеров пока нет. Новые замеры монтажников появятся здесь автоматически'
      : 'Ничего не найдено по вашему запросу';

  if (selected) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent}>
        <MeasurementDetail
          measurement={selected}
          onBack={() => setSelectedId(null)}
          onEditDetails={() => {}}
          onEditOpening={() => {}}
          onAddOpening={() => {}}
          onDeleteOpening={async (openingId) => {
            const opening = selected.openings.find((item) => item.id === openingId);
            const deleted = await deleteOpening(openingId);
            if (deleted) await deleteOpeningPhotos([opening?.photoDataUrl]);
          }}
          onDelete={async () => {
            const deleted = await deleteMeasurement(selected.id);
            if (deleted) {
              await deleteOpeningPhotos(selected.openings.map((opening) => opening.photoDataUrl));
              setSelectedId(null);
            }
          }}
          onSetStatus={(status) => setStatus(selected.id, status)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>Панель менеджера</Text>
          <Text style={styles.userMeta}>
            {email} · {ROLE_LABELS.manager}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void onSignOut()}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}>
          <LogOut size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.signOutText}>Выйти</Text>
        </Pressable>
      </View>

      <View style={[styles.body, isWide && styles.bodyWide]}>
        <View style={[styles.sidebar, isWide && { width: SIDEBAR_WIDTH }]}>
          <View style={styles.sidebarStack}>
            <InviteInstallerCard tenant={tenant} />
            <InstallersSidebar
              installers={installers}
              loading={installersLoading}
              error={installersError}
              horizontal={!isWide}
            />
          </View>
        </View>

        <View style={styles.feed}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>Лента замеров</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>В реальном времени</Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Поиск по названию, адресу или клиенту"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              accessibilityLabel="Поиск по названию, адресу или клиенту"
            />
          </View>

          <View style={styles.filterChips}>
            {STATUS_FILTERS.map((item) => {
              const isActive = item.id === statusFilter;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => setStatusFilter(item.id)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {syncError ? <Text style={styles.error}>{syncError}</Text> : null}

          {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}

          {!loading && visibleItems.length === 0 ? (
            <Text style={styles.empty}>{emptyMessage}</Text>
          ) : null}

          <View style={styles.cards}>
            {visibleItems.map((item) => (
              <FeedCard key={item.key} item={item} onPress={setSelectedId} />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function AccessDenied() {
  return (
    <View style={styles.denied}>
      <View style={styles.deniedIcon}>
        <ShieldAlert size={32} color={colors.error} strokeWidth={2} />
      </View>
      <Text style={styles.deniedTitle}>Доступ запрещен</Text>
      <Text style={styles.deniedText}>Этот раздел доступен только менеджерам компании</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  detailContent: {
    padding: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    color: colors.text,
  },
  userMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  body: {
    gap: spacing.md,
  },
  bodyWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sidebar: {
    width: '100%',
  },
  sidebarStack: {
    gap: spacing.sm,
  },
  feed: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    color: colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.text,
    outlineStyle: 'none',
  } as object,
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  error: {
    fontSize: 11,
    color: colors.error,
  },
  loader: {
    marginVertical: spacing.sm,
  },
  empty: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  cards: {
    gap: spacing.sm,
  },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  deniedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorSoft,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  deniedText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
