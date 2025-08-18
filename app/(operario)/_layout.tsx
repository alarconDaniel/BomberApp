// app/(operario)/_layout.tsx
import {Tabs} from 'expo-router';
import FooterOperario from '../../components/FooterOperario';
import {FontAwesome5} from "@expo/vector-icons";

export default function OperarioTabsLayout() {
    return (
        <Tabs
            screenOptions={{headerShown: false}}
            tabBar={(props) => <FooterOperario {...props} />}
        >
            <Tabs.Screen
                name="HomeScreen"
                options={{
                    title: 'Home',
                    tabBarIcon: ({focused, color, size}) => (
                        <FontAwesome5 name="home" size={size ?? 24} color={color ?? (focused ? '#111' : '#888')}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="ProfileScreen"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({focused, color, size}) => (
                        <FontAwesome5 name="user" size={size ?? 24} color={color ?? (focused ? '#111' : '#888')} solid/>
                    ),
                }}
            />
            <Tabs.Screen name="StoreScreen" options={{
                title: 'Tienda', tabBarIcon: ({focused, color, size}) => (
                    <FontAwesome5 name="store" size={size ?? 24} color={color ?? (focused ? '#111' : '#888')}/>
                ),
            }}/>
            <Tabs.Screen name="InventoryScreen" options={{title: 'Inventario', tabBarIcon: ({focused, color, size}) => (
                    <FontAwesome5 name="box" size={size ?? 24} color={color ?? (focused ? '#111' : '#888')} solid/>
                ),}}/>
            <Tabs.Screen name="SettingsScreen" options={{title: 'Ajustes', tabBarIcon: ({focused, color, size}) => (
                    <FontAwesome5 name="cog" size={size ?? 24} color={color ?? (focused ? '#111' : '#888')} solid/>
                ),}}/>
        </Tabs>
    );
}
