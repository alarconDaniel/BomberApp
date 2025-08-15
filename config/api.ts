// config/api.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = Number(process.env.EXPO_PUBLIC_API_PORT) || 3550;
const PREFIX = (process.env.EXPO_PUBLIC_API_PREFIX || '').replace(/^\/+|\/+$/g, ''); // ej: "api"

/**
 * Intenta deducir el host local a partir de la IP que muestra Metro/Expo Go.
 * Metro suele exponer algo tipo: 192.168.1.5:8081
 */
function deriveHostFromExpo(): string | null {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||         // SDKs recientes
    (Constants as any).manifest?.debuggerHost ||      // SDKs viejos
    (Constants as any).manifest2?.extra?.expoClient?.hostUri || null;

  if (!hostUri) return null;

  const host = String(hostUri).split(':')[0]; // "192.168.1.5"
  // Acepta IPv4 o nombre de host
  if (!host) return null;
  return host;
}

/**
 * Resuelve la BASE_URL en este orden:
 * 1) EXPO_PUBLIC_API_URL (por si quieres usar ngrok o un servidor remoto)
 * 2) Deducción de la IP desde Expo Go (LAN)
 * 3) Fallbacks por plataforma (emulador Android / iOS simulator / web)
 */
function resolveBaseUrl(): string {
  // 1) Si alguien define EXPO_PUBLIC_API_URL, usarla tal cual (no rompe a nadie).
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // 2) Intentar deducir la IP de la PC desde Expo Go
  const derivedHost = deriveHostFromExpo();
  if (derivedHost) {
    const prefix = PREFIX ? `/${PREFIX}` : '';
    return `http://${derivedHost}:${DEFAULT_PORT}${prefix}`;
  }

  // 3) Fallbacks por plataforma
  const prefix = PREFIX ? `/${PREFIX}` : '';
  if (Platform.OS === 'android') {
    // Emulador Android
    return `http://10.0.2.2:${DEFAULT_PORT}${prefix}`;
  }
  // iOS simulator o web
  return `http://localhost:${DEFAULT_PORT}${prefix}`;
}

export const BASE_URL = resolveBaseUrl();

export const API = {
  listar: `${BASE_URL}/reto/listar`,
  crear: `${BASE_URL}/reto/crear`,
};
