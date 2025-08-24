// navigation/StackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import OperarioTabs from './OperarioTabs';
import OperarioFormScreen from '../screens/OperarioFormScreen';
import RetoMultipleScreen from '../screens/retos/RetoMultipleScreen';
import RetoEmparejarScreen from '../screens/retos/RetoEmparejarScreen';
import RetoRellenarScreen from '../screens/retos/RetoRellenarScreen';

export type RootStackParamList = {
  Login: undefined;
  OperarioTabs: undefined;
  OperarioForm: { mode: 'create' | 'edit'; id?: string } | undefined;
  RetoMultiple: {
    pregunta: string;
    opciones: { id: string; texto: string; correcta?: boolean }[];
    multiple?: boolean;
  };
  RetoEmparejar: { pares: { izquierda: string; derecha: string }[] };
  RetoRellenar: { respuesta: string; pista?: string; textoBase?: string; revelarBordes?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // o un <Splash /> simple

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="OperarioTabs" component={OperarioTabs} />
          <Stack.Screen
            name="OperarioForm"
            component={OperarioFormScreen}
            options={{ headerShown: true, title: 'Crear operario' }}
          />
          <Stack.Screen
            name="RetoMultiple"
            component={RetoMultipleScreen}
            options={{ headerShown: true, title: 'Reto: Opción múltiple' }}
          />
          <Stack.Screen
            name="RetoEmparejar"
            component={RetoEmparejarScreen}
            options={{ headerShown: true, title: 'Reto: Emparejar' }}
          />
          <Stack.Screen
            name="RetoRellenar"
            component={RetoRellenarScreen}
            options={{ headerShown: true, title: 'Reto: Rellenar' }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
