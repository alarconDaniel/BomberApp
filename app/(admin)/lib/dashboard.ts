export type RetoProgreso = {
  codReto: number;
  titulo: string;
  completados: number;
  total: number;
  pct: number;
  mi?: { asignado: boolean; completado: boolean; enProgreso: boolean };
};

export async function fetchProgresoDia(
  fetchJson: <T = any>(url: string, opts?: any) => Promise<T>,
  fechaYmd: string
): Promise<RetoProgreso[]> {
  const data = await fetchJson<any>(`/reto/progreso-dia?fecha=${encodeURIComponent(fechaYmd)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  return arr.map((x: any) => ({
    codReto: Number(x.codReto ?? x.cod_reto ?? 0),
    titulo: String(x.titulo ?? x.nombreReto ?? x.nombre_reto ?? ''),
    completados: Number(x.completados ?? 0),
    total: Number(x.total ?? 0),
    pct: Math.max(0, Math.min(100, Number(x.pct ?? 0))),
    mi: x.mi ? {
      asignado: !!x.mi.asignado,
      completado: !!x.mi.completado,
      enProgreso: !!x.mi.enProgreso,
    } : undefined,
  }));
}
