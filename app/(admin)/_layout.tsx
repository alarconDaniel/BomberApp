// app/(admin)/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FooterAdmin from '../../components/CustomFooter';
import { useTheme } from '../../theme/ThemeProvider';
import { useAuth } from '../../auth/AuthContext';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isAdmin = (() => {
    const r = user?.rol as unknown;
    if (typeof r === 'number') return r === 1;      // 1 = admin
    return String(r).toLowerCase() === 'admin';     // 'admin' | 'operario' | ...
  })();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <FooterAdmin {...p} />}>
      {/* Tabs principales */}
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

      {/* Ajustes (solo admin) → archivo: app/(admin)/(tabs)/SettingsScreen.tsx */}
      {isAdmin && (
        <Tabs.Screen
          name="SettingsScreen"   // ✅ nombre relativo correcto
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ focused, color, size }) => (
              <FontAwesome5
                name="cog"
                size={size ?? 24}
                color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)}
                solid
              />
            ),
          }}
        />
      )}

      {/* Ocultar rutas internas que no deben aparecer como tab (nombres relativos al folder) */}
      <Tabs.Screen name="retos" options={{ href: null }} />
      <Tabs.Screen name="operarios/OperarioFormScreen" options={{ href: null }} />
    </Tabs>
  );
}
