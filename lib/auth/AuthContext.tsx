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
  type SignUpResult,
} from '@/lib/backend/authApi';
import { isSupabaseConfigured } from '@/lib/backend/supabaseClient';
import { reportError } from '@/lib/diagnostics';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  recovering: boolean;
  awaitingConfirmation: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName: string, inviteCode: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  completePasswordReset: (newPassword: string) => Promise<void>;
  clearAwaitingConfirmation: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuthChanges((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      // Вход после подтверждения email по ссылке — сбрасываем экран «Проверьте почту»
      if (event === 'SIGNED_IN') setAwaitingConfirmation(null);
      setUser(next);
    });
    getCurrentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch((error) => {
        reportError(error, 'getCurrentUser');
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
    setUser(await authSignIn(email, password));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, companyName: string, inviteCode: string): Promise<SignUpResult> => {
      const result = await authSignUp(email, password, companyName, inviteCode);
      if (result.kind === 'confirmation_required') {
        setAwaitingConfirmation(result.email);
        return result;
      }
      setUser(result.user);
      return result;
    },
    []
  );

  const clearAwaitingConfirmation = useCallback(() => setAwaitingConfirmation(null), []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setRecovering(false);
    setAwaitingConfirmation(null);
    setUser(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authRequestPasswordReset(email);
    if (!isSupabaseConfigured) setRecovering(true);
  }, []);

  const completePasswordReset = useCallback(async (newPassword: string) => {
    const updated = await authUpdatePassword(newPassword);
    setRecovering(false);
    setUser(updated);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      recovering,
      awaitingConfirmation,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
      clearAwaitingConfirmation,
    }),
    [user, loading, recovering, awaitingConfirmation, signIn, signUp, signOut, requestPasswordReset, completePasswordReset, clearAwaitingConfirmation]
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
