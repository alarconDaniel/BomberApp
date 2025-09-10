// /config/icons/logroIcons.ts

export const LOGRO_ICON_DEFAULT = require('../../assets/labubu.png');

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

export const LOGRO_ICONS_DARK: Record<string, any> = {
    'avaro-feliz':          require('../../assets/icons/logros/avaro-feliz_dark.png'),
    'bandera-al-viento':   require('../../assets/icons/logros/bandera-al-viento_dark.png'),
    'bolsillo-sonando':    require('../../assets/icons/logros/bolsillo-sonando_dark.png'),
    'cofre-abierto':       require('../../assets/icons/logros/cofre-abierto_dark.png'),
    'explorador':          require('../../assets/icons/logros/explorador_dark.png'),
    'perfecto':            require('../../assets/icons/logros/perfecto_dark.png'),
    'primer-encendido':    require('../../assets/icons/logros/primer-encendido_dark.png'),
    'racha-3':             require('../../assets/icons/logros/racha-3_dark.png'),
    'racha-7':             require('../../assets/icons/logros/racha-7_dark.png'),
    'racha-30':            require('../../assets/icons/logros/racha-30_dark.png'),
    'reloj-de-arena':      require('../../assets/icons/logros/reloj-de-arena_dark.png'),
    'subiste-de-nivel-i':  require('../../assets/icons/logros/subiste-de-nivel-i_dark.png'),
    'subiste-de-nivel-ii': require('../../assets/icons/logros/subiste-de-nivel-ii_dark.png'),
    'velocista':           require('../../assets/icons/logros/velocista_dark.png'),
};

export function iconSlugFromBd(value?: string | null): string {
    const s = String(value || '').trim();
    if (!s) return '';
    const noDomain = s.replace(/^https?:\/\/[^/]+/i, '');
    const last = noDomain.split('/').filter(Boolean).pop() || s;
    const base = last.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    return base.toLowerCase().replace(/-dark$/, '');
}

export function resolveLogroIcon(slug?: string | null, isDark?: boolean) {
    if (!slug) return LOGRO_ICON_DEFAULT;
    const key = String(slug).trim().toLowerCase();
    if (isDark && LOGRO_ICONS_DARK[key]) return LOGRO_ICONS_DARK[key];
    return LOGRO_ICONS[key] || LOGRO_ICON_DEFAULT;
}

export function resolveLogroIconFromBd(value?: string | null, isDark?: boolean) {
    return resolveLogroIcon(iconSlugFromBd(value), isDark);
}
