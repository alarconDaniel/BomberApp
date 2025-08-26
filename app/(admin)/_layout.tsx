import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FooterAdmin from '../../components/CustomFooter';
import { useTheme } from '../../theme/ThemeProvider';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <FooterAdmin {...p} />}>
      {/* ✅ LAS 4 TABS QUE SÍ QUIERES */}
      <Tabs.Screen name="HomeScreen" options={{ title: 'Home',
        tabBarIcon: ({ focused, color, size }) => (
          <FontAwesome5 name="home" size={size ?? 24}
            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
        ),
      }} />
      <Tabs.Screen name="RetosScreen" options={{ title: 'Retos',
        tabBarIcon: ({ focused, color, size }) => (
          <FontAwesome5 name="tasks" size={size ?? 24}
            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
        ),
      }} />
      <Tabs.Screen name="OperariosScreen" options={{ title: 'Operarios',
        tabBarIcon: ({ focused, color, size }) => (
          <FontAwesome5 name="users" size={size ?? 24}
            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
        ),
      }} />

      <Tabs.Screen name="ReportesScreen" options={{ title: 'Reportes',
        tabBarIcon: ({ focused, color, size }) => (
          <FontAwesome5 name="user-cog" size={size ?? 24}
            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
        ),
      }} />

      <Tabs.Screen name="PerfilScreen" options={{ title: 'Perfil',
        tabBarIcon: ({ focused, color, size }) => (
          <FontAwesome5 name="user-cog" size={size ?? 24}
            color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
        ),
      }} />

      

      {/* ⛔️ OCULTA RUTAS QUE NO DEBEN SER TAB */}
      <Tabs.Screen name="retos" options={{ href: null }} />        {/* ← oculta la carpeta retos */}
    
    </Tabs>
  );
}
