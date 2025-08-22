// components/FooterOperario.tsx
import { View, TouchableOpacity, Text } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { styles as global } from '../styles/globalStyles';
import { useTheme } from '../theme/ThemeProvider';

export default function FooterOperario({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();

    return (
        <View style={[global.container, { backgroundColor: colors.tabBg, borderColor: colors.tabBorder }]}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const options = descriptors[route.key]?.options || {};
                const label = (options.title as string) ?? (options.tabBarLabel as string) ?? route.name;

                const onPress = () => !isFocused && navigation.navigate(route.name as never);
                const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

                // ✅ SOLO colores desde el theme
                const color = isFocused ? colors.tabIconActive : colors.tabIcon;
                const size = global.icon?.fontSize ? Number(global.icon.fontSize) : 18;

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
                            global.button,
                            { backgroundColor: colors.tabButtonBg },
                            isFocused && { backgroundColor: colors.tabActiveBg }, // 🔵 activo desde theme
                        ]}
                    >
                        {maybeIcon ?? (
                            <Text style={[global.icon, { color }, isFocused && global.iconActive]}>
                                {label?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
