
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {styles} from "../styles/globalStyles";

export default function Footer({ state, descriptors, navigation }: BottomTabBarProps) {
    return (
        <View style={styles.container}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const optionLabel = descriptors[route.key].options.tabBarLabel;
                const label =
                    typeof optionLabel === 'string'
                        ? optionLabel
                        : route.name;



                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        onPress={onPress}
                        style={[styles.button, isFocused && styles.active]}
                    >
                        <Text style={[styles.icon, isFocused && styles.iconActive]}>
                            {label[0]}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}



