// config/api.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = Number(process.env.EXPO_PUBLIC_API_PORT) || 3550; // ← 3550
const PREFIX = (process.env.EXPO_PUBLIC_API_PREFIX ?? '').replace(/^\/+|\/+$/g, '');

function getExpoHost(): string | null {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    '';
  if (!hostUri) return null;
  try {
    const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    const host = url.hostname; // 192.168.x.x, localhost, exp.host, etc.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost') return host;
    return null; // ignora exp.host (Tunnel)
  } catch { return null; }
}

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const host = getExpoHost();
  const prefix = PREFIX ? `/${PREFIX}` : '';
  if (host) return `http://${host}:${DEFAULT_PORT}${prefix}`;

  // Fallbacks
  if (Platform.OS === 'android') return `http://10.0.2.2:${DEFAULT_PORT}${prefix}`;
  return `http://localhost:${DEFAULT_PORT}${prefix}`;
}

export const BASE_URL = resolveBaseUrl();
if (__DEV__) console.log('[API] BASE_URL =', BASE_URL);

export const API = {
  reto: {
    listar: `${BASE_URL}/reto/listar`,
    crear: `${BASE_URL}/reto/crear`,
    modificar: `${BASE_URL}/reto/modificar`,
    borrar: (cod: number | string) => `${BASE_URL}/reto/borrar/${cod}`,
  },
  usuario: {
    listar: `${BASE_URL}/usuario/listar`,
    crear: `${BASE_URL}/usuario/crear`,
    obtener: (id: string|number) => `${BASE_URL}/usuario/${id}`,
    actualizar: (id: string|number) => `${BASE_URL}/usuario/${id}`,
    modificar: `${BASE_URL}/usuario/modificar`,
    borrar: (cod: number | string) => `${BASE_URL}/usuario/borrar/${cod}`,
  },
};
