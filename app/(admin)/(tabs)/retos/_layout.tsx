import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FooterAdmin from '../../../../components/CustomFooter';
import { useTheme } from '../../../../theme/ThemeProvider';
import { useAuth } from '../../../../auth/AuthContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isAdmin = (() => {
    const r = (user as any)?.rol;
    if (typeof r === 'number') return r === 1;       // 1 = admin
    return String(r ?? '').toLowerCase() === 'admin';
  })();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <FooterAdmin {...p} />}>
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
        name="RetosScreen"
        options={{
          title: 'Retos',
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5
              name="tasks"
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
            />
          ),
        }}
      />
      {/* Ajustes: montado siempre; oculto para no-admin */}
      <Tabs.Screen
        name="SettingsScreen"
        options={{
          title: 'Ajustes',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5
              name="cog"
              solid
              size={size ?? 24}
              color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
            />
          ),
        }}
      />

      {/*
        NO declares aquí rutas internas como "(tabs)/retos" o
        "operarios/OperarioFormScreen". Esas viven en sus propios
        stacks/carpetas y se navegan por path, sin ser tabs.
      */}
    </Tabs>
  );
}
