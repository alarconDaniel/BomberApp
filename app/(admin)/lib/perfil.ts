// app/(admin)/(tabs)/lib/perfil.ts
type FetchJson = (url: string, init?: RequestInit) => Promise<any>;

/** TitleCase simple */
function toTitleCase(s: string) {
  return String(s || '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Dado el user del AuthContext y fetchJson, devuelve "Nombre Apellido" */
export async function fetchFullNameFromUsuariosList(
  fetchJson: FetchJson,
  user: any
): Promise<string> {
  // 1) Si ya viene en el objeto user, úsalo
  const nombreLocal =
    user?.nombreUsuario ?? user?.nombre_usuario ?? user?.nombre ?? user?.firstName;
  const apellidoLocal =
    user?.apellidoUsuario ?? user?.apellido_usuario ?? user?.apellido ?? user?.lastName;
  const local = `${nombreLocal ?? ''} ${apellidoLocal ?? ''}`.trim();
  if (local) return toTitleCase(local);

  // 2) Buscar en /usuario/listar y machear por email
  const email = String(user?.email || '').toLowerCase();
  try {
    const resp = await fetchJson('/usuario/listar', { method: 'GET' });
    const rows: any[] = Array.isArray(resp)
      ? resp
      : Array.isArray(resp?.items) ? resp.items
      : Array.isArray(resp?.data) ? resp.data
      : Array.isArray(resp?.rows) ? resp.rows
      : [];

    const match = rows.find((r: any) =>
      String(r?.correoUsuario || r?.correo || r?.email || '')
        .toLowerCase() === email
    );

    const nombre = match?.nombreUsuario ?? match?.nombre ?? '';
    const apellido = match?.apellidoUsuario ?? match?.apellido ?? '';
    const full = `${nombre ?? ''} ${apellido ?? ''}`.trim();

    if (full) return toTitleCase(full);
  } catch {
    // ignora y cae al fallback
  }

  // 3) Fallback: parte local del email
  const fromEmail = (email.split('@')[0] || 'Usuario').replace(/[._-]+/g, ' ');
  return toTitleCase(fromEmail);
}
