// auth/AuthContext.tsx
import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState
} from 'react';
import * as SecureStore from 'expo-secure-store';

/** Ajusta si tu backend usa otro host/puerto */
const BASE_URL = 'http://192.168.1.60:3550/api'; // ← incluye /api
const LOGIN_PATH = '/usuario/login';             // ← endpoint real de login
// Si tu backend NO tiene refresh, déjalo en null y no se intentará refrescar.
const REFRESH_PATH: string | null = null;        // p.ej. '/usuario/refresh' si existe

const ACCESS_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY   = 'auth_user';
const DEFAULT_TIMEOUT = 10000; // 10s

type Rol = 'admin' | 'operario';
type User = { id: number; email: string; rol: Rol } | null;
type Tokens = { access_token: string; refresh_token: string } | null;

type AuthContextShape = {
  user: User;
  tokens: Tokens;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchJson: <T = any>(path: string, init?: RequestInit & { noAuth?: boolean; timeoutMs?: number }) => Promise<T>;
  baseUrl: string;
};

export class ApiError extends Error {
  status: number;
  body?: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function normalizeRol(raw: any): Rol {
  const s = String(raw ?? '').toLowerCase().trim();
  if (s === '1' || ['admin', 'administrator', 'administrador', 'adm'].includes(s)) return 'admin';
  if (s === '2' || ['operario', 'operador', 'worker', 'user', 'empleado'].includes(s)) return 'operario';
  return 'operario';
}

async function saveTokens(tokens: Tokens, user: User) {
  if (!tokens) {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function loadTokens(): Promise<{ tokens: Tokens; user: User }> {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  let user: User = userStr ? JSON.parse(userStr) : null;
  if (user && !(user as any).rol) user = { ...user, rol: 'operario' } as User;

  return {
    // Guardamos tokens sólo si tenemos ambos (si no usas refresh, guardamos un placeholder)
    tokens: (access && refresh) ? { access_token: access, refresh_token: refresh } : null,
    user
  };
}

async function parseBody(res: Response) {
  const text = await res.text().catch(() => '');
  try { return text ? JSON.parse(text) : undefined; } catch { return text; }
}

function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new ApiError(408, 'Tiempo de espera agotado (sin respuesta del servidor)')), ms);
    p.then(v => { clearTimeout(id); resolve(v); })
     .catch(e => { clearTimeout(id); reject(e); });
  });
}

