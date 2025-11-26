// auth/AuthContext.tsx
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import * as SecureStore from 'expo-secure-store';

type Rol = 'admin' | 'operario';

type User = { id: number; email: string; rol: Rol } | null; // <-- AÑADIMOS rol

type Tokens = {
  access_token: string;
  refresh_token: string;
} | null;

type AuthContextShape = {
  user: User;
  tokens: Tokens;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchJson: <T=any>(path: string, init?: RequestInit & { noAuth?: boolean }) => Promise<T>;
  baseUrl: string;
};

const AuthContext = createContext<AuthContextShape | null>(null);
const BASE_URL = 'http://192.168.20.35:3550';

const ACCESS_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY   = 'auth_user';

class ApiError extends Error {
  status: number;
  body?: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// --- Normalizador de rol ---
function normalizeRol(raw: any): Rol {
  const s = String(raw ?? '').toLowerCase().trim();
  if (['admin', 'administrator', 'administrador', 'adm'].includes(s)) return 'admin';
  if (['operario', 'operador', 'worker', 'user', 'empleado'].includes(s)) return 'operario';
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

async function loadTokens(): Promise<{tokens: Tokens, user: User}> {
  const access = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  let user: User = userStr ? JSON.parse(userStr) : null;

  // por si guardaste usuarios sin rol en el pasado:
  if (user && !(user as any).rol) {
    user = { ...user, rol: 'operario' } as User;
  }
  return {
    tokens: (access && refresh) ? { access_token: access, refresh_token: refresh } : null,
    user
  };
}

async function parseBody(res: Response) {
  const text = await res.text().catch(()=> '');
  try { return text ? JSON.parse(text) : undefined; } catch { return text; }
}

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [tokens, setTokens] = useState<Tokens>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef<Promise<Tokens | null> | null>(null);

  useEffect(() => {
    (async () => {
      const {tokens, user} = await loadTokens();
      setTokens(tokens);
      setUser(user);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await parseBody(res);
      const msg = (body as any)?.message || (res.status === 401 ? 'Correo o contraseña inválidos' : `Error ${res.status}`);
      throw new ApiError(res.status, msg, body);
    }
    const data = await res.json();
    // Esperado del backend:
    // { user: { id, email, rol }, access_token, refresh_token }
    const nextTokens = { access_token: data.access_token, refresh_token: data.refresh_token };
    const rawUser = data.user || {};
    const nextUser = {
      id: rawUser.id,
      email: rawUser.email,
      rol: normalizeRol(rawUser.rol), // <-- aquí normalizamos
    } as User;

    setTokens(nextTokens);
    setUser(nextUser);
    await saveTokens(nextTokens, nextUser);
  }, []);

  const logout = useCallback(async () => {
    setTokens(null);
    setUser(null);
    await saveTokens(null, null);
  }, []);

  const doRefresh = useCallback(async (): Promise<Tokens | null> => {
    if (refreshingRef.current) return refreshingRef.current;
    if (!tokens?.refresh_token) return null;

    refreshingRef.current = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ refresh_token: tokens.refresh_token }),
        });
        if (!res.ok) {
          const body = await parseBody(res);
          console.log('[Auth][Refresh] fallo', res.status, body);
          await logout();
          return null;
        }
        const data = await res.json();
        const newTokens: Tokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
        setTokens(newTokens);
        await saveTokens(newTokens, user); // user ya persistido con rol
        return newTokens;
      } catch (e) {
        console.log('[Auth][Refresh] error', e);
        await logout();
        return null;
      } finally {
        refreshingRef.current = null;
      }
    })();

    return refreshingRef.current;
  }, [tokens?.refresh_token, user, logout]);

  const fetchJson = useCallback(async <T=any,>(path: string, init: RequestInit & { noAuth?: boolean } = {}): Promise<T> => {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    const headers = new Headers(init.headers || {});
    let useAccess = tokens?.access_token;

    if (!init.noAuth) {
      if (!useAccess) throw new ApiError(401, 'No autenticado');
      headers.set('Authorization', `Bearer ${useAccess}`);
    }
    headers.set('Content-Type', headers.get('Content-Type') || 'application/json');

    const doRequest = async (h: Headers) => {
      const res = await fetch(url, {...init, headers: h});
      if (!res.ok) {
        if (res.status === 401 && !init.noAuth && tokens?.refresh_token) {
          const refreshed = await doRefresh();
          if (refreshed?.access_token) {
            const h2 = new Headers(init.headers || {});
            h2.set('Authorization', `Bearer ${refreshed.access_token}`);
            h2.set('Content-Type', headers.get('Content-Type')!);
            const retry = await fetch(url, {...init, headers: h2});
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