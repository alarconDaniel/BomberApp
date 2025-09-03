// app/auth/useGoogleDriveConnect.ts
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

const EXTRA = (Constants.expoConfig?.extra ?? (Constants.manifest2 as any)?.extra ?? {}) as any;

const EXPO_ID =
  process.env.EXPO_PUBLIC_EXPO_CLIENT_ID ??
  process.env.GOOGLE_OAUTH_CLIENT_ID ??
  EXTRA.expoClientId ?? '';

const EXPO_SECRET =
  process.env.EXPO_PUBLIC_EXPO_CLIENT_SECRET ??
  EXTRA.expoClientSecret ?? '';

const ANDROID_ID =
  process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID ??
  EXTRA.androidClientId ?? '';

const IOS_ID =
  process.env.EXPO_PUBLIC_IOS_CLIENT_ID ??
  EXTRA.iosClientId ?? '';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
  scope?: string;
  id_token?: string;
  created_at?: number;
};

const KEY = { TOKENS: 'google_drive_tokens' };

const googleNativeRedirect = (clientId?: string) => {
  if (!clientId) return undefined;
  const base = clientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${base}:/oauth2redirect`;
};

export function useGoogleDriveConnect() {
  const isExpoGo = Constants.appOwnership === 'expo';
  const owner = (Constants.expoConfig as any)?.owner ?? 'anonymous';
  const slug  = (Constants.expoConfig as any)?.slug  ?? 'app';

  const redirectUri = useMemo(
    () => (isExpoGo ? `https://auth.expo.io/@${owner}/${slug}` : undefined),
    [isExpoGo, owner, slug]
  );

  const clientId = useMemo(
    () =>
      isExpoGo
        ? EXPO_ID
        : Platform.select({ android: ANDROID_ID, ios: IOS_ID, default: EXPO_ID })!,
    [isExpoGo]
  );

  // ► State fijo para evitar que el proxy "pierda" la sesión
  const fixedStateRef = useRef<string>(Math.random().toString(36).slice(2));

  // Evita recrear la request mientras navegas (anti fast-refresh)
  const mountedOnce = useRef(false);
  useEffect(() => { mountedOnce.current = true; }, []);

  // SOLO para diagnosticar el proxy (temporal)
const [request, response, promptAsync] = Google.useAuthRequest({
    clientId,
    responseType: 'token', // ← en vez de 'code'
    scopes: ['openid','email','profile','https://www.googleapis.com/auth/drive.file'],
    redirectUri,
    state: fixedStateRef.current,
    extraParams: { prompt: 'consent' }, // sin offline en el test
    useProxy: true,
    projectNameForProxy: '@philipoh20/bomberapp',
  } as any);

  const ready = !!request && mountedOnce.current;

  console.log('[AUTH v8]', {
    isExpoGo,
    redirectUri: redirectUri ?? '(native)',
    requestRedirect: (request as any)?.redirectUri ?? '(none)',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await SecureStore.getItemAsync(KEY.TOKENS);
      if (raw) try { setTokens(JSON.parse(raw)); } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!response) return;
      console.log('[OAuth RESPONSE]', JSON.stringify(response));
      if (response.type !== 'success') return;

      const { code, state } = response.params as any;
      if (state && state !== fixedStateRef.current) {
        setError('Sesión de OAuth inválida. Intenta de nuevo.');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const nativeRedirect = !isExpoGo
          ? Platform.select({
              android: googleNativeRedirect(ANDROID_ID),
              ios: googleNativeRedirect(IOS_ID),
              default: undefined,
            })
          : undefined;

        const params: Record<string, string> = {
          code,
          client_id: clientId,
          grant_type: 'authorization_code',
          code_verifier: request?.codeVerifier ?? '',
          redirect_uri: isExpoGo ? (redirectUri as string) : (nativeRedirect ?? ''),
        };
        if (!params.redirect_uri) delete params.redirect_uri;
        if (isExpoGo && EXPO_SECRET) params.client_secret = EXPO_SECRET;

        const res = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(params).toString(),
        });

        const data = await res.json();
        if (!res.ok || (data as any)?.error) {
          throw new Error((data as any)?.error_description || (data as any)?.error || 'No se pudo obtener tokens');
        }

        const withMeta: Tokens = { ...(data as Tokens), created_at: Math.floor(Date.now() / 1000) };
        await SecureStore.setItemAsync(KEY.TOKENS, JSON.stringify(withMeta));
        setTokens(withMeta);
      } catch (e: any) {
        setError(e?.message || 'Fallo el intercambio de tokens');
      } finally {
        setLoading(false);
      }
    })();
  }, [response, request?.codeVerifier, isExpoGo, redirectUri, clientId]);

  const refresh = async () => {
    if (!tokens?.refresh_token) throw new Error('No hay refresh_token guardado');

    const params: Record<string, string> = {
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token!,
    };
    if (isExpoGo && EXPO_SECRET) params.client_secret = EXPO_SECRET;

    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const data = await res.json();
    if (!res.ok || (data as any)?.error) {
      throw new Error((data as any)?.error_description || (data as any)?.error || 'No se pudo refrescar el token');
    }

    const merged: Tokens = {
      ...(tokens as Tokens),
      ...(data as Partial<Tokens>),
      created_at: Math.floor(Date.now() / 1000),
    };
    setTokens(merged);
    await SecureStore.setItemAsync(KEY.TOKENS, JSON.stringify(merged));
    return merged;
  };

  const connect = async () => {
    setError(null);
    if (!ready) throw new Error('La autorización aún no está lista. Intenta de nuevo.');
    await promptAsync(); // sin opciones
  };

  const disconnect = async () => {
    await SecureStore.deleteItemAsync(KEY.TOKENS);
    setTokens(null);
  };

  const getAccessToken = async () => {
    if (!tokens) return null;
    const now = Math.floor(Date.now() / 1000);
    const expAt = (tokens.created_at ?? now) + (tokens.expires_in ?? 0) - 60;
    if (now >= expAt && tokens.refresh_token) {
      const t = await refresh();
      return t.access_token;
    }
    return tokens.access_token;
  };

  return { request, ready, loading, errorMsg, tokens, connect, disconnect, getAccessToken };
}
