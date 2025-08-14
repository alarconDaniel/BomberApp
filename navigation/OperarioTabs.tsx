import React from 'react';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import RetosScreen from '../screens/RetosScreen';
import OperariosScreen from '../screens/OperariosScreen';
import ReportesScreen from '../screens/ReportesScreen';
import PerfilScreen from '../screens/PerfilScreen';
import CustomFooter from '../components/CustomFooter';

export type RootTabParamList = {
  Home: undefined;
  Retos: undefined;
  Operarios: undefined;
  Reportes: undefined;
  Perfil: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function OperarioTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props: BottomTabBarProps) => <CustomFooter {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Retos" component={RetosScreen} />
      <Tab.Screen name="Operarios" component={OperariosScreen} />
      <Tab.Screen name="Reportes" component={ReportesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
    </Tab.Navigator>
  );
}
