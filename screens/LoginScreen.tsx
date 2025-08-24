import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/StackNavigator';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../styles/globalStyles1';
import { API } from '../config/api'; // <- si no tienes auth, igual funciona con el fallback

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const passOk = pass.trim().length >= 4; // ajusta tu política

  const normalizarNombre = (u: any) => {
    // Intentamos varios formatos comunes que pueda devolver tu backend
    const n =
      u?.nombreUsuario ?? u?.nombre_usuario ?? u?.first_name ?? u?.nombre ?? '';
    const a =
      u?.apellidoUsuario ??
      u?.apellido_usuario ??
      u?.last_name ??
      u?.apellido ??
      '';
    const name = u?.nombreCompleto ?? u?.full_name ?? u?.name ?? `${n} ${a}`.trim();
    return (name && name.trim()) || null;
  };

  const mockLogin = async () => {
    // Fallback si no tienes endpoint aún.
    // Acepta cualquier email/pass y genera nombre desde el correo.
    await new Promise(r => setTimeout(r, 500));
    const localName = email.includes('@') ? email.split('@')[0] : 'Usuario';
    return {
      ok: true,
      usuario: {
        id: 0,
        correo: email.trim(),
        nombre: localName.charAt(0).toUpperCase() + localName.slice(1),
        apellido: '',
        rol: 'Operario',
      },
    };
  };

  const onSubmit = async () => {
    if (!emailOk || !passOk) {
      Alert.alert(
        'Datos inválidos',
        !emailOk ? 'El correo no es válido.' : 'La contraseña es muy corta.'
      );
      return;
    }

    try {
      setLoading(true);

      let payloadUser: any = null;

      if (API?.auth?.login) {
        // ✅ Flujo con backend real (ajusta método/body según tu API)
        const res = await fetch(API.auth.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password: pass.trim() }),
        });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);

        let json: any;
        try { json = JSON.parse(txt); } catch { json = {}; }

        // Intenta leer el usuario desde varias claves comunes
        payloadUser =
          json?.usuario ??
          json?.user ??
          json?.data ??
          json ??
          null;
      } else {
        // 🟡 Fallback local si no hay API.auth.login
        const mock = await mockLogin();
        if (!mock.ok) throw new Error('Credenciales inválidas');
        payloadUser = mock.usuario;
      }

      // Extrae nombre + email de la respuesta o del fallback
      const fullName =
        normalizarNombre(payloadUser) ||
        (payloadUser?.nombre
          ? `${payloadUser?.nombre ?? ''} ${payloadUser?.apellido ?? ''}`.trim()
          : null) ||
        (email.includes('@') ? email.split('@')[0] : 'Usuario');

      const correo =
        payloadUser?.correo ??
        payloadUser?.email ??
        email.trim();

      const id =
        payloadUser?.id ??
        payloadUser?.codUsuario ??
        payloadUser?.cod_usuario ??
        null;

      const rol =
        payloadUser?.rol ??
        payloadUser?.role ??
        payloadUser?.codRol ??
        payloadUser?.cod_rol ??
        null;

      // Guarda en SecureStore (lo que usa HomeScreen para saludar)
      await SecureStore.setItemAsync('user_name', String(fullName));
      await SecureStore.setItemAsync('user_email', String(correo));
      if (id != null) await SecureStore.setItemAsync('user_id', String(id));
      if (rol != null) await SecureStore.setItemAsync('user_role', String(rol));

      navigation.replace('OperarioTabs');
    } catch (e: any) {
      const msg = String(e?.message || '');
      Alert.alert('Login fallido', msg || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Login</Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor="#9aa4ad"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={s.input}
        placeholder="Contraseña"
        placeholderTextColor="#9aa4ad"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
      />

      <TouchableOpacity
        style={[s.btn, (!emailOk || !passOk || loading) && { opacity: 0.6 }]}
        disabled={!emailOk || !passOk || loading}
        onPress={onSubmit}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={s.btnText}>Iniciar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.white,
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.navy },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    color: '#111827',
  },
  btn: {
    backgroundColor: colors.blue,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnText: { color: colors.white, fontWeight: '800' },
});
