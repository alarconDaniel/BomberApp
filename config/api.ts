// config/api.ts
const HOST = 'http://172.21.103.54:3550';
export const BASE_URL = `${HOST}/api`;
export const API_BASE = BASE_URL;

if (__DEV__) console.log('[API] BASE_URL =', BASE_URL);

// Helper para querystring
function q(obj: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// Helper por si necesitas construir rutas adhoc
export const apiUrl = (path: string) =>
  `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

// Endpoints centralizados
export const API = {
  auth: {
    login: `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh`,
    logout: `${BASE_URL}/auth/logout`,
  },

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

  // Rutas públicas de archivos
  archivo: {
    subir: `${BASE_URL}/public/archivos/subir`,
    urlSubida: `${BASE_URL}/public/archivos/url-subida`,
    listar: (opts?: { codUsuario?: number | string; take?: number; skip?: number }) =>
      `${BASE_URL}/public/archivos/listar${q({
        codUsuario: opts?.codUsuario,
        take: opts?.take ?? 50,
        skip: opts?.skip ?? 0,
      })}`,
    urlDescarga: (path: string) =>
      `${BASE_URL}/public/archivos/url-descarga${q({ path })}`,
    renombrar: `${BASE_URL}/public/archivos/renombrar`,
    eliminar: `${BASE_URL}/public/archivos/eliminar`, // usa DELETE o POST según tu backend
    confirmarTamano: `${BASE_URL}/public/archivos/confirmar-tamano`,
  },
};