/** Convierte '/ruta' o 'ruta' a URL absoluta uniendo BASE_URL */
function toUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const AuthContext = createContext<AuthContextShape | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<Tokens>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef<Promise<Tokens | null> | null>(null);

  useEffect(() => {
    (async () => {
      const { tokens, user } = await loadTokens();
      setTokens(tokens);
      setUser(user);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const url = toUrl(LOGIN_PATH);
    try {
      const res = await withTimeout(fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }));

      if (!res.ok) {
        const body = await parseBody(res);
        const msg =
          (body as any)?.message ||
          (res.status === 401 ? 'Correo o contraseña inválidos' :
           res.status === 404 ? 'Usuario no encontrado' :
           `Error ${res.status}`);
        throw new ApiError(res.status, msg, body);
      }

      const data = await res.json();

      // Flexibilidad: distintos backends nombran distinto
      const access = data.access_token ?? data.token ?? data.accessToken;
      const refresh = data.refresh_token ?? data.refreshToken ?? 'no-refresh'; // placeholder si no hay refresh
      if (!access) throw new ApiError(500, 'Respuesta de login inválida (sin access_token)');

      const rawUser = data.user || {};
      const nextUser: User = {
        id: Number(rawUser.id ?? rawUser.codUsuario ?? 0),
        email: String(rawUser.email ?? rawUser.correo ?? rawUser.correo_usuario ?? ''),
        rol: normalizeRol(rawUser.rol ?? rawUser.cod_rol),
      };

      const nextTokens: Tokens = { access_token: String(access), refresh_token: String(refresh) };

      setTokens(nextTokens);
      setUser(nextUser);
      await saveTokens(nextTokens, nextUser);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (e?.name === 'AbortError') {
        throw new ApiError(0, 'Tiempo de espera agotado. Verifica conexión/IP/puerto.');
      }
      if (msg.includes('Network request failed')) {
        throw new ApiError(0, `No se pudo conectar a ${url}. Revisa que el teléfono y el PC estén en la misma red, que la IP sea accesible y que el firewall permita el puerto.`);
      }
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setTokens(null);
    setUser(null);
    await saveTokens(null, null);
  }, []);

  const doRefresh = useCallback(async (): Promise<Tokens | null> => {
    if (!REFRESH_PATH) return null;                        // ← sin refresh en backend
    if (refreshingRef.current) return refreshingRef.current;
    if (!tokens?.refresh_token || tokens.refresh_token === 'no-refresh') return null;

    refreshingRef.current = (async () => {
      try {
        const res = await withTimeout(fetch(toUrl(REFRESH_PATH), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        }));

        if (!res.ok) {
          const body = await parseBody(res);
          console.log('[Auth][Refresh] fallo', res.status, body);
          await logout();
          return null;
        }

        const data = await res.json();
        const newTokens: Tokens = {
          access_token: data.access_token ?? data.token,
          refresh_token: data.refresh_token ?? tokens.refresh_token,
        };
        if (!newTokens.access_token) throw new ApiError(500, 'Refresh inválido');

        setTokens(newTokens);
        await saveTokens(newTokens, user);
        return newTokens;
      } catch (e: any) {
        console.log('[Auth][Refresh] error', e?.message || e);
        await logout();
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();

    return refreshingRef.current;
  }, [tokens?.refresh_token, user, logout]);

  const fetchJson = useCallback(async <T = any,>(
    path: string,
    init: RequestInit & { noAuth?: boolean; timeoutMs?: number } = {}
  ): Promise<T> => {
    const url = toUrl(path);
    const headers = new Headers(init.headers || {});
    const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT;

    let access = tokens?.access_token;

    if (!init.noAuth) {
      if (!access) throw new ApiError(401, 'No autenticado');
      headers.set('Authorization', `Bearer ${access}`);
    }
    if (!headers.get('Content-Type')) headers.set('Content-Type', 'application/json');

    const doRequest = async (h: Headers) => {
      try {
        const res = await withTimeout(fetch(url, { ...init, headers: h }), timeoutMs);
        if (!res.ok) {
          if (res.status === 401 && !init.noAuth && tokens?.refresh_token && REFRESH_PATH) {
            const refreshed = await doRefresh();
            if (refreshed?.access_token) {
              const h2 = new Headers(init.headers || {});
              h2.set('Authorization', `Bearer ${refreshed.access_token}`);
              if (!h2.get('Content-Type')) h2.set('Content-Type', 'application/json');

              const retry = await withTimeout(fetch(url, { ...init, headers: h2 }), timeoutMs);
              if (!retry.ok) {
                const body2 = await parseBody(retry);
                const msg2 = (body2 as any)?.message || `Error ${retry.status}`;
                throw new ApiError(retry.status, msg2, body2);
              }
              return retry;
            }
          }
          const body = await parseBody(res);
          const msg = (body as any)?.message || `Error ${res.status}`;
          throw new ApiError(res.status, msg, body);
        }
        return res;
      } catch (e: any) {
        const m = String(e?.message || e);
        if (e?.name === 'AbortError' || (e instanceof ApiError && e.status === 408)) {
          throw new ApiError(0, `Tiempo de espera agotado al conectar con ${url}.`);
        }
        if (m.includes('Network request failed')) {
          throw new ApiError(0, `No se pudo conectar con ${url} (red/IP/puerto/firewall).`);
        }
        throw e;
      }
    };

    const r = await doRequest(headers);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) return r.json() as Promise<T>;
    return (r.text() as unknown) as T;
  }, [tokens?.access_token, tokens?.refresh_token, doRefresh]);

  const value = useMemo<AuthContextShape>(() => ({
    user, tokens, loading, login, logout, fetchJson, baseUrl: BASE_URL
  }), [user, tokens, loading, login, logout, fetchJson]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
