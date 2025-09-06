// config/api.ts
const HOST = 'http://192.168.1.3:3550';           
export const BASE_URL = `${HOST}`;
export const API_BASE = BASE_URL;

type TipoArea = 'mantenimiento' | 'supervision';

if (__DEV__) console.log('[API] BASE_URL =', BASE_URL);

// Helper para querystring
export function q(obj: Record<string, any>) {
  const usp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    usp.set(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}


// Helper para construir rutas adhoc
export const apiUrl = (path: string) =>
  `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

// ---------------------------
// Endpoints centralizados
// ---------------------------
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

// ====== NUEVO: integración MinIO/S3 vía backend /uploads ======
uploads: {
  /** 1) Presign para SUBIR (devuelve { signedUrl, objectKey/key }) */
  presign: (
    filename: string,
    contentType: string,
    codUsuario: number | string,
    tipo?: 'mantenimiento' | 'supervision'
  ) =>
    `${BASE_URL}/uploads/presign${q({
      filename,
      contentType,
      codUsuario,
      ...(tipo ? { tipo } : {}),
    })}`,

  /** 2) Listar por usuario (lee desde tu BD) */
  list: (codUsuario: number | string, take?: number, skip?: number) =>
    `${BASE_URL}/uploads/list${q({
      codUsuario,
      ...(take != null ? { take } : {}),
      ...(skip != null ? { skip } : {}),
    })}`,

  /** 3) Presign de DESCARGA (GET temporal a MinIO) */
  downloadPresign: (key: string) =>
    `${BASE_URL}/uploads/download-presign${q({ key })}`,

  /** 4) Borrar un objeto (DELETE /uploads?key=...) */
  delete: (key: string, codUsuario?: number | string) => ({
    url: `${BASE_URL}/uploads${q({
      key,
      ...(codUsuario != null ? { codUsuario } : {}),
    })}`,
    init: { method: 'DELETE' as const },
  }),

  /** 5) (Opcional) registrar/confirmar metadatos en tu BD (POST JSON) */
  complete: `${BASE_URL}/uploads/complete`,
},

  // Si aún usas Google OAuth, lo dejo igual:
  googleToken: {
    connect: `${BASE_URL}/google-token/connect`,
    callback: (code: string, state?: number | string) =>
      `${BASE_URL}/google-token/callback${q({ code, state })}`,
  },
};

// ---------------------------
// Helpers de subida al signedUrl
// ---------------------------

/**
 * Sube un archivo (Blob/ArrayBuffer) a la signedUrl (PUT).
 * Úsalo en Web/React.
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  data: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const res = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: data as any,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return true;
}

/**
 * Helper para RN/Expo cuando tienes un file:// URI.
 * Pásale un fetcher que lea el uri y devuelva Blob/ArrayBuffer.
 * Ej.: const blob = await (await fetch(uri)).blob();
 */
export async function uploadFromUri(
  signedUrl: string,
  uriToBlob: () => Promise<Blob | ArrayBuffer>,
  contentType: string,
) {
  const body = await uriToBlob();
  return uploadToSignedUrl(signedUrl, body, contentType);
}
