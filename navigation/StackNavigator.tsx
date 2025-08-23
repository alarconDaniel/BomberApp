import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import OperarioTabs from './OperarioTabs';
import OperarioFormScreen from '../screens/OperarioFormScreen';

// ⬇️ EXPORTA este tipo para usarlo en otras pantallas
export type RootStackParamList = {
  Login: undefined;
  OperarioTabs: undefined;
  OperarioForm: { mode: 'create' | 'edit'; id?: string } | undefined; // <-- NUEVO
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"             // 👈 fuerza la primera pantalla
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OperarioTabs" component={OperarioTabs} />
      <Stack.Screen
        name="OperarioForm"
        component={OperarioFormScreen}
        options={{ title: 'Crear operario', headerShown: true }}
      />
    </Stack.Navigator>
  );
}


