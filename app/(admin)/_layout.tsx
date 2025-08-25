import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FooterAdmin from '../../components/CustomFooter';
import { useTheme } from '../../theme/ThemeProvider';


export default function AdminTabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <FooterAdmin {...p} />}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5 name="home" size={size ?? 24}
              color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
          ),
        }}
      />
      <Tabs.Screen
        name="retos"
        options={{
          title: 'Retos',
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5 name="tasks" size={size ?? 24}
              color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} />
          ),
        }}
      />
      <Tabs.Screen
        name="operarios"
        options={{
          title: 'Operarios',
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5 name="users" size={size ?? 24}
              color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5 name="user-cog" size={size ?? 24}
              color={color ?? (focused ? colors.tabIconActive : colors.tabIcon)} solid />
          ),
        }}
      />
    </Tabs>
  );
}
