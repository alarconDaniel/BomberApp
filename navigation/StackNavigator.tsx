// navigation/StackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import OperarioTabs from './OperarioTabs';
import OperarioFormScreen from '../screens/OperarioFormScreen';
import RetoMultipleScreen from '../screens/retos/RetoMultipleScreen';
import RetoEmparejarScreen from '../screens/retos/RetoEmparejarScreen';
import RetoRellenarScreen from '../screens/retos/RetoRellenarScreen';

export type RootStackParamList = {
  Login: undefined;
  OperarioTabs: undefined;

  // 👇 ya los tenías, solo verifica
  RetoMultiple: {
    pregunta: string;
    opciones: { id: string; texto: string; correcta?: boolean }[];
    multiple?: boolean;
  };

  RetoEmparejar: {
    pares: { izquierda: string; derecha: string }[]; // 👈 importante
  };

  RetoRellenar: {
    respuesta: string;
    pista?: string;
    textoBase?: string;
    revelarBordes?: boolean;
  };

  OperarioForm: { mode: 'create' | 'edit'; id?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OperarioTabs" component={OperarioTabs} />

      <Stack.Screen
        name="OperarioForm"
        component={OperarioFormScreen}
        options={{ title: 'Crear operario', headerShown: true }}
      />

      <Stack.Screen
        name="RetoMultiple"
        component={RetoMultipleScreen}
        options={{ title: 'Reto: Opción múltiple', headerShown: true }}
      />
      <Stack.Screen
        name="RetoEmparejar"
        component={RetoEmparejarScreen}
        options={{ title: 'Reto: Emparejar', headerShown: true }}
      />
      <Stack.Screen
        name="RetoRellenar"
        component={RetoRellenarScreen}
        options={{ title: 'Reto: Rellenar', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
