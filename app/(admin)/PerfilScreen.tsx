// screens/PerfilScreen.tsx
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import FadeWrapper from '../../components/FadeWrapper';
import { colors } from '../../styles/globalStyles1';
import { useAuth } from '../../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const displayName = toTitle(fromEmail(user?.email) ?? 'Usuario');

  const onLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <FadeWrapper>
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.title}>Mi perfil</Text>
        </View>

        <View style={s.card}>
          <Row label="Nombre" value={displayName} />
          <Row label="Correo" value={user?.email ?? '—'} />
          <Row label="Rol" value={user?.rol ?? '—'} />
        </View>

        <TouchableOpacity style={s.btn} onPress={onLogout}>
          <Text style={s.btnTxt}>Cerrar sesión</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </FadeWrapper>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function fromEmail(email?: string | null) {
  if (!email) return undefined;
  const local = email.split('@')[0];
  return local.replace(/[._-]+/g, ' ');
}
function toTitle(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },

  card: {
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#F8FAFC',
    borderRadius: 12, padding: 12, gap: 10, marginBottom: 20,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#6b7280', fontWeight: '700' },
  rowValue: { color: '#111827', fontWeight: '600' },

  btn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.red,
    paddingHorizontal: 16, height: 44,
    borderRadius: 10, justifyContent: 'center',
  },
  btnTxt: { color: colors.white, fontWeight: '800' },
});
