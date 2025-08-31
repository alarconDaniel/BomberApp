// app/(admin)/(tabs)/lib/operarios.ts

/** ===== Tipos del backend (DTO) ===== */
export type UsuarioListDTO = {
  codUsuario: number;
  codRol?: number;              // puede venir como codRol...
  cod_rol?: number;             // ...o como cod_rol
  codCargoUsuario?: number | null;
  nombreUsuario: string;
  apellidoUsuario: string;
  cedulaUsuario?: string;
  nicknameUsuario?: string | null;
  correoUsuario?: string;
  tokenVersion?: number;
};

/** ===== Tipos UI ===== */
export type OperarioUI = {
  id: string;
  nombre: string;
  cargo: 'Operario';
};

/** ===== Helpers ===== */
const toTitle = (s?: string) =>
  (s ?? '')
    .trim()
    .split(/\s+/)
    .map(w => (w[0] ?? '').toUpperCase() + (w.slice(1) ?? '').toLowerCase())
    .join(' ')
    .trim();

const getRolNumber = (u: UsuarioListDTO) =>
  Number(typeof u.codRol === 'number' ? u.codRol : (u.cod_rol as any));

/** Mapea 1 usuario a UI (asumiendo ya filtrado a rol=2) */
export function mapUsuarioToUI(u: UsuarioListDTO): OperarioUI {
  const nombre = toTitle(`${u.nombreUsuario ?? ''} ${u.apellidoUsuario ?? ''}`.trim());
  return {
    id: String(u.codUsuario),
    nombre: nombre || 'Sin nombre',
    cargo: 'Operario',
  };
}

/** ===== Fetchers (únicos para toda la app) ===== */

/** Devuelve los usuarios crudos (del backend) cuyo rol sea 2 (Operario). */
export async function fetchOperariosRaw(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<UsuarioListDTO[]> {
  const json = await fetchJson<UsuarioListDTO[]>('/usuario/listar');
  const arr = Array.isArray(json) ? json : [];
  return arr.filter(u => getRolNumber(u) === 2);
}

/** Devuelve los operarios listos para UI (OperariosScreen/HomeScreen) */
export async function fetchOperariosUI(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<OperarioUI[]> {
  const raw = await fetchOperariosRaw(fetchJson);
  return raw.map(mapUsuarioToUI);
}

/** Devuelve solo los nombres (útil para el bloque de Operarios del Home) */
export async function fetchOperarioNames(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>
): Promise<string[]> {
  const ui = await fetchOperariosUI(fetchJson);
  return ui.map(o => o.nombre);
}
