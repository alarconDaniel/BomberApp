// app/(operario)/_layout.tsx
import { Tabs } from 'expo-router';
import FooterOperario from '../../components/operario/FooterOperario';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

export default function OperarioTabsLayout() {
    const { colors } = useTheme();

    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <FooterOperario {...props} />}
        >
            <Tabs.Screen
                name="HomeScreen"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5 name="home" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="ProfileScreen"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5 name="user" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid />
                    ),
                }}
            />
            <Tabs.Screen
                name="StoreScreen"
                options={{
                    title: 'Tienda',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5 name="store" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
                    ),
                }}
            />
            <Tabs.Screen
                name="InventoryScreen"
                options={{
                    title: 'Inventario',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5 name="box" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid />
                    ),
                }}
            />

            <Tabs.Screen name="RankingScreen" options={{title: 'Ranking', tabBarIcon: ({focused, color, size}) => (
                    <FontAwesome5 name="trophy" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid/>
                ),}}/>

            <Tabs.Screen
                name="SettingsScreen"
                options={{
                    title: 'Ajustes',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5 name="cog" size={size ?? 24} color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid />
                    ),
                }}
            />




        </Tabs>
    );
}