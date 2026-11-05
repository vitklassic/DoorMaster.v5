import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Глубокие ссылки для auth-потоков (подтверждение email, сброс пароля):
// web — origin текущей страницы, native — схема приложения из app.json.
// Platform-проверка защищает обращение к window на native.
export const authRedirectTo =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'doormaster://';

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // redirectTo не объявлен в типах supabase-js для createClient,
          // но воспринимается нижележащим auth-клиентом; значение дублируется
          // в явные вызовы (resetPasswordForEmail) через authRedirectTo
          redirectTo: authRedirectTo,
        },
      } as Parameters<typeof createClient>[2])
    : null;
