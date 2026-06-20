// Cliente API propio del neobanco Zentto Web3.
// - credentials: 'include' (cookies httpOnly zw3_access/zw3_refresh).
// - CSRF double-submit: header x-csrf-token con el valor de la cookie zw3_csrf en mutaciones.
// - auto POST /auth/refresh UNA vez ante 401 (excepto cuando retryOnAuth:false).
// NUNCA se guardan tokens en localStorage: la sesión vive en cookies httpOnly del backend.

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:4100/api';

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Obtiene un token CSRF: primero lee la cookie zw3_csrf; si no existe la siembra vía /auth/csrf. */
export async function getCsrfToken(): Promise<string | null> {
  const fromCookie = readCookie('zw3_csrf');
  if (fromCookie) return fromCookie;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = (await res.json()) as { csrfToken?: string | null };
      return data.csrfToken || readCookie('zw3_csrf');
    }
  } catch {
    /* sin red: devolvemos lo que haya */
  }
  return readCookie('zw3_csrf');
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Si false, NO se intenta refresh+retry ante 401 (usado en el sondeo inicial de /auth/me). */
  retryOnAuth?: boolean;
  signal?: AbortSignal;
  /** Header Idempotency-Key (UUID por intento) para mutaciones que mueven saldo. */
  idempotencyKey?: string;
  /** Evita el bucle: el propio refresh no debe re-disparar refresh. */
  _isRetry?: boolean;
}

/** UUID v4 — usa crypto.randomUUID cuando está disponible, con fallback. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const csrf = await getCsrfToken();
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: csrf ? { 'x-csrf-token': csrf } : undefined,
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Liberamos el lock al final del ciclo de microtareas.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const method = (opts.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  if (MUTATING.has(method)) {
    const csrf = await getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers,
      body,
      signal: opts.signal,
    });
  } catch (err) {
    throw new ApiError(0, 'network_error', String(err));
  }

  // Auto-refresh una sola vez ante 401.
  if (res.status === 401 && opts.retryOnAuth !== false && !opts._isRetry) {
    const ok = await doRefresh();
    if (ok) {
      return apiFetch<T>(path, { ...opts, _isRetry: true });
    }
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : res.statusText) || 'request_failed';
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}
