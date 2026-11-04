import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getCurrentUser,
  requestPasswordReset as authRequestPasswordReset,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  subscribeToAuthChanges,
  updatePassword as authUpdatePassword,
  type AuthUser,
} from '@/lib/backend/authApi';
import { isSupabaseConfigured } from '@/lib/backend/supabaseClient';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FORCE_MANAGER_ROLE = true;

function withDebugRole(next: AuthUser | null): AuthUser | null {
  if (!next || !FORCE_MANAGER_ROLE) return next;
  return { ...next, role: 'manager' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthChanges((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      setUser(withDebugRole(next));
    });
    getCurrentUser()
      .then((current) => {
        if (active) setUser(withDebugRole(current));
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(withDebugRole(await authSignIn(email, password)));
  }, []);

  const signUp = useCallback(async (email: string, password: string, companyName: string, inviteCode: string) => {
    setUser(await authSignUp(email, password, companyName, inviteCode));
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setRecovering(false);
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authRequestPasswordReset(email);
    if (!isSupabaseConfigured) setRecovering(true);
  }, []);

  const completePasswordReset = useCallback(async (newPassword: string) => {
    const updated = await authUpdatePassword(newPassword);
    setRecovering(false);
    setUser(withDebugRole(updated));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      recovering,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
    }),
    [user, loading, recovering, signIn, signUp, signOut, requestPasswordReset, completePasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
