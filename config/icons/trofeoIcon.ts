// /config/icons/trofeoIcons.ts

// Fallback global (si no hay slug o no mapea)
export const TROFEO_ICON_DEFAULT = require('../../assets/labubu.png');

// Mapa slug → imagen local (tema claro)
export const TROFEO_ICONS: Record<string, any> = {
    // Usa EXACTAMENTE los nombres de archivo (sin extensión), en minúsculas
    // Nota: En tu screenshot aparecen estos nombres; ajusta/añade los que falten

    'domador-de-bestias':        require('../../assets/icons/trofeos/domador-de-bestias.png'),
    'el-inmortal-de-la-oficina': require('../../assets/icons/trofeos/el-inmortal-de-la-oficina.png'),
    'escudo-invisible':          require('../../assets/icons/trofeos/escudo-invisible.png'),
    'jefe-zen':                  require('../../assets/icons/trofeos/jefe-zen.png'),
    'maraton-de-hierro':         require('../../assets/icons/trofeos/maraton-de-hierro.png'),
    'modo-upload-on':            require('../../assets/icons/trofeos/modo-upload-ON.png'),
    'racha-imparable':           require('../../assets/icons/trofeos/racha-imparable.png'),
    'relampago-en-la-cabeza':    require('../../assets/icons/trofeos/relampago-en-la-cabeza.png'),
};

// Mapa slug → imagen local (tema oscuro)
// Si un slug no tiene versión _dark, simplemente NO lo pongas aquí: el resolver caerá al claro.
export const TROFEO_ICONS_DARK: Record<string, any> = {
    'domador-de-bestias':        require('../../assets/icons/trofeos/domador-de-bestias_dark.png'),
    'el-inmortal-de-la-oficina': require('../../assets/icons/trofeos/el-inmortal-de-la-oficina_dark.png'),
    'escudo-invisible':          require('../../assets/icons/trofeos/escudo-invisible_dark.png'),
    'jefe-zen':                  require('../../assets/icons/trofeos/jefe-zen_dark.png'),
    'maraton-de-hierro':         require('../../assets/icons/trofeos/maraton-de-hierro_dark.png'),
    'modo-upload-on':            require('../../assets/icons/trofeos/modo-upload-ON_dark.png'),
    'racha-imparable':           require('../../assets/icons/trofeos/racha-imparable_dark.png'),
    'relampago-en-la-cabeza':    require('../../assets/icons/trofeos/relampago-en-la-cabeza_dark.png'),
};

// ---------- helpers (mismo patrón que logros) ----------
export function trofeoIconSlugFromBd(value?: string | null): string {
    const s = String(value || '').trim();
    if (!s) return '';
    // quita dominio si hay
    const noDomain = s.replace(/^https?:\/\/[^/]+/i, '');
    // último segmento
    const last = noDomain.split('/').filter(Boolean).pop() || s;
    // quita extensión
    const base = last.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    // normaliza ON → on, espacios/guiones bajos a guiones, y quita dobles
    return base
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/--+/g, '-')
        .replace(/-dark$/, ''); // importante: el slug base ignora el sufijo "_dark"
}

/**
 * Resuelve el ícono de trofeo considerando el tema.
 * - Si isDark=true e existe variante dark → usa dark
 * - Si no, usa el claro
 * - Si no existe ninguno, cae al DEFAULT
 */
export function resolveTrofeoIcon(slug?: string | null, isDark?: boolean) {
    if (!slug) return TROFEO_ICON_DEFAULT;

    const key = String(slug).trim().toLowerCase();
    if (isDark && TROFEO_ICONS_DARK[key]) return TROFEO_ICONS_DARK[key];
    return TROFEO_ICONS[key] || TROFEO_ICON_DEFAULT;
}

/**
 * Atajo: pásame lo que venga de BD (ruta/slug/url), y te resuelvo según tema.
 */
export function resolveTrofeoIconFromBd(value?: string | null, isDark?: boolean) {
    return resolveTrofeoIcon(trofeoIconSlugFromBd(value), isDark);
}
