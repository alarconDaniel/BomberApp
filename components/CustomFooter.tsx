import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/globalStyles1';

const LABELS: Record<string, string> = {
  Home: 'Home',
  Retos: 'Retos',
  Operarios: 'Operarios',
  Reportes: 'Reportes',
  Perfil: 'Perfil',
};

const TAB_HEIGHT = 64;

export default function CustomFooter({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 0);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];

        const label =
          LABELS[route.name] ??
          (typeof options.tabBarLabel === 'string' ? options.tabBarLabel : undefined) ??
          options.title ??
          route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={styles.tab}
            activeOpacity={0.9}
          >
            {/* placeholder de icono */}
            <View style={[styles.iconBox, focused ? styles.iconActive : styles.iconInactive]} />
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            <View style={[styles.indicator, focused && styles.indicatorOn]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: TAB_HEIGHT,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  iconBox: { width: 24, height: 24, borderRadius: 6 },
  iconInactive: { backgroundColor: '#cfcfcf' },
  iconActive: { backgroundColor: colors.blue },
  label: { fontSize: 11, color: '#4b5563' },
  labelActive: { fontWeight: '800', color: colors.blue },
  indicator: { marginTop: 2, width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  indicatorOn: { backgroundColor: colors.blue },
});
