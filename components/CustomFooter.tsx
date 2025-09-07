// components/CustomFooter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme opcional (si no hay provider, usamos fallback sin romper)
import * as Theme from '../theme/ThemeProvider';

// 👇 extendemos las props para recibir la whitelist
type FooterProps = BottomTabBarProps & {
  allowedTabs?: string[];
};

const FALLBACK = {
  tabBg: '#ffffff',
  tabBorder: 'rgba(0,0,0,0.06)',
  tabButtonBg: '#f3f4f6',
  tabActiveBg: 'rgba(108,140,255,0.18)',
  tabIcon: '#6b7280',
  tabIconActive: '#1f2937',
  text: '#0f172a',
};

export default function CustomFooter({ state, descriptors, navigation, allowedTabs }: FooterProps) {
  const insets = useSafeAreaInsets();

  // Colores desde theme si existe, con fallback robusto.
  let colors = FALLBACK;
  try {
    // @ts-ignore
    const ctx = typeof Theme.useTheme === 'function' ? Theme.useTheme() : null;
    if (ctx?.colors) colors = { ...FALLBACK, ...ctx.colors };
  } catch {}

  const normalize = (s?: string) => (s ?? '').trim();

  // 🔎 Rutas “de verdad”:
  // - Excluye grupos (nombres que empiezan por "(" ), p. ej. "(tabs)"
  // - Si hay allowedTabs, solo incluye esos nombres exactos (lo que tú pusiste en _layout)
  // - Además pedimos que tenga icono o label (señal de que el tab está declarado a propósito)
  const routes = useMemo(() => {
    return state.routes.filter((r) => {
      const name = normalize(r.name);
      if (name.startsWith('(')) return false; // fuera grupos (tabs, admin, etc.)

      if (Array.isArray(allowedTabs) && allowedTabs.length > 0) {
        if (!allowedTabs.includes(name)) return false;
      }

      const opts = descriptors[r.key]?.options || {};
      const hasIcon = typeof opts.tabBarIcon === 'function';
      const hasLabel = typeof opts.title === 'string' || typeof opts.tabBarLabel === 'string';
      return hasIcon || hasLabel;
    });
  }, [state.routes, descriptors, allowedTabs]);

  // Ajustar índice visible por si el estado apunta a algo filtrado
  const currentIndex = useMemo(() => {
    const currentKey = state.routes[state.index]?.key;
    const i = routes.findIndex((r) => r.key === currentKey);
    return i >= 0 ? i : 0;
  }, [state.index, state.routes, routes]);

  // Animación del “pill”
  const progress = useRef(new Animated.Value(currentIndex)).current;
  useEffect(() => {
    Animated.spring(progress, {
      toValue: currentIndex,
      useNativeDriver: true,
      tension: 140,
      friction: 18,
    }).start();
  }, [currentIndex, progress]);

  // Layout → ancho por botón
  const [wrapW, setWrapW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWrapW(e.nativeEvent.layout.width);

  const COUNT = routes.length;
  const GAP = 10;
  const H_PAD = 12;

  const BTN_W = useMemo(() => {
    if (!wrapW || COUNT === 0) return 0;
    return (wrapW - H_PAD * 2 - GAP * (COUNT - 1)) / COUNT;
  }, [wrapW, COUNT]);

  const translateX = useMemo(() => {
    const inputRange = Array.from({ length: COUNT }, (_, i) => i);
    const outputRange = Array.from({ length: COUNT }, (_, i) => i * (BTN_W + GAP));
    return progress.interpolate({ inputRange, outputRange });
  }, [progress, COUNT, BTN_W, GAP]);

  return (
      <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
        <View
            onLayout={onLayout}
            style={[
              styles.container,
              { backgroundColor: colors.tabBg, borderColor: colors.tabBorder, shadowColor: colors.tabBorder },
            ]}
        >
          {BTN_W > 0 && COUNT > 0 && (
              <Animated.View
                  style={[
                    styles.pill,
                    { width: BTN_W, transform: [{ translateX }], backgroundColor: colors.tabActiveBg },
                  ]}
              />
          )}

          {routes.map((route, idx) => {
            const isFocused = idx === currentIndex;
            const options = descriptors[route.key]?.options || {};

            const tint = isFocused ? colors.tabIconActive : colors.tabIcon;

            const label =
                (options.title as string) ??
                (options.tabBarLabel as string) ??
                route.name;

            const size = 20;
            const iconNode =
                typeof options.tabBarIcon === 'function'
                    ? options.tabBarIcon({ focused: isFocused, color: tint, size })
                    : null;

            const onPress = () => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name);
            };

            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
                <Pressable
                    key={route.key}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={[styles.button, { width: BTN_W || undefined }]}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                >
                  {iconNode ?? (
                      <Text style={[styles.fallback, { color: tint }]}>
                        {label?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                  )}
                  <Text numberOfLines={1} style={[styles.caption, { color: tint }]}>
                    {label}
                  </Text>
                </Pressable>
            );
          })}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  container: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    elevation: 10,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  pill: { position: 'absolute', top: 6, bottom: 6, left: 12, borderRadius: 12 },
  button: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: { fontSize: 18, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600' },
});
