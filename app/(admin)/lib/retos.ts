// app/(admin)/lib/retos.ts
import { API } from '../../../config/api';

/** ===== Tipos compartidos ===== */
export type Cargo = string;

// *** Importante: mapeo real de tu backend ***
export type TipoReto = 'quiz' | 'form' | 'archivo';

// Tipo de PREGUNTA (para config de quiz)
export type TipoKey = 'multiple' | 'match' | 'fill';

export type RetoDTO = {
  codReto: number;
  nombreReto: string;
  descripcionReto: string;
  tiempoEstimadoSegReto: number;
  fechaInicioReto: string; // YYYY-MM-DD
  fechaFinReto: string;    // YYYY-MM-DD
  cargo?: Cargo;
  tipo?: TipoReto;         // <- ahora sí coincide con tu backend
  esAutomaticoReto?: boolean | number;
  activo?: boolean | number;
  // Para edición podemos portar la config/metadata si viene del listar o del detalle
  config?: any;
  metadataReto?: any;
};

type AnyObj = Record<string, any>;

/** Normaliza el tipo desde varias variantes y sinónimos */
function normalizeTipoReto(v: any): TipoReto | undefined {
  const s = String(v ?? '').toLowerCase().trim();
  if (!s) return undefined;

  // sinónimos comunes
  if (['quiz', 'cuestionario', 'test'].includes(s)) return 'quiz';
  if (['form', 'formulario', 'checklist', 'lista', 'lista de verificacion', 'lista de verificación'].includes(s)) return 'form';
  if (['archivo', 'file', 'upload', 'archivos'].includes(s)) return 'archivo';

  // exactos
  if (s === 'quiz' || s === 'form' || s === 'archivo') return s as TipoReto;
  return undefined;
}

export const normalizeReto = (x: AnyObj): RetoDTO => ({
  codReto: Number(x?.codReto ?? x?.cod_reto ?? x?.id ?? 0),
  nombreReto: String(x?.nombreReto ?? x?.nombre_reto ?? x?.titulo ?? ''),
  descripcionReto: String(x?.descripcionReto ?? x?.descripcion_reto ?? x?.descripcion ?? ''),
  tiempoEstimadoSegReto: Number(x?.tiempoEstimadoSegReto ?? x?.tiempo_estimado_seg_reto ?? x?.tiempo ?? 0),
  fechaInicioReto: String(x?.fechaInicioReto ?? x?.fecha_inicio_reto ?? x?.fechaInicio ?? ''),
  fechaFinReto: String(x?.fechaFinReto ?? x?.fecha_fin_reto ?? x?.fechaFin ?? ''),
  cargo: (x?.cargo ?? x?.destinoCargo ?? x?.destino_cargo) as Cargo | undefined,
  tipo: normalizeTipoReto(x?.tipo ?? x?.tipoReto ?? x?.tipo_reto),
  esAutomaticoReto: x?.esAutomaticoReto ?? x?.es_automatico_reto,
  activo: x?.activo,
  config: x?.config ?? x?.metadataReto ?? x?.metadata_reto,
  metadataReto: x?.metadataReto ?? x?.metadata_reto ?? x?.config,
});

function pickArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.retos)) return payload.retos;
  return [];
}

/* ===== Helpers de rutas con fallback ===== */
const R: any = API.reto ?? {};
const URL = {
  listar: String(R.listar ?? '/reto/listar'),
  listarAdmin: String(R.listarAdmin ?? R.listar ?? '/reto/listar'),
  crear: String(R.crear ?? '/reto/crear'),
  modificar: String(R.modificar ?? '/reto/modificar'),
  modificarAdmin: String(R.modificarAdmin ?? R.modificar ?? '/reto/modificar'),
  borrar: (id: string | number) =>
    (typeof R.borrar === 'function' ? R.borrar(id) : `/reto/borrar/${id}`),
  borrarAdmin: (id: string | number) =>
    (typeof R.borrarAdmin === 'function'
      ? R.borrarAdmin(id)
      : (typeof R.borrar === 'function' ? R.borrar(id) : `/reto/borrar/${id}`)),
};

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach(k => {
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

/* ======================= LISTAR ======================= */
export async function fetchRetos(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<RetoDTO[]> {
  const json = await fetchJson<any>(`${URL.listar}?_ts=${Date.now()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return pickArray(json).map(normalizeReto).filter((r: RetoDTO) => !!r.codReto);
}

export async function fetchRetosAdmin(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<RetoDTO[]> {
  const json = await fetchJson<any>(`${URL.listarAdmin}?_ts=${Date.now()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return pickArray(json).map(normalizeReto).filter((r: RetoDTO) => !!r.codReto);
}

export async function fetchRetoTitles(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  admin = false
): Promise<string[]> {
  const retos = admin ? await fetchRetosAdmin(fetchJson) : await fetchRetos(fetchJson);
  return retos.map(r => r.nombreReto).filter(Boolean);
}

/* ======================= CREAR / MODIFICAR ======================= */
export async function createReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  payload: Partial<RetoDTO> & Record<string, any>
) {
  const body = {
    nombreReto: (payload.nombreReto ?? '').trim(),
    descripcionReto: String(payload.descripcionReto ?? ''),
    tiempoEstimadoSegReto: Number(payload.tiempoEstimadoSegReto ?? 0),
    fechaInicioReto: String(payload.fechaInicioReto ?? ''),
    fechaFinReto: String(payload.fechaFinReto ?? ''),
    cargo: payload.cargo,
    tipoReto: payload.tipo as TipoReto | undefined, // *** coincide con backend
    esAutomaticoReto: payload.esAutomaticoReto ? 1 : 0,
    activo: payload.activo ? 1 : 0,
    config: payload.config ?? payload.metadataReto,
    metadataReto: payload.config ?? payload.metadataReto,
  };

  return fetchJson(URL.crear, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string,
  payload: Partial<RetoDTO> & Record<string, any>
) {
  const clean = stripUndefined({
    codReto: Number(id),
    nombreReto: payload.nombreReto?.trim(),
    descripcionReto: payload.descripcionReto === undefined ? undefined : String(payload.descripcionReto),
    tiempoEstimadoSegReto: payload.tiempoEstimadoSegReto,
    fechaInicioReto: payload.fechaInicioReto,
    fechaFinReto: payload.fechaFinReto,
    cargo: payload.cargo,
    tipoReto: payload.tipo as TipoReto | undefined,
    esAutomaticoReto: payload.esAutomaticoReto ? 1 : 0,
    activo: payload.activo ? 1 : 0,
    config: payload.config ?? payload.metadataReto,
    metadataReto: payload.config ?? payload.metadataReto,
  });

  return fetchJson(URL.modificar, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(clean),
  });
}

export async function updateRetoAdmin(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string,
  payload: Partial<RetoDTO> & Record<string, any>
) {
  const clean = {
    ...await updateReto(async () => ({} as any), id, payload)
  } as any; // no se usa realmente, mantenemos solo firma
  return fetchJson(URL.modificarAdmin, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(clean),
  });
}

/* ======================= BORRAR ======================= */
export async function deleteReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string
) {
  return fetchJson(URL.borrar(id), { method: 'DELETE' });
}
