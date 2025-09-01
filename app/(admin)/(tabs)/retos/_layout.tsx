// app/(admin)/(tabs)/retos/_layout.tsx
import { Stack } from 'expo-router';

export default function RetosStackLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // suave al abrir las screens
      }}
    >
      {/* 👇 ESTA es la pantalla de la TAB (lista de retos) */}
      <Stack.Screen name="index" />

      {/* 👇 Pantallas internas del stack de Retos */}
      <Stack.Screen name="RetoEmparejarScreen" />
      <Stack.Screen name="RetoMultipleScreen" />
      <Stack.Screen name="RetoRellenarScreen" />
    </Stack>
  );
}
