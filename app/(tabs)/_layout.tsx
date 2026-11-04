import { Tabs } from 'expo-router';
import { ClipboardList, FilePlus, LayoutDashboard } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';
import { MeasurementsProvider } from '@/lib/measurements/MeasurementsContext';

export default function TabsLayout() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  return (
    <MeasurementsProvider>
      <Tabs
        initialRouteName={isManager ? 'manager' : 'index'}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderSoft },
          tabBarLabelStyle: { fontSize: 8, fontWeight: '600' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Новый замер',
            tabBarIcon: ({ color, size }) => <FilePlus color={color} size={size} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Мои замеры',
            tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={2} />,
          }}
        />
        <Tabs.Screen
          name="manager"
          options={{
            title: 'Панель',
            href: isManager ? undefined : null,
            tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} strokeWidth={2} />,
          }}
        />
      </Tabs>
    </MeasurementsProvider>
  );
}
