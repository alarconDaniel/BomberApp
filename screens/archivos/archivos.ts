// screens/archivos/archivos.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { API, BASE_URL } from '../../config/api';

// ===== Tipos (lado front) =====
export type ArchivoItem = {
  codArchivo?: number;
  nombreOriginal: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  fechaSubida: string;
  area?: string | null;
  codUsuario?: number;
};

type ListadoRespCamel = {
  total: number;
  rows: Array<{
    codArchivo?: number;
    nombreOriginal: string;
    path: string;
    contentType: string | null;
    sizeBytes: number | string;
    fechaSubida: string;
    area?: string | null;
    usuario?: { codUsuario?: number };
  }>;
};

type ListadoRespSnake = {
  total: number;
  rows: Array<{
    cod_archivo?: number;
    nombre_original: string;
    ruta_archivo: string;
    tipo_contenido: string | null;
    tamano_bytes: number | string;
    fecha_creacion: string;
    area?: string | null;
    cod_usuario?: number;
  }>;
};

type ListadoRespRaw = ListadoRespCamel | ListadoRespSnake;
type ListadoResp = { total: number; rows: ArchivoItem[] };
type UrlSubidaResp = { url: string; path: string; precreado?: any | null };
type UrlDescargaResp = { url: string };

// ===== Helper fetch =====
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  console.log('➡️ FETCH', url, init?.method ?? 'GET');
  const r = await fetch(url, init);
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} ${url}: ${txt || r.statusText}`);
  }
  return r.json() as Promise<T>;
}

// ===== Mapper BD → Front (tolera camelCase y snake_case) =====
function mapRow(row: (ListadoRespCamel['rows'][number] & ListadoRespSnake['rows'][number])): ArchivoItem {
  const codArchivo =
    (row as any).codArchivo ?? (row as any).cod_archivo;
  const nombreOriginal =
    (row as any).nombreOriginal ?? (row as any).nombre_original;
  const path =
    (row as any).path ?? (row as any).ruta_archivo;
  const contentType =
    (row as any).contentType ?? (row as any).tipo_contenido ?? 'application/octet-stream';
  const sizeRaw =
    (row as any).sizeBytes ?? (row as any).tamano_bytes ?? 0;
  const sizeBytes = typeof sizeRaw === 'string' ? Number(sizeRaw) : sizeRaw;
  const fechaSubida =
    (row as any).fechaSubida ?? (row as any).fecha_creacion;
  const codUsuario =
    (row as any).codUsuario ??
    (row as any).cod_usuario ??
    (row as any).usuario?.codUsuario;

  return {
    codArchivo,
    nombreOriginal,
    path,
    contentType,
    sizeBytes: Number(sizeBytes || 0),
    fechaSubida,
    area: (row as any).area ?? null,
    codUsuario,
  };
}

// ===== CREATE =====

// Subir con URL firmada (PUT directo a bucket / GCS)
export async function seleccionarYSubir({
  carpeta = 'docs',
  codUsuario,
}: {
  carpeta?: string;
  codUsuario?: number;
}) {
  const pick = await DocumentPicker.getDocumentAsync({ multiple: false });
  if (pick.canceled || !pick.assets?.length) return { cancelado: true };

  const asset = pick.assets[0];
  const uri = asset.uri;
  const nombre = asset.name ?? 'archivo.bin';
  const tipo = asset.mimeType ?? 'application/octet-stream';

  const body: any = { nombre, tipoContenido: tipo, carpeta };
  if (codUsuario != null) body.codUsuario = codUsuario;

  const { url, path } = await req<UrlSubidaResp>(API.archivo.urlSubida, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const put = await FileSystem.uploadAsync(url, uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': tipo },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (put.status !== 200 && put.status !== 201) {
    throw new Error(`PUT upload failed ${put.status}: ${put.body ?? ''}`);
  }

  await req(API.archivo.confirmarTamano, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  return { ok: true, path, nombre, tipo };
}

// Subir pasando por backend (form-data)
export async function subirViaBackend({ codUsuario }: { codUsuario?: number }) {
  const pick = await DocumentPicker.getDocumentAsync({ multiple: false });
  if (pick.canceled || !pick.assets?.length) return { cancelado: true };

  const asset = pick.assets[0];
  const uri = asset.uri;
  const nombre = asset.name ?? 'archivo.bin';
  const tipo = asset.mimeType ?? 'application/octet-stream';

  const fd = new FormData();
  (fd as any).append('archivo', { uri, name: nombre, type: tipo } as any);
  if (codUsuario != null) fd.append('codUsuario', String(codUsuario));

  const r = await fetch(API.archivo.subir, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`POST /archivos/subir ${r.status}: ${await r.text()}`);
  return r.json();
}

// ===== READ =====
export async function listarArchivos({
  codUsuario,
  take = 50,
  skip = 0,
  admin = false,
  q,
  area,
}: {
  codUsuario?: number;
  take?: number;
  skip?: number;
  admin?: boolean;
  q?: string;
  area?: string;
}) {
  let url: string;

  if (admin) {
    const params = new URLSearchParams();
    params.set('take', String(take));
    params.set('skip', String(skip));
    if (q) params.set('q', q);
    if (area) params.set('area', area);
    url = `${BASE_URL}/archivos/listar?${params.toString()}`;
  } else {
    // ✅ API.archivo.listar ahora espera un objeto (no 3 args)
    url = API.archivo.listar({ codUsuario, take, skip });
    // Puedes agregar filtros extra si tu backend los soporta
    if (q || area) {
      const extra = new URLSearchParams();
      if (q) extra.set('q', q);
      if (area) extra.set('area', area);
      url += `&${extra.toString()}`;
    }
  }

  const raw = await req<ListadoRespRaw>(url);
  const rows = (raw as any).rows?.map(mapRow) ?? [];
  const total = (raw as any).total ?? rows.length;

  return { total, rows } as ListadoResp;
}

export async function obtenerUrlDescarga(path: string) {
  return req<UrlDescargaResp>(API.archivo.urlDescarga(path));
}

// ===== UPDATE =====
export async function renombrarArchivo(path: string, nuevoNombre: string) {
  return req<ArchivoItem>(API.archivo.renombrar, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, nuevoNombre }),
  });
}

// ===== DELETE =====
export async function eliminarArchivo({
  path,
  codUsuario,
}: {
  path: string;
  codUsuario?: number;
}) {
  // Primero intenta DELETE con body; si falla, fallback a POST
  try {
    return await req<{ deleted?: boolean; eliminado?: boolean }>(API.archivo.eliminarDELETE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codUsuario, path }),
    });
  } catch (e) {
    // Fallback (habilita @Post('eliminar') en el controller si aún no lo tienes)
    return req<{ deleted?: boolean; eliminado?: boolean }>(API.archivo.eliminarPOST, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codUsuario, path }),
    });
  }
}
