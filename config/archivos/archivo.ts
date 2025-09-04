// screens/archivos/archivos.ts  (o src/api/archivos.ts)
import { useAuth } from '../../auth/AuthContext';

/** ======== Modelos usados por la UI (compatibles con tu código existente) ======== */
export type Archivo = {
  // (Ya no viene de Drive, lo dejamos por compatibilidad si tu app lo usa en otro lado)
  codArchivo: number;
  codUsuario: number;
  rutaArchivo: string;
  nombreOriginal: string;
  tipoContenido: string;
  tamanoBytes: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
  area?: string | null;
};

export type ArchivoItem = {
  /** En MinIO: la "key" (ej: usuarios/1/xxx.pdf) */
  path: string;
  /** basename de la key (ej: xxx.pdf) */
  nombreOriginal: string;
  /** Si no lo sabemos, cadena vacía. */
  contentType: string;
  /** ISO; viene de lastModified del listado. */
  fechaSubida: string;
  codUsuario?: number | null;
  area?: string | null;
};

/** Respuesta de /uploads/list */
type S3ListResp = {
  prefix: string;
  items: Array<{ key: string; size?: number; lastModified?: string }>;
};

function basename(p: string) {
  const parts = p.split('/');
  return parts[parts.length - 1] || p;
}

/** Mapea item de S3 (MinIO) → ArchivoItem esperado por la UI */
function mapFromS3(key: string, size?: number, lastModified?: string): ArchivoItem {
  return {
    path: key,
    nombreOriginal: basename(key),
    contentType: '', // no viene en /uploads/list; lo puedes rellenar si lo guardas en tu BD
    fechaSubida: lastModified || new Date().toISOString(),
    codUsuario: undefined,
    area: null,
  };
}

/** ======== API factory usando fetchJson (con JWT) ======== */
export function makeArchivosApi(
  fetchJson: <T = any>(path: string, init?: RequestInit & { noAuth?: boolean }) => Promise<T>,
  _baseUrl?: string,
) {
  /**
   * Lista archivos por usuario (usa el prefijo usuarios/{cod}/)
   * GET /uploads/list?codUsuario=...
   */
  const listarArchivos = async (opts?: { take?: number; skip?: number; codUsuario?: number }) => {
    const codUsuario = opts?.codUsuario ?? 1;
    const resp = await fetchJson<S3ListResp>(`/uploads/list?codUsuario=${codUsuario}`);
    const items = (resp.items || []).map(i => mapFromS3(i.key, i.size, i.lastModified));
    return { items, total: items.length };
  };

  /**
   * Devuelve URL firmada de descarga
   * GET /uploads/download-presign?key=...
   */
  const obtenerUrlDescarga = async (path: string) => {
    const data = await fetchJson<{ url: string; expiresIn: number }>(
      `/uploads/download-presign?key=${encodeURIComponent(path)}`
    );
    return data.url;
  };

  /**
   * Borra un objeto
   * DELETE /uploads?key=...
   */
  const eliminarArchivo = async (path: string, _codUsuario?: number) => {
    const data = await fetchJson<{ deleted: boolean }>(
      `/uploads?key=${encodeURIComponent(path)}`,
      { method: 'DELETE' }
    );
    return !!data.deleted;
  };

  /**
   * SUBIR desde app (RN/Expo):
   * 1) presign → 2) PUT signedUrl (sin bearer)
   *
   * params:
   *  - uri: file:// ó content:// del picker
   *  - filename: nombre a preservar
   *  - contentType: mime
   *  - codUsuario: para prefijo usuarios/{cod}
   *
   * return:
   *  { item: ArchivoItem, downloadUrl: string }
   */
  const subirDesdeApp = async (params: {
    uri: string;
    filename: string;
    contentType: string;
    codUsuario: number;
  }) => {
    const { uri, filename, contentType, codUsuario } = params;

    // 1) Presign
    const presign = await fetchJson<{
      provider: 's3';
      signedUrl: string;
      objectKey: string;
      publicUrl?: string;
      expiresIn: number;
    }>(`/uploads/presign?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}&codUsuario=${codUsuario}`);

    // 2) Leer archivo local y subir con PUT directo a MinIO (sin Authorization)
    const fileRes = await fetch(uri);
    const blob = await fileRes.blob();

    const putRes = await fetch(presign.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob as any,
    });
    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => '');
      throw new Error(`Upload failed (${putRes.status}): ${txt}`);
    }

    // 3) Construir item y opcionalmente URL de descarga firmada
    const item = mapFromS3(presign.objectKey, (blob as any).size, new Date().toISOString());
    const downloadUrl = await obtenerUrlDescarga(presign.objectKey);

    return { item, downloadUrl };
  };

  return { listarArchivos, obtenerUrlDescarga, eliminarArchivo, subirDesdeApp };
}

/** Hook de conveniencia */
export function useArchivosApi() {
  const { fetchJson, baseUrl } = useAuth();
  return makeArchivosApi(fetchJson, baseUrl);
}
