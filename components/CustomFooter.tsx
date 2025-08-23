// components/CustomFooter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

// ✅ Import "suave": no asumas que existe ThemeProvider/useTheme
//    (si no existe, no falla; usamos fallback).
import * as Theme from '../theme/ThemeProvider'; // si lo tienes en la raíz: '../ThemeProvider'
// y si NO tienes carpeta theme y el archivo está en la raíz, cambia la línea de arriba por:
// import * as Theme from '../ThemeProvider';

// 🎨 Paleta de respaldo (funciona sin provider)
const FALLBACK = {
  tabBg: '#fefefe',
  tabBorder: '#ddd',
  tabButtonBg: '#eaeaea',
  tabActiveBg: '#c5e1f5',
  tabIcon: '#444',
  tabIconActive: '#007bff',
  text: '#0f172a',
  mutedText: '#6B7280',
};

export default function CustomFooter({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // ✅ Usa Theme si existe; si no, usa FALLBACK
  let colors = FALLBACK;
  try {
    // @ts-ignore: Theme puede no exportar useTheme
    if (typeof Theme.useTheme === 'function') {
      // @ts-ignore
      const ctx = Theme.useTheme();
      if (ctx?.colors) colors = { ...FALLBACK, ...ctx.colors };
    }
  } catch {
    // sin provider / sin hook -> usamos FALLBACK
  }

  // -------- Animación del "pill" activo --------
  const progress = useRef(new Animated.Value(state.index)).current;
  useEffect(() => {
    Animated.spring(progress, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 140,
      friction: 18,
    }).start();
  }, [state.index]);

  // -------- Medidas para el indicador --------
  const [wrapW, setWrapW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWrapW(e.nativeEvent.layout.width);

  const count = state.routes.length;
  const GAP = 10;
  const H_PAD = 12;
  const BTN_W = useMemo(() => {
    if (!wrapW) return 0;
    return (wrapW - H_PAD * 2 - GAP * (count - 1)) / count;
  }, [wrapW, count]);

  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: Array.from({ length: count }, (_, i) => i),
        outputRange: Array.from({ length: count }, (_, i) => i * (BTN_W + GAP)),
      }),
    [progress, count, BTN_W]
  );

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View
        onLayout={onLayout}
        style={[
          styles.container,
          { backgroundColor: colors.tabBg, borderColor: colors.tabBorder, shadowColor: colors.tabBorder },
        ]}
      >
        {BTN_W > 0 && (
          <Animated.View
            style={[styles.pill, { width: BTN_W, transform: [{ translateX }], backgroundColor: colors.tabActiveBg }]}
          />
        )}

        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key].options;

          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };

          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          const { icon, label } = getTabMeta(route.name, isFocused);

          // Soporta tabBarLabel string o función
          const labelNode =
            typeof options.tabBarLabel === 'function'
              ? options.tabBarLabel({
                  focused: isFocused,
                  color: isFocused ? colors.tabIconActive : colors.tabIcon,
                  position: 'below-icon',
                  children: label,
                })
              : typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : label;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.button, { width: BTN_W || undefined, backgroundColor: colors.tabButtonBg }]}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
              <Ionicons
                name={icon}
                size={20}
                color={isFocused ? colors.tabIconActive : colors.tabIcon}
                style={{ marginBottom: 2 }}
              />
              {typeof labelNode === 'string' ? (
                <Text numberOfLines={1} style={[styles.caption, { color: isFocused ? colors.tabIconActive : colors.tabIcon }]}>
                  {labelNode}
                </Text>
              ) : (
                labelNode
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getTabMeta(name: string, focused: boolean): { icon: keyof typeof Ionicons.glyphMap; label: string } {
  switch (name) {
    case 'Home':      return { icon: focused ? 'home' : 'home-outline', label: 'Home' };
    case 'Retos':     return { icon: focused ? 'trophy' : 'trophy-outline', label: 'Retos' };
    case 'Operarios': return { icon: focused ? 'people' : 'people-outline', label: 'Operarios' };
    case 'Reportes':  return { icon: focused ? 'stats-chart' : 'stats-chart-outline', label: 'Reportes' };
    case 'Perfil':    return { icon: focused ? 'person-circle' : 'person-circle-outline', label: 'Perfil' };
    default:          return { icon: 'ellipse', label: name };
  }
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  container: {
    marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, elevation: 8,
    shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden',
  },
  pill: { position: 'absolute', top: 6, bottom: 6, left: 12, borderRadius: 12 },
  button: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
  caption: { fontSize: 12 },
});
