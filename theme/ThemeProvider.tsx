// theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, Animated, View, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type Scheme = 'light' | 'dark' | 'system';

export type Palette = {
    bg: string;
    card: string;
    cardTint: string;
    text: string;
    sub: string;
    primary: string;
    primarySoft: string;
    divider: string;
    danger: string;
};

const DARK: Palette = {
    bg: '#0f172a',
    card: '#111827',
    cardTint: '#0b1220',
    text: '#e5e7eb',
    sub: '#a5b4fc',
    primary: '#7c3aed',
    primarySoft: '#c4b5fd',
    divider: 'rgba(255,255,255,0.08)',
    danger: '#ef4444',
};

const LIGHT: Palette = {
    bg: '#f8fafc',
    card: '#ffffff',
    cardTint: '#f1f5f9',
    text: '#0f172a',
    sub: '#6C8CFF',
    primary: '#6C8CFF',
    primarySoft: '#c4d1ff',
    divider: 'rgba(15,23,42,0.08)',
    danger: '#b91c1c',
};

const THEME_KEY = 'ui_theme_pref';

type ThemeContextShape = {
    colors: Palette;
    scheme: Scheme;                 // preferencia (light | dark | system)
    setScheme: (s: Scheme) => void; // cambia y ANIMA
    isDark: boolean;                // estado efectivo
};

const ThemeContext = createContext<ThemeContextShape | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Por defecto: claro (lo pediste así)
    const [scheme, setSchemeState] = useState<Scheme>('light');
    const [sys, setSys] = useState<'light' | 'dark'>(Appearance.getColorScheme() ?? 'light');

    // Overlay para transicionar
    const overlay = useRef(new Animated.Value(0)).current;
    const [overlayColor, setOverlayColor] = useState<string | null>(null);
    const schemeRef = useRef<Scheme>('light'); // para saber valor actual dentro de efectos

    useEffect(() => {
        (async () => {
            const saved = await SecureStore.getItemAsync(THEME_KEY);
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                schemeRef.current = saved;
                setSchemeState(saved);
            }
        })();
    }, []);

    // Efectivo: si scheme=system, se usa sys
    const effective: 'light' | 'dark' = scheme === 'system' ? sys : scheme;
    const colors = effective === 'dark' ? DARK : LIGHT;

    // Cambia de tema con cross-fade
    const setScheme = (next: Scheme) => {
        const nextEff: 'light' | 'dark' = next === 'system' ? (Appearance.getColorScheme() ?? 'light') : next;
        const nextColors = nextEff === 'dark' ? DARK : LIGHT;

        // 1) cubrimos con overlay del color destino
        setOverlayColor(nextColors.bg);
        overlay.setValue(1);

        // 2) aplicamos preferencia y persistimos
        schemeRef.current = next;
        setSchemeState(next);
        SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});

        // 3) desvanecemos overlay
        Animated.timing(overlay, { toValue: 0, duration: 480, useNativeDriver: true }).start(() => {
            setOverlayColor(null);
        });
    };

    // Si el sistema cambia mientras estamos en 'system', también animamos
    useEffect(() => {
        const sub = Appearance.addChangeListener(({ colorScheme }) => {
            const nextSys = (colorScheme ?? 'light') as 'light' | 'dark';
            if (schemeRef.current === 'system' && nextSys !== sys) {
                const nextColors = nextSys === 'dark' ? DARK : LIGHT;
                setOverlayColor(nextColors.bg);
                overlay.setValue(1);
                setSys(nextSys);
                Animated.timing(overlay, { toValue: 0, duration: 480, useNativeDriver: true }).start(() => {
                    setOverlayColor(null);
                });
            } else {
                setSys(nextSys);
            }
        });
        return () => sub.remove();
    }, [sys, overlay]);

    const value = useMemo(
        () => ({ colors, scheme, setScheme, isDark: effective === 'dark' }),
        [colors, scheme, effective]
    );

    return (
        <ThemeContext.Provider value={value}>
            <View style={styles.flex1}>
                {children}
                {overlayColor ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFillObject,
                            { backgroundColor: overlayColor, opacity: overlay },
                        ]}
                    />
                ) : null}
            </View>
        </ThemeContext.Provider>
    );
};

const styles = StyleSheet.create({ flex1: { flex: 1 } });

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
    return ctx;
}
