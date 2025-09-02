// app/(admin)/(tabs)/lib/retos.ts
import { API } from '../../../config/api';

/** ===== Tipos compartidos ===== */
export type Cargo = 'Operario' | 'Mantenimiento' | 'Supervisor';
export type TipoKey = 'multiple' | 'match' | 'fill';

/** ===== DTO normalizado ===== */
export type RetoDTO = {
  codReto: number;
  nombreReto: string;
  descripcionReto: string; // NOT NULL en tu DB ⇒ string siempre
  tiempoEstimadoSegReto: number;
  fechaInicioReto: string; // 'YYYY-MM-DD'
  fechaFinReto: string;    // 'YYYY-MM-DD'

  // opcionales si tu backend todavía no los persiste
  cargo?: Cargo;
  tipo?: TipoKey;
};

type AnyObj = Record<string, any>;

/** Mapea distintos valores posibles del backend a nuestras claves ‘TipoKey’ */
function normalizeTipo(v: any): TipoKey | undefined {
  const s = String(v ?? '').toLowerCase().trim();
  if (!s) return undefined;
  if (s === 'multiple' || s === 'opcion multiple' || s === 'opción múltiple') return 'multiple';
  if (s === 'match' || s === 'emparejar' || s === 'emparejado') return 'match';
  if (s === 'fill' || s === 'rellenar' || s === 'completar') return 'fill';
  return undefined;
}

/** Normaliza snake/camel y variantes comunes */
export const normalizeReto = (x: AnyObj): RetoDTO => ({
  codReto: Number(x?.codReto ?? x?.cod_reto ?? x?.id ?? 0),
  nombreReto: String(x?.nombreReto ?? x?.nombre_reto ?? x?.titulo ?? ''),
  descripcionReto: String(x?.descripcionReto ?? x?.descripcion_reto ?? x?.descripcion ?? ''),
  tiempoEstimadoSegReto: Number(x?.tiempoEstimadoSegReto ?? x?.tiempo_estimado_seg_reto ?? x?.tiempo ?? 0),
  fechaInicioReto: String(x?.fechaInicioReto ?? x?.fecha_inicio_reto ?? x?.fechaInicio ?? ''),
  fechaFinReto: String(x?.fechaFinReto ?? x?.fecha_fin_reto ?? x?.fechaFin ?? ''),

  cargo: (x?.cargo ?? x?.destinoCargo ?? x?.destino_cargo) as Cargo | undefined,
  tipo: normalizeTipo(x?.tipo ?? x?.tipoReto ?? x?.tipo_reto),
});

/** Resuelve arrays devueltos como {data}/{items}/{retos}/[] */
function pickArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.retos)) return payload.retos;
  return [];
}

/** Quita las claves con undefined del body */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  Object.keys(obj).forEach(k => {
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

/** ====== Listar ====== */
export async function fetchRetos(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<RetoDTO[]> {
  const json = await fetchJson<any>(`${API.reto.listar}?_ts=${Date.now()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return pickArray(json)
    .map(normalizeReto)
    .filter((r: RetoDTO) => !!r.codReto);
}

/** Solo los títulos – útil para Home */
export async function fetchRetoTitles(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<string[]> {
  const retos = await fetchRetos(fetchJson);
  return retos.map(r => r.nombreReto).filter(Boolean);
}

/** ====== Crear ====== */
export async function createReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  payload: Partial<RetoDTO> & Record<string, any>
) {
  const body = {
    nombreReto: (payload.nombreReto ?? '').trim(),
    descripcionReto: String(payload.descripcionReto ?? ''), // NUNCA null
    tiempoEstimadoSegReto: Number(payload.tiempoEstimadoSegReto ?? 0),
    fechaInicioReto: String(payload.fechaInicioReto ?? ''), // ‘YYYY-MM-DD’
    fechaFinReto: String(payload.fechaFinReto ?? ''),       // ‘YYYY-MM-DD’

    // opcionales
    cargo: payload.cargo,
    tipo: payload.tipo, // 'multiple' | 'match' | 'fill'

    // cualquier metadata adicional (config de preguntas, etc.)
    config: payload.config,
  };

  return fetchJson(API.reto.crear, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** ====== Actualizar (PUT /reto/modificar con codReto en el body) ====== */
export async function updateReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string,
  payload: Partial<RetoDTO> & Record<string, any>
) {
  const clean = stripUndefined({
    codReto: Number(id),
    nombreReto: payload.nombreReto?.trim(),
    descripcionReto:
      payload.descripcionReto === undefined
        ? undefined
        : String(payload.descripcionReto), // '' si usuario lo deja vacío
    tiempoEstimadoSegReto: payload.tiempoEstimadoSegReto,
    fechaInicioReto: payload.fechaInicioReto, // ‘YYYY-MM-DD’
    fechaFinReto: payload.fechaFinReto,       // ‘YYYY-MM-DD’
    cargo: payload.cargo,
    tipo: payload.tipo,
    config: payload.config,
  });

  return fetchJson(API.reto.modificar, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(clean),
  });
}

/** ====== Borrar ====== */
export async function deleteReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string
) {
  return fetchJson(API.reto.borrar(id), { method: 'DELETE' });
}
