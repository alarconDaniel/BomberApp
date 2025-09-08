// app/(admin)/_layout.tsx
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FooterAdmin from '../../components/admin/CustomFooter';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../auth/AuthContext';

export default function TabsLayout() {
    const { colors } = useTheme();
    const { user } = useAuth();

    const isAdmin = (() => {
        const r = user?.rol as unknown;
        if (typeof r === 'number') return r === 1; // 1 = admin
        return String(r ?? '').toLowerCase() === 'admin';
    })();

    // 👇 Lista blanca: SOLO estos tabs salen en el footer
    const allowedTabs = [
        'HomeScreen',
        'OperariosScreen',
        'RetosScreen',
        'ReportesScreen',
        'PerfilScreen',
        'AdminSettingsScreen',
    ];

    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(p) => <FooterAdmin {...p} allowedTabs={allowedTabs} />} // ← aquí la magia
        >
            <Tabs.Screen
                name="HomeScreen"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="home"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="OperariosScreen"
                options={{
                    title: 'Operarios',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="users"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                            solid
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="RetosScreen"
                options={{
                    title: 'Retos',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="tasks"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                            solid
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="ReportesScreen"
                options={{
                    title: 'Reportes',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="file-alt"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                            solid
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="PerfilScreen"
                options={{
                    title: 'Perfil',
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="user"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                            solid
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="AdminSettingsScreen"
                options={{
                    title: 'Admin',
                    // no usamos href aquí para evitar types raros; la visibilidad la controla allowedTabs
                    tabBarIcon: ({ focused, color, size }) => (
                        <FontAwesome5
                            name="tools"
                            size={size ?? 24}
                            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                            solid
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
