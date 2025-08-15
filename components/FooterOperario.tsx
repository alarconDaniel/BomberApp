
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {styles} from "../styles/globalStyles";
import {useState} from "react";

export default function Footer({ state, descriptors, navigation }: BottomTabBarProps) {

    var tum;
    const [tral, setTral] = useState(2);

    setTral(3);

    function traeretos(url: string): any  {
        console.log("La url es" + url);
        return 2;
    }

    if (tral == 2){
        return (
            <View>
                <Text>
                    hola
                </Text>
            </View>
        )
    }

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



