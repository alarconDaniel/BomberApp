// app/(admin)/(tabs)/lib/retos.ts
import { API } from '../../../config/api';

/** ===== DTO normalizado ===== */
export type RetoDTO = {
  codReto: number;
  nombreReto: string;
  descripcionReto?: string | null;
  tiempoEstimadoSegReto?: number | null;
  fechaInicioReto?: string | null;
  fechaFinReto?: string | null;

  // (Opcional) Si luego agregas persistencia de cargo/tipo:
  cargo?: 'Operario' | 'Mantenimiento' | 'Supervisor';
  tipo?: 'Opción múltiple' | 'Emparejar' | 'Rellenar';
};

type AnyObj = Record<string, any>;

export const normalizeReto = (x: AnyObj): RetoDTO => ({
  codReto: x?.codReto ?? x?.cod_reto ?? x?.id ?? 0,
  nombreReto: x?.nombreReto ?? x?.nombre_reto ?? x?.titulo ?? '',
  descripcionReto: x?.descripcionReto ?? x?.descripcion_reto ?? x?.descripcion ?? '',
  tiempoEstimadoSegReto: x?.tiempoEstimadoSegReto ?? x?.tiempo_estimado_seg_reto ?? x?.tiempo ?? null,
  fechaInicioReto: x?.fechaInicioReto ?? x?.fecha_inicio_reto ?? x?.fechaInicio ?? null,
  fechaFinReto: x?.fechaFinReto ?? x?.fecha_fin_reto ?? x?.fechaFin ?? null,

  cargo: x?.cargo ?? x?.destinoCargo ?? x?.destino_cargo ?? undefined,
  tipo: x?.tipo ?? x?.tipoReto ?? x?.tipo_reto ?? undefined,
});

function pickArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.retos)) return payload.retos;
  return [];
}

/** Limpia claves undefined (no las manda en el body) */
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
  return pickArray(json).map(normalizeReto).filter((r: RetoDTO) => !!r.codReto);
}

/** Títulos para Home */
export async function fetchRetoTitles(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<string[]> {
  const retos = await fetchRetos(fetchJson);
  return retos.map(r => r.nombreReto).filter(Boolean);
}

/** ====== Crear ====== */
export async function createReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  payload: Partial<RetoDTO>
) {
  // Aseguramos strings (no null) en campos NOT NULL
  const body = {
    nombreReto: (payload.nombreReto ?? '').trim(),
    descripcionReto: (payload.descripcionReto ?? '').toString(), // '' si venía null/undefined
    tiempoEstimadoSegReto: payload.tiempoEstimadoSegReto ?? 0,
    fechaInicioReto: payload.fechaInicioReto ?? null,
    fechaFinReto: payload.fechaFinReto ?? null,

    // si tu backend los ignora no pasa nada, sólo se guardarán cuando lo soporte:
    cargo: payload.cargo,
    tipo: payload.tipo,
  };
  return fetchJson(API.reto.crear, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** ====== Actualizar ====== */
export async function updateReto(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  id: number | string,
  payload: Partial<RetoDTO>
) {
  // Nunca mandes null a columnas NOT NULL: usa '' o no mandes la clave
  const clean = stripUndefined({
    codReto: Number(id),
    nombreReto: payload.nombreReto?.trim(),
    descripcionReto:
      payload.descripcionReto === undefined
        ? undefined
        : String(payload.descripcionReto), // '' si el usuario borró el texto

    tiempoEstimadoSegReto: payload.tiempoEstimadoSegReto,
    fechaInicioReto: payload.fechaInicioReto,
    fechaFinReto: payload.fechaFinReto,

    cargo: payload.cargo,
    tipo: payload.tipo,
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
