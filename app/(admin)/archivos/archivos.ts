// screens/archivos/archivos.ts
import { Platform } from 'react-native';

const BASE_URL = __DEV__
  ? 'http://192.168.1.5:3550/api'
  : 'http://192.168.1.5:3550/api'; // ajusta si usas prod

export type ArchivoItem = {
  nombreOriginal: string;
  path: string;            // fileId de Drive (ruta_archivo)
  contentType: string;     // tipo_contenido
  sizeBytes: string;       // string para evitar BigInt
  fechaSubida: string;     // ISO (fecha_creacion)
  area?: string | null;
  codUsuario?: number | null;
};

function mapRowToArchivoItem(row: any): ArchivoItem {
  return {
    nombreOriginal: row?.nombreOriginal ?? row?.nombre_original ?? 'archivo',
    path: row?.rutaArchivo ?? row?.ruta_archivo ?? '',
    contentType: row?.tipoContenido ?? row?.tipo_contenido ?? 'application/octet-stream',
    sizeBytes: String(row?.tamanoBytes ?? row?.tamano_bytes ?? '0'),
    fechaSubida: row?.fechaCreacion ?? row?.fecha_creacion ?? new Date().toISOString(),
    area: row?.area ?? null,
    codUsuario: row?.codUsuario ?? row?.cod_usuario ?? null,
  };
}

async function safeFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* noop */ }

  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status} ${url}`;
    throw new Error(msg);
  }
  return json;
}

/** Lista archivos desde /archivos/listar (mapea nombres a los que espera el front) */
export async function listarArchivos(params: {
  take?: number;
  skip?: number;
  codUsuario?: number;
}) {
  const take = params.take ?? 100;
  const skip = params.skip ?? 0;
  const qs = new URLSearchParams();
  qs.set('take', String(take));
  qs.set('skip', String(skip));
  if (params.codUsuario) qs.set('codUsuario', String(params.codUsuario));

  const url = `${BASE_URL}/archivos/listar?${qs.toString()}`;
  const data = await safeFetch(url);

  const rows = Array.isArray(data?.rows) ? data.rows : data?.data || [];
  const total = Number(data?.total ?? 0);
  const items: ArchivoItem[] = rows.map(mapRowToArchivoItem);
  return { total, items };
}

/** Pide URL de descarga pública a /archivos/url-descarga?path=... */
export async function obtenerUrlDescarga(path: string) {
  const url = `${BASE_URL}/archivos/url-descarga?path=${encodeURIComponent(path)}`;
  const data = await safeFetch(url);
  // backend puede devolver { url } o string; soporta ambos
  return typeof data === 'string' ? data : (data?.url ?? data);
}

/** Elimina: usa POST /archivos/eliminar  (body: { path, codUsuario }) */
export async function eliminarArchivo(path: string, codUsuario: number) {
  const url = `${BASE_URL}/archivos/eliminar`;
  const data = await safeFetch(url, {
    method: 'POST',
    body: JSON.stringify({ path, codUsuario }),
  });
  return data?.deleted === true;
}
