// components/CustomFooter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

// Theme opcional (si no hay provider, usamos fallback sin romper)
import * as Theme from '../../theme/ThemeProvider';

const FALLBACK = {
  tabBg: '#ffffff',
  tabBorder: 'rgba(0,0,0,0.06)',
  tabButtonBg: '#f3f4f6',
  tabActiveBg: 'rgba(108,140,255,0.18)',
  tabIcon: '#6b7280',
  tabIconActive: '#1f2937',
  text: '#0f172a',
};

const VISIBLE_NAMES = ['homescreen', 'retosscreen', 'operariosscreen', 'reportesscreen', 'perfilscreen'];

export default function CustomFooter({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // colores desde theme si existe
  let colors = FALLBACK;
  try {
    // @ts-ignore
    const ctx = typeof Theme.useTheme === 'function' ? Theme.useTheme() : null;
    if (ctx?.colors) colors = { ...FALLBACK, ...ctx.colors };
  } catch {}

  // --- Filtra SOLO las 5 tabs deseadas y aquellas sin tabBarButton oculto ---
  const visibleRoutes = useMemo(() => {
    return state.routes.filter((r) => {
      const opts = descriptors[r.key]?.options || {};
      if (typeof opts.tabBarButton === 'function') return false; // explícitamente ocultas
      const norm = normalize(r.name);
      return VISIBLE_NAMES.includes(norm);
    });
  }, [state.routes, descriptors]);

  // índice del tab visible actual (por si el index apunta a una ruta oculta)
  const currentVisibleIndex = useMemo(() => {
    const currentName = state.routes[state.index]?.name;
    const idx = visibleRoutes.findIndex((r) => normalize(r.name) === normalize(currentName ?? ''));
    return Math.max(0, idx);
  }, [state, visibleRoutes]);

  // animación del “pill”
  const progress = useRef(new Animated.Value(currentVisibleIndex)).current;
  useEffect(() => {
    Animated.spring(progress, {
      toValue: currentVisibleIndex,
      useNativeDriver: true,
      tension: 140,
      friction: 18,
    }).start();
  }, [currentVisibleIndex]);

  // layout → ancho por botón
  const [wrapW, setWrapW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWrapW(e.nativeEvent.layout.width);

  const COUNT = visibleRoutes.length;
  const GAP = 10;
  const H_PAD = 12;
  const BTN_W = useMemo(() => {
    if (!wrapW || COUNT === 0) return 0;
    return (wrapW - H_PAD * 2 - GAP * (COUNT - 1)) / COUNT;
  }, [wrapW, COUNT]);

  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: Array.from({ length: COUNT }, (_, i) => i),
        outputRange: Array.from({ length: COUNT }, (_, i) => i * (BTN_W + GAP)),
      }),
    [progress, COUNT, BTN_W]
  );

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
      <View
        onLayout={onLayout}
        style={[
          styles.container,
          { backgroundColor: colors.tabBg, borderColor: colors.tabBorder, shadowColor: colors.tabBorder },
        ]}
      >
        {BTN_W > 0 && (
          <Animated.View
            style={[
              styles.pill,
              { width: BTN_W, transform: [{ translateX }], backgroundColor: colors.tabActiveBg },
            ]}
          />
        )}

        {visibleRoutes.map((route, idx) => {
          const isFocused = idx === currentVisibleIndex;
          const options = descriptors[route.key]?.options || {};
          const tint = isFocused ? colors.tabIconActive : colors.tabIcon;

          const { icon, label } = getMeta(route.name, isFocused);
          const title = (options.title as string) || label;

          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.button, { width: BTN_W || undefined }]}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
              <Ionicons name={icon} size={20} color={tint} style={{ marginBottom: 2 }} />
              <Text numberOfLines={1} style={[styles.caption, { color: tint }]}>{title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function normalize(name: string) {
  return (name ?? '').toLowerCase().trim();
}

function getMeta(name: string, focused: boolean): { icon: keyof typeof Ionicons.glyphMap; label: string } {
  const n = normalize(name);
  if (n === 'homescreen' || n === 'home') {
    return { icon: focused ? 'home' : 'home-outline', label: 'Home' };
  }
  if (n === 'retosscreen' || n === 'retos') {
    return { icon: focused ? 'trophy' : 'trophy-outline', label: 'Retos' };
  }
  if (n === 'operariosscreen' || n === 'operarios') {
    return { icon: focused ? 'people' : 'people-outline', label: 'Operarios' };
  }
  // ✅ Reportes incluido
  if (n === 'reportesscreen' || n === 'reportes' || n === 'reportestab') {
    return { icon: focused ? 'stats-chart' : 'stats-chart-outline', label: 'Reportes' };
  }
  if (n === 'perfilscreen' || n === 'perfil') {
    return { icon: focused ? 'person-circle' : 'person-circle-outline', label: 'Perfil' };
  }
  return { icon: 'ellipse', label: name };
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
  caption: { fontSize: 12, fontWeight: '600' },
});
