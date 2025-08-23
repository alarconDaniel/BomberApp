import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, Animated, View, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Scheme = 'light' | 'dark' | 'system';

export type Palette = {
    // Base UI
    bg: string;
    bgHeader: string;
    card: string;
    cardTint: string;
    text: string;
    sub: string;
    divider: string;

    // Marca / primarios
    primary: string;
    primarySoft: string;

    // Estados
    danger: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;

    // Home (curva/nodos/popover)
    brandBlue: string; // trazo curva
    brandBlueBorder: string;// borde del nodo
    brandBlueSoft: string; // relleno del nodo
    popoverBg: string;
    popoverText: string;

    // Chips Header
    streak: string;
    streakBg: string;
    coin: string;
    coinBg: string;

    // ✅ NUEVO: Tab bar
    tabBg: string;          // fondo barra
    tabBorder: string;      // borde superior
    tabButtonBg: string;    // fondo de cada botón (no activo)
    tabActiveBg: string;    // fondo botón activo
    tabIcon: string;        // icono normal
    tabIconActive: string;  // icono activo

    // ✅ NUEVO: Store/Toast y utilidades de color (solo añadidos)
    mutedText: string;       // textos secundarios (#6B7280 en claro)
    secondaryText: string;   // textos más suaves (#374151 en claro)
    mutedBg: string;         // grises de relleno (#E5E7EB en claro)
    outline: string;         // color de “outline” (#a5afc4 en claro)
    imageBg: string;         // fondos de imagen (#F3F4F6 en claro)
    inputBorder: string;     // bordes inputs (#D1D5DB en claro)
    dangerSoft?: string;     // fondo suave de error (solo añadido, no altera 'danger')

    // Acentos de tienda por tipo
    storeAccentPotenciador: string; // #3B5BDB
    storeAccentCofre: string;       // #0EA5E9
    storeAccentRopa: string;        // #10B981
    storeRedBar: string;            // “red” en claro
};

const DARK: Palette = {
    // Base
    bg: '#0f172a',
    bgHeader: '#090d19',
    card: '#111827',
    cardTint: '#0b1220',
    text: '#e5e7eb',
    sub: '#a5b4fc',
    divider: 'rgba(255,255,255,0.08)',

    // Primarios   // Morados ricos (modo oscuro ❤️)
    primary: '#7c3aed',
    primarySoft: '#c4b5fd',

    // Estados
    danger: '#ef4444',
    success: '#10B981',
    successSoft: 'rgba(16,185,129,0.18)',
    warning: '#F59E0B',
    warningSoft: 'rgba(245,158,11,0.20)',

    // Home
    brandBlue: '#93A4FF',
    brandBlueBorder: '#a5b4fc',
    brandBlueSoft: 'rgba(165,180,252,0.20)',
    popoverBg: '#1f2937',
    popoverText: '#e5e7eb',

    // Chips Header
    streak: '#fb923c',
    streakBg: 'rgba(251,146,60,0.20)',
    coin: '#FDE047',
    coinBg: 'rgba(253,224,71,0.20)',

    // Tab bar
    tabBg: '#0b1220',
    tabBorder: 'rgba(255,255,255,0.06)',
    tabButtonBg: '#111827',
    tabActiveBg: 'rgba(124,58,237,0.25)', // morado con alpha
    tabIcon: '#9ca3af',
    tabIconActive: '#c4b5fd',

    // ✅ NUEVO: Store/Toast y utilidades (equivalentes en dark)
    mutedText: '#9CA3AF',
    secondaryText: '#cbd5e1',
    mutedBg: '#1f2937',
    outline: 'rgba(255,255,255,0.18)',
    imageBg: '#0b1220',
    inputBorder: 'rgba(255,255,255,0.18)',
    dangerSoft: 'rgba(239,68,68,0.20)',

    storeAccentPotenciador: '#93A4FF',
    storeAccentCofre: '#38BDF8',
    storeAccentRopa: '#34D399',
    storeRedBar: '#ef4444',
};

