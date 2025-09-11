// /config/icons/itemIcons.ts

// Fallback global
export const ITEM_ICON_DEFAULT = require('../../assets/labubu.png');

// Mapa slug -> imagen local (tema claro)
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
    'chaqueta-cyberunner': require('../../assets/icons/items/chaqueta-cyberunner.png'),
    'gafas-de-sol':        require('../../assets/icons/items/gafas-de-sol.png'),
    'casco-pickelhaube':   require('../../assets/icons/items/casco-pickelhaube.png'),
    'jaws':                require('../../assets/icons/items/jaws.png'),
    'falda':               require('../../assets/icons/items/falda.png'),
    'pantalon-cargo':      require('../../assets/icons/items/pantalon-cargo.png'),
    'converce':            require('../../assets/icons/items/converce.png'),
};

// Mapa slug -> imagen local (tema oscuro). Solo agrega los que realmente tengas *_dark.png
export const ITEM_ICONS_DARK: Record<string, any> = {
    'protector-de-racha': require('../../assets/icons/items/protector-de-racha_dark.png'),
    '50-50':              require('../../assets/icons/items/50-50_dark.png'),
    'ave-phoenix':        require('../../assets/icons/items/ave-phoenix_dark.png'),

    'cofre-pequenno':     require('../../assets/icons/items/cofre-pequenno_dark.png'),
    'cofre-medio':        require('../../assets/icons/items/cofre-medio_dark.png'),
    'cofre-grande':       require('../../assets/icons/items/cofre-grande_dark.png'),

    'chaqueta-cyberunner': require('../../assets/icons/items/chaqueta-cyberunner_dark.png'),
    'gafas-de-sol':        require('../../assets/icons/items/gafas-de-sol_dark.png'),
    'casco-pickelhaube':   require('../../assets/icons/items/casco-pickelhaube_dark.png'),
    'jaws':                require('../../assets/icons/items/jaws_dark.png'),
};

// -------- helpers --------
export function iconSlugFromBd(value?: string | null): string {
    const s = String(value || '').trim();
    if (!s) return '';
    const noDomain = s.replace(/^https?:\/\/[^/]+/i, '');
    const last = noDomain.split('/').filter(Boolean).pop() || s;
    const base = last.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
    // normaliza: espacios/_ -> guiones y elimina sufijo "-dark"
    return base
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/--+/g, '-')
        .replace(/-dark$/, '');
}

export function resolveItemIcon(slug?: string | null, isDark?: boolean) {
    if (!slug) return ITEM_ICON_DEFAULT;
    const key = String(slug).trim().toLowerCase();
    if (isDark && ITEM_ICONS_DARK[key]) return ITEM_ICONS_DARK[key];
    return ITEM_ICONS[key] || ITEM_ICON_DEFAULT;
}

export function resolveItemIconFromBd(value?: string | null, isDark?: boolean) {
    return resolveItemIcon(iconSlugFromBd(value), isDark);
}
