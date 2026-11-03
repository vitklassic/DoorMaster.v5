import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthScreen } from '@/components/AuthScreen';
import { ResetPasswordScreen } from '@/components/ResetPasswordScreen';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AuthGate />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading, recovering } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (recovering) {
    return <ResetPasswordScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