const LIGHT: Palette = {
    // Base
    bg: '#f8fafc',
    bgHeader: '#fefefe',
    card: '#ffffff',
    cardTint: '#f1f5f9',
    text: '#0f172a',
    sub: '#6C8CFF',
    divider: 'rgba(15,23,42,0.08)',

    // Primarios
    primary: '#6C8CFF',
    primarySoft: '#c4d1ff',

    // Estados
    danger: '#b91c1c',
    success: '#16A34A',
    successSoft: '#A7F3D0',
    warning: '#CA8A04',
    warningSoft: '#FFF3BD',

    // Home
    brandBlue: '#001780',
    brandBlueBorder: '#6C8CFF',
    brandBlueSoft: '#EFF3FF',
    popoverBg: '#CFCFD4',
    popoverText: '#0f172a',

    // Chips Header
    streak: '#fc4103',
    streakBg: '#ffcfbf',
    coin: '#cca700',
    coinBg: '#fff3bd',

    // Tab bar
    tabBg: '#fefefe',
    tabBorder: '#ddd',
    tabButtonBg: '#eaeaea',
    tabActiveBg: '#c5e1f5',
    tabIcon: '#444',
    tabIconActive: '#007bff',

    // ✅ NUEVO: Store/Toast y utilidades (mantienen tu look en claro)
    mutedText: '#6B7280',
    secondaryText: '#374151',
    mutedBg: '#E5E7EB',
    outline: '#a5afc4',
    imageBg: '#F3F4F6',
    inputBorder: '#D1D5DB',
    dangerSoft: 'rgba(239,68,68,0.15)',

    storeAccentPotenciador: '#3B5BDB',
    storeAccentCofre: '#0EA5E9',
    storeAccentRopa: '#10B981',
    storeRedBar: '#FF0000',
};

const THEME_KEY = 'ui_theme_pref';

type ThemeContextShape = { colors: Palette; scheme: Scheme; setScheme: (s: Scheme) => void; isDark: boolean; };

const ThemeContext = createContext<ThemeContextShape | null>(null);

const getSys = () => (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [scheme, setSchemeState] = useState<Scheme>('light');
    const [sys, setSys] = useState<'light' | 'dark'>(getSys());

    const overlay = useRef(new Animated.Value(0)).current;
    const [overlayColor, setOverlayColor] = useState<string | null>(null);
    const schemeRef = useRef<Scheme>('light');

    useEffect(() => {
        (async () => {
            try {
                const saved = await SecureStore.getItemAsync(THEME_KEY);
                if (saved === 'light' || saved === 'dark' || saved === 'system') {
                    schemeRef.current = saved;
                    setSchemeState(saved);
                    if (saved === 'system') setSys(getSys());
                }
            } catch {}
        })();
    }, []);

    const effective: 'light' | 'dark' = scheme === 'system' ? sys : scheme;
    const colors = effective === 'dark' ? DARK : LIGHT;

    const setScheme = (next: Scheme) => {
        const nextSys = next === 'system' ? getSys() : (next as 'light' | 'dark');
        const nextColors = nextSys === 'dark' ? DARK : LIGHT;

        setOverlayColor(nextColors.bg);
        overlay.setValue(1);

        schemeRef.current = next;
        setSchemeState(next);
        if (next === 'system') setSys(nextSys);
        SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});

        Animated.timing(overlay, { toValue: 0, duration: 480, useNativeDriver: true })
            .start(() => setOverlayColor(null));
    };

    useEffect(() => {
        const handler: Appearance.AppearanceListener = (prefs) => {
            const nextSys = (prefs.colorScheme ?? 'light') as 'light' | 'dark';
            if (schemeRef.current === 'system' && nextSys !== sys) {
                const nextColors = nextSys === 'dark' ? DARK : LIGHT;
                setOverlayColor(nextColors.bg);
                overlay.setValue(1);
                setSys(nextSys);
                Animated.timing(overlay, { toValue: 0, duration: 480, useNativeDriver: true })
                    .start(() => setOverlayColor(null));
            } else {
                setSys(nextSys);
            }
        };
        const subscription = Appearance.addChangeListener(handler);
        return () => {
            if ((subscription as any)?.remove) (subscription as any).remove();
            else (Appearance as any).removeChangeListener?.(handler as any);
        };
    }, [overlay, sys]);

    const value = useMemo(() => ({ colors, scheme, setScheme, isDark: effective === 'dark' }), [colors, scheme, effective]);

    return (
        <ThemeContext.Provider value={value}>
            <View style={{ flex: 1 }}>
                {children}
                {overlayColor ? (
                    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor, opacity: overlay }]} />
                ) : null}
            </View>
        </ThemeContext.Provider>
    );
};

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
    return ctx;
}
