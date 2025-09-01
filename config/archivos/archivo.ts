// screens/archivos/archivos.ts (o src/api/archivos.ts)
import { useAuth } from '../../auth/AuthContext';

/** Modelo que devuelve el backend */
export type Archivo = {
  codArchivo: number;
  codUsuario: number;
  rutaArchivo: string;            // fileId de Drive
  nombreOriginal: string;
  tipoContenido: string;
  tamanoBytes: string;            // backend lo envía como string
  fechaCreacion: string;          // ISO
  fechaActualizacion?: string;
  area?: string | null;
};

/** Modelo que usa el frontend (ReportesScreen) */
export type ArchivoItem = {
  path: string;                   // ← de rutaArchivo
  nombreOriginal: string;
  contentType: string;            // ← de tipoContenido
  fechaSubida: string;            // ← de fechaCreacion
  codUsuario?: number | null;
  area?: string | null;
};

type ListarResp = { total: number; rows: Archivo[] };

/** Mapea Archivo (backend) → ArchivoItem (frontend) */
function mapToItem(a: Archivo): ArchivoItem {
  return {
    path: a.rutaArchivo,
    nombreOriginal: a.nombreOriginal,
    contentType: a.tipoContenido,
    fechaSubida: a.fechaCreacion,
    codUsuario: a.codUsuario,
    area: a.area ?? null,
  };
}

/** Factory que usa fetchJson (y opcionalmente baseUrl, aunque fetchJson ya lo incorpora) */
export function makeArchivosApi(
  fetchJson: <T = any>(path: string, init?: RequestInit & { noAuth?: boolean }) => Promise<T>,
  _baseUrl?: string,
) {
  const listarArchivos = async (opts?: { take?: number; skip?: number; codUsuario?: number }) => {
    const params = new URLSearchParams();
    if (opts?.take) params.set('take', String(opts.take));
    if (opts?.skip) params.set('skip', String(opts.skip));
    if (opts?.codUsuario) params.set('codUsuario', String(opts.codUsuario));

    const resp = await fetchJson<ListarResp>(`/api/archivos/listar${params.toString() ? `?${params}` : ''}`);
    const items = (resp.rows || []).map(mapToItem);
    return { items, total: resp.total ?? items.length };
  };

  const obtenerUrlDescarga = async (path: string) => {
    const data = await fetchJson<{ url: string }>(
      `/api/archivos/url-descarga?path=${encodeURIComponent(path)}`
    );
    return data.url;
  };

  const eliminarArchivo = async (path: string, codUsuario?: number) => {
    const data = await fetchJson<{ deleted: boolean }>(`/api/archivos/eliminar`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, codUsuario }),
    });
    return !!data.deleted;
  };

  // Subida multipart desde app (FormData con "archivo" y opcional "codUsuario")
  const subirDesdeApp = async (formData: FormData) => {
    const data = await fetchJson<{ archivo: Archivo; downloadUrl: string }>(`/api/archivos/subir`, {
      method: 'POST',
      // Importantísimo: no forzar 'Content-Type' para que RN ponga el boundary
      headers: undefined as any,
      body: formData as any,
    });
    return { item: mapToItem(data.archivo), downloadUrl: data.downloadUrl };
  };

  return { listarArchivos, obtenerUrlDescarga, eliminarArchivo, subirDesdeApp };
}

/** Hook de conveniencia, por si quieres usarlo en otras pantallas */
export function useArchivosApi() {
  const { fetchJson, baseUrl } = useAuth();
  return makeArchivosApi(fetchJson, baseUrl);
}
