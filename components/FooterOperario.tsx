import { View, TouchableOpacity, Text } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { styles as global } from '../styles/globalStyles';

export default function FooterOperario({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={global.container}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const options = descriptors[route.key]?.options || {};
                const label = (options.title as string) ?? (options.tabBarLabel as string) ?? route.name;

                const onPress = () => !isFocused && navigation.navigate(route.name as never);
                const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

                // Preparamos colores/tamaños para el icono
                const color = isFocused ? global.iconActive?.color ?? '#111' : global.icon?.color ?? '#888';
                const size = global.icon?.fontSize ? Number(global.icon.fontSize) : 18;

                // Si el screen definió tabBarIcon, lo invocamos
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
                        style={[global.button, isFocused && global.active]}
                    >
                        {maybeIcon ?? (
                            <Text style={[global.icon, isFocused && global.iconActive]}>
                                {label?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
