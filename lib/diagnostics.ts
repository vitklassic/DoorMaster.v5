import { Platform } from 'react-native';

// T10: test-mode diagnostics.
// Enabled only when the app is started via start-door-master-test.cmd
// (EXPO_PUBLIC_TEST_MODE=1). Normal/production launches keep friendly
// user messages without internal details.
export const isTestMode = process.env.EXPO_PUBLIC_TEST_MODE === '1';

// --- Secret masking -------------------------------------------------------
// JWT access/refresh tokens (three base64url segments starting with eyJ)
const JWT_RE = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g;
// Sensitive query parameters in URLs (signed Storage URLs, auth links)
const PARAM_RE = /([?&](?:apikey|access_token|refresh_token|token|password|secret|key)=)[^&\s"']*/gi;
// Authorization: Bearer <...> headers if they ever appear in an error text
const AUTH_RE = /(bearer\s+)[A-Za-z0-9._~-]+/gi;

export function maskSecrets(text: string): string {
  return text
    .replace(JWT_RE, '***')
    .replace(PARAM_RE, '$1***')
    .replace(AUTH_RE, '$1***');
}

function safeStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Supabase/PostgREST errors carry extra fields beyond Error.message
type SupabaseLikeError = {
  message?: string;
  code?: string | number;
  details?: string;
  hint?: string;
  status?: number;
  statusCode?: number;
};

// Full error card: time, platform, user action, type, message, cause, stack
// and Supabase response details. Secrets are masked before output.
export function describeError(error: unknown, action: string): string {
  const lines: string[] = [];
  lines.push(`time: ${new Date().toISOString()}`);
  lines.push(`platform: ${Platform.OS}`);
  lines.push(`action: ${action}`);
  if (error instanceof Error) {
    lines.push(`type: ${error.name}`);
    lines.push(`message: ${error.message}`);
    const withCause = error as Error & { cause?: unknown };
    if (withCause.cause !== undefined) lines.push(`cause: ${safeStringify(withCause.cause)}`);
    if (error.stack) lines.push(`stack: ${error.stack}`);
    const supa = error as unknown as SupabaseLikeError;
    if (supa.code !== undefined) lines.push(`code: ${String(supa.code)}`);
    if (supa.details) lines.push(`details: ${supa.details}`);
    if (supa.hint) lines.push(`hint: ${supa.hint}`);
    const status = supa.status ?? supa.statusCode;
    if (status !== undefined) lines.push(`status: ${status}`);
  } else {
    lines.push(`value: ${safeStringify(error)}`);
  }
  return maskSecrets(lines.join('\n'));
}

// Writes the full card to the console in test mode. The console output is
// captured into door-master-test.log by the test launcher (phone output is
// forwarded to the same Metro terminal). No-op in normal mode.
export function reportError(error: unknown, action: string): void {
  if (!isTestMode) return;
  console.error(`[TEST-DIAG]\n${describeError(error, action)}`);
}

// Friendly message for the user. In test mode the original (masked) error
// detail is appended so the real cause is visible from the first run.
export function userMessage(friendly: string, error: unknown, action: string): string {
  reportError(error, action);
  if (!isTestMode) return friendly;
  const original = error instanceof Error ? error.message : safeStringify(error);
  return `${friendly}\n[TEST ${action}] ${maskSecrets(original)}`;
}
