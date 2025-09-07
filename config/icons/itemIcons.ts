// /config/icons/itemIcons.ts
// Fallback global (mismo que pediste para logros)
export const ITEM_ICON_DEFAULT = require('../../assets/labubu.png');

// Mapa slug -> imagen local (asegúrate de tener estos PNG en /assets/icons/items/)
export const ITEM_ICONS: Record<string, any> = {
    // Potenciadores
    'protector-de-racha': require('../../assets/icons/items/protector-de-racha.png'),
    'tiempo-extra':       require('../../assets/icons/items/tiempo-extra.png'),
    'x2':                 require('../../assets/icons/items/x2.png'),
    '50-50':              require('../../assets/icons/items/50-50.png'),
    'ave-phoenix':        require('../../assets/icons/items/ave-phoenix.png'),

    // Cofres
    'cofre-pequenno':     require('../../assets/icons/items/cofre-pequenno.png'),
    'cofre-medio':        require('../../assets/icons/items/cofre-medio.png'),
    'cofre-grande':       require('../../assets/icons/items/cofre-grande.png'),

    // Ropa
    //'chaqueta':           require('../../assets/icons/items/chaqueta.png'),
    'gafas-de-sol':       require('../../assets/icons/items/gafas-de-sol.png'),
    //'pickelhaube':        require('../../assets/icons/items/pickelhaube.png'),
    // si agregas más: 'ropa-3': require('../../assets/icons/items/ropa-3.png'), etc.
};

// -------- helpers (idéntico patrón que en logros) --------
export function iconSlugFromBd(value?: string | null): string {
    const s = String(value || '').trim();
    if (!s) return '';
    const noDomain = s.replace(/^https?:\/\/[^/]+/i, '');
    const last = noDomain.split('/').filter(Boolean).pop() || s;
    const base = last.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    return base.toLowerCase();
}
export function resolveItemIcon(slug?: string | null) {
    if (!slug) return ITEM_ICON_DEFAULT;
    return ITEM_ICONS[String(slug).trim().toLowerCase()] || ITEM_ICON_DEFAULT;
}
export function resolveItemIconFromBd(value?: string | null) {
    return resolveItemIcon(iconSlugFromBd(value));
}
