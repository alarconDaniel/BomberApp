// config/api.ts (FRONTEND)
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = Number(process.env.EXPO_PUBLIC_API_PORT) || 3550;
const RAW_PREFIX = (process.env.EXPO_PUBLIC_API_PREFIX ?? 'api').trim();
const PREFIX = RAW_PREFIX.replace(/^\/+|\/+$/g, ''); // 'api'

function getExpoHost(): string | null {
  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri || '';
  if (!hostUri) return null;
  try {
    const url = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    const host = url.hostname;
    return (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost') ? host : null;
  } catch {
    return null;
  }
}

function ensurePrefix(url: string, prefix: string) {
  // agrega '/api' si no está al final del host
  const u = new URL(url);
  const has = u.pathname.replace(/\/+$/, '');
  const want = `/${prefix}`;
  u.pathname = has === '' ? want : has.endsWith(want) ? has : `${has}${want}`;
  return u.toString().replace(/\/+$/, '');
}

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    // si el env ya trae http(s), se valida y se asegura el /api
    if (/^https?:\/\//i.test(envUrl)) return ensurePrefix(envUrl, PREFIX);
    // si el env trae solo host:puerto
    return ensurePrefix(`http://${envUrl}`, PREFIX);
  }

  const host = getExpoHost();
  const origin = host
    ? `http://${host}:${DEFAULT_PORT}`
    : Platform.OS === 'android'
      ? `http://10.0.2.2:${DEFAULT_PORT}`
      : `http://localhost:${DEFAULT_PORT}`;

  return ensurePrefix(origin, PREFIX);
}

export const BASE_URL = resolveBaseUrl();
export const API_BASE = BASE_URL;
if (__DEV__) console.log('[API] BASE_URL =', BASE_URL);

function q(obj: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

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
    obtener: (id: string | number) => `${BASE_URL}/usuario/${id}`,
    actualizar: (id: string | number) => `${BASE_URL}/usuario/${id}`,
    modificar: `${BASE_URL}/usuario/modificar`,
    borrar: (cod: number | string) => `${BASE_URL}/usuario/borrar/${cod}`,
  },
// config/api.ts – cambia únicamente las rutas de archivo:
archivo: {
  subir: `${BASE_URL}/public/archivos/subir`,
  urlSubida: `${BASE_URL}/public/archivos/url-subida`,
  listar: (opts?: { codUsuario?: number | string; take?: number; skip?: number }) =>
    `${BASE_URL}/public/archivos/listar${q({
      codUsuario: opts?.codUsuario,
      take: opts?.take ?? 50,
      skip: opts?.skip ?? 0,
    })}`,
  urlDescarga: (path: string) => `${BASE_URL}/public/archivos/url-descarga${q({ path })}`,
  renombrar: `${BASE_URL}/public/archivos/renombrar`,
  eliminarDELETE: `${BASE_URL}/public/archivos/eliminar`,
  eliminarPOST: `${BASE_URL}/public/archivos/eliminar`,
  confirmarTamano: `${BASE_URL}/public/archivos/confirmar-tamano`,
}

};
