// app/(admin)/(tabs)/lib/reportes.ts
// Devuelve títulos de reportes desde tu backend, probando rutas comunes.

export type ArchivoItem = {
  path: string;
  nombreOriginal?: string;
  nombre_archivo?: string;
  titulo?: string;
  name?: string;
  area?: string | null;
  fechaSubida?: string | null;
};

type ListResponse =
  | ArchivoItem[]
  | { items?: ArchivoItem[]; rows?: ArchivoItem[]; data?: ArchivoItem[]; archivos?: ArchivoItem[] };

function pick<T = any>(...vals: T[]) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== '' && s !== 'null' && s !== 'undefined') return v as T;
  }
  return undefined as unknown as T;
}

function titleOf(a: ArchivoItem): string {
  return (
    pick(a.nombreOriginal, a.nombre_archivo, a.titulo, a.name) ||
    'Archivo'
  );
}

function normalizeList(resp: ListResponse): ArchivoItem[] {
  if (Array.isArray(resp)) return resp;
  if (!resp || typeof resp !== 'object') return [];
  return resp.items || resp.rows || resp.data || resp.archivos || [];
}

/**
 * Lista y extrae títulos de reportes. Limita a N elementos (10 por defecto) y
 * ordena por fechaSubida desc si está presente.
 */
export async function fetchReporteTitles(
  fetchJson: <T = any>(path: string, init?: RequestInit) => Promise<T>,
  _baseUrl?: string,
  limit = 10
): Promise<string[]> {
  const candidates = [
    '/archivo/listar',
    '/archivos/listar',
    '/archivos',
    '/archivo',
  ];

  let list: ArchivoItem[] = [];
  let lastErr: any = null;

  for (const path of candidates) {
    try {
      const resp = await fetchJson<ListResponse>(`${path}?take=${limit}&skip=0`);
      const items = normalizeList(resp);
      if (items.length > 0) { list = items; break; }
    } catch (e) { lastErr = e; }
  }

  if (list.length === 0) {
    for (const path of candidates) {
      try {
        const resp = await fetchJson<ListResponse>(path);
        const items = normalizeList(resp);
        if (items.length > 0) { list = items; break; }
      } catch (e) { lastErr = e; }
    }
  }

  if (list.length === 0) {
    if (lastErr) throw lastErr;
    return [];
  }

  list.sort((a, b) => {
    const fa = a.fechaSubida ?? '';
    const fb = b.fechaSubida ?? '';
    return fb.localeCompare(fa) || titleOf(a).localeCompare(titleOf(b));
  });

  const titles = list.map(titleOf).filter(Boolean);
  return titles.slice(0, limit);
}
