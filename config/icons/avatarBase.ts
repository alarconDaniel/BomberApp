// config/icons/avatarBase.ts
// Igual que en logros: resolvemos imágenes locales con require() estático.

export const AVATAR_BASE_LIGHT = require('../../assets/avatar/avatar-base.png');
// (Opcional) Variante dark si la tienes:
export const AVATAR_BASE_DARK  = require('../../assets/avatar/avatar-base_dark.png');

// Si algún día quieres varios "skins", expándelo a un diccionario por slug.
export function resolveAvatarBase(isDark?: boolean) {
    // Si no tienes variante dark, devuelve siempre LIGHT
    if (isDark && AVATAR_BASE_DARK) return AVATAR_BASE_DARK;
    return AVATAR_BASE_LIGHT;
}
