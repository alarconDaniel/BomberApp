// screens/HomeScreen.tsx
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../styles/globalStyles1';

export default function HomeScreen() {
  const { user } = useAuth();
  const nombre = user?.email?.split('@')[0] || 'usuario';

  return (
    <SafeAreaView style={s.container}>
      <View style={s.center}>
        <Text style={s.h1}>¡Bienvenido, {nombre}!</Text>
        <Text style={s.sub}>Rol: {user?.rol ?? '-'}</Text>
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  h1: { fontSize: 24, fontWeight: '800', color: colors.navy },
  sub: { marginTop: 6, color: '#6b7280' },
});
