// /config/icons/logroIcons.ts

// 👇 Fallback oficial (si el valor de BD está vacío o no mapea)
export const LOGRO_ICON_DEFAULT = require('../../assets/labubu.png');

// 👇 Mapa slug → imagen local (EXACTAMENTE los nombres de tu carpeta assets/icons/logros)
export const LOGRO_ICONS: Record<string, any> = {
    'avaro-feliz':         require('../../assets/icons/logros/avaro-feliz.png'),
    'bandera-al-viento':   require('../../assets/icons/logros/bandera-al-viento.png'),
    'bolsillo-sonando':    require('../../assets/icons/logros/bolsillo-sonando.png'),
    'cofre-abierto':       require('../../assets/icons/logros/cofre-abierto.png'),
    'explorador':          require('../../assets/icons/logros/explorador.png'),
    'perfecto':            require('../../assets/icons/logros/perfecto.png'),
    'primer-encendido':    require('../../assets/icons/logros/primer-encendido.png'),
    'racha-3':             require('../../assets/icons/logros/racha-3.png'),
    'racha-7':             require('../../assets/icons/logros/racha-7.png'),
    'racha-30':            require('../../assets/icons/logros/racha-30.png'),
    'reloj-de-arena':      require('../../assets/icons/logros/reloj-de-arena.png'),
    'subiste-de-nivel-i':  require('../../assets/icons/logros/subiste-de-nivel-i.png'),
    'subiste-de-nivel-ii': require('../../assets/icons/logros/subiste-de-nivel-ii.png'),
    'velocista':           require('../../assets/icons/logros/velocista.png'),
};

// 1) Extrae un slug a partir de una ruta o URL que venga de BD.
//    /static/icons/logros/perfecto.png  -> perfecto
//    https://.../racha-7.png            -> racha-7
//    "racha-7"                          -> racha-7
export function iconSlugFromBd(value?: string | null): string {
    const s = String(value || '').trim();
    if (!s) return '';
    // quita dominio si hay
    const noDomain = s.replace(/^https?:\/\/[^/]+/i, '');
    // toma el último segmento
    const last = noDomain.split('/').filter(Boolean).pop() || s;
    // quita extensión
    const base = last.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    return base.toLowerCase();
}

// 2) Resuelve un slug a la imagen empaquetada
export function resolveLogroIcon(slug?: string | null) {
    if (!slug) return LOGRO_ICON_DEFAULT;
    const key = String(slug).trim().toLowerCase();
    return LOGRO_ICONS[key] || LOGRO_ICON_DEFAULT;
}

// 3) Atajo: pásame DIRECTO lo que vino en BD (ruta/slug/url) y te regreso la imagen local
export function resolveLogroIconFromBd(value?: string | null) {
    return resolveLogroIcon(iconSlugFromBd(value));
}
