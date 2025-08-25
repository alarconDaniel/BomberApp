// app/(admin)/(tabs)/retos/_layout.tsx
import { Stack } from 'expo-router';

export default function RetosStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Esta es la pantalla que SÍ es la tab (lista de retos) */}
      <Stack.Screen name="index" />

      {/* Pantallas internas (no aparecen en la barra de tabs) */}
      <Stack.Screen name="RetoEmparejarScreen" />
      <Stack.Screen name="RetoMultipleScreen" />
      <Stack.Screen name="RetoRellenarScreen" />
    </Stack>
  );
}
