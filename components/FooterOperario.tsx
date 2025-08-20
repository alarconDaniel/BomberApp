// components/FooterOperario.tsx
import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { styles as global } from '../styles/globalStyles';
import { useTheme } from '../theme/ThemeProvider';

export default function FooterOperario({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();
    const s = useMemo(() => makeStyles(colors), [colors]);

    return (
        <View
            style={[
                global.container,          // mantiene ubicación, alto, layout
                s.containerTint,           // solo cambia colores (bg/borde/sombra)
            ]}
        >
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const options = descriptors[route.key]?.options || {};
                const label =
                    (options.title as string) ??
                    (options.tabBarLabel as string) ??
                    route.name;

                const onPress = () => {
                    if (!isFocused) navigation.navigate(route.name as never);
                };
                const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

                // Colores/tamaños del icono: respetamos tus sizes y caemos a tema si no hay color en global
                const size = global.icon?.fontSize ? Number(global.icon.fontSize) : 18;
                const activeColor   = (global.iconActive as any)?.color ?? colors.primary;
                const inactiveColor = (global.icon as any)?.color ?? colors.sub;
                const color = isFocused ? activeColor : inactiveColor;

                // Si el screen definió icono, lo invocamos con el color/size tematizado
                const maybeIcon =
                    typeof options.tabBarIcon === 'function'
                        ? options.tabBarIcon({ focused: isFocused, color, size })
                        : null;

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={[
                            global.button,               // mantiene forma/diámetro (círculo)
                            isFocused && global.active,  // mantiene “activo” original
                            isFocused ? s.buttonActiveTint : s.buttonIdleTint, // solo color de fondo/borde
                        ]}
                        activeOpacity={0.85}
                    >
                        {maybeIcon ?? (
                            <Text style={[global.icon, isFocused && global.iconActive, { color }]}>
                                {label?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const makeStyles = (c: import('../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        // Tinte del contenedor: solo color y borde; NO tocamos layout del global.container
        containerTint: {
            backgroundColor: c.card,
            borderTopWidth: 1,
            borderTopColor: c.divider,
            // sombras sutiles (sin alterar height/position del global)
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowOffset: { width: 0, height: -2 },
            shadowRadius: 6,
            elevation: 10,
        },

        // Botón inactivo: respetamos radio/size del global.button; sólo color/borde
        buttonIdleTint: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
        },

        // Botón activo: mismo círculo del global.active, pero con colores del tema
        buttonActiveTint: {
            backgroundColor: c.cardTint,
            borderColor: c.divider,
            borderWidth: 1,
        },
    });
