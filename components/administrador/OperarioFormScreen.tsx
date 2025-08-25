// app/(admin)/(tabs)/operarios/crear.tsx  ← o donde tengas la ruta
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FadeWrapper from '../FadeWrapper';           // ajusta rutas
import { colors } from '../../styles/globalStyles1';              // ajusta rutas
import { API } from '../../config/api';                           // ajusta rutas

type Mode = 'create' | 'edit';

type UsuarioResponse = {
  codUsuario?: number;        cod_usuario?: number;
  codRol?: number;            cod_rol?: number;
  nombreUsuario?: string;     nombre_usuario?: string;
  apellidoUsuario?: string;   apellido_usuario?: string;
  nicknameUsuario?: string | null; nickname_usuario?: string | null;
  correoUsuario?: string;     correo_usuario?: string;
  contrasenaUsuario?: string; contrasena_usuario?: string;
  cedulaUsuario?: string;     cedula_usuario?: string;
  cod_cargo_usuario?: number | null;
};

const ROLES = [
  { label: 'Administrador', value: 1 },
  { label: 'Operario', value: 2 },
] as const;

export default function OperarioFormScreen() {
  const router = useRouter();
  const { mode: modeParam, id } = useLocalSearchParams<{ mode?: string; id?: string }>();

  const mode: Mode = (modeParam === 'edit' ? 'edit' : 'create');
  const editingId = id ? Number(id) : undefined;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nickname, setNickname] = useState<string>('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cedula, setCedula] = useState('');
  const [codRol, setCodRol] = useState<number>(ROLES[1].value); // Operario
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && editingId) {
      (async () => {
        try {
          setLoading(true);
          const r = await fetch(API.usuario.obtener(editingId));
          const txt = await r.text();
          if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
          const u: UsuarioResponse = JSON.parse(txt);

          setNombre(u.nombreUsuario ?? u.nombre_usuario ?? '');
          setApellido(u.apellidoUsuario ?? u.apellido_usuario ?? '');
          setNickname((u.nicknameUsuario ?? u.nickname_usuario ?? '') || '');
          setCorreo(u.correoUsuario ?? u.correo_usuario ?? '');
          setCedula(u.cedulaUsuario ?? u.cedula_usuario ?? '');
          setCodRol(u.codRol ?? u.cod_rol ?? ROLES[1].value);
          setContrasena('');
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'No se pudo cargar el usuario');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [mode, editingId]);

  const validar = () => {
    if (mode === 'create' && !codRol) { Alert.alert('Falta rol', 'Selecciona un rol'); return false; }
    if (!nombre.trim() || !apellido.trim() || !correo.trim() || !cedula.trim()) {
      Alert.alert('Datos incompletos', 'Completa nombre, apellido, correo y cédula.'); return false;
    }
    if (mode === 'create' && !contrasena.trim()) {
      Alert.alert('Contraseña requerida', 'Ingresa una contraseña para crear el usuario.'); return false;
    }
    if (!/\S+@\S+\.\S+/.test(correo)) { Alert.alert('Correo inválido', 'Verifica el formato del correo.'); return false; }
    if (cedula.length > 45) { Alert.alert('Cédula muy larga', 'Máximo 45 caracteres.'); return false; }
    return true;
  };

  const onSubmit = async () => {
    if (!validar()) return;
    const isCreate = mode === 'create';

    const body = isCreate
      ? {
          cod_rol: codRol,
          nombre_usuario: nombre.trim(),
          apellido_usuario: apellido.trim(),
          nickname_usuario: nickname.trim() ? nickname.trim() : null,
          correo_usuario: correo.trim(),
          contrasena_usuario: contrasena.trim(),
          cedula_usuario: cedula.trim(),
        }
      : {
          cod_usuario: Number(editingId),
          nombre_usuario: nombre.trim(),
          apellido_usuario: apellido.trim(),
          nickname_usuario: nickname.trim() ? nickname.trim() : null,
          correo_usuario: correo.trim(),
          cedula_usuario: cedula.trim(),
          ...(contrasena.trim() ? { contrasena_usuario: contrasena.trim() } : {}),
        };

    try {
      setLoading(true);
      const url = isCreate ? API.usuario.crear : API.usuario.modificar;
      const method = isCreate ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);

      Alert.alert('Éxito', isCreate ? 'Usuario creado' : 'Usuario actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('Correo ya registrado') || msg.includes('duplicate') || msg.includes('1062')) {
        Alert.alert('Duplicado', 'El correo ya está registrado.');
      } else if (msg.includes('Rol/Cargo inválido') || msg.includes('1452')) {
        Alert.alert('Dato inválido', 'El rol o cargo no existe (violación de FK).');
      } else if (msg.includes('cod_rol') || msg.toLowerCase().includes('rol')) {
        Alert.alert('Rol requerido', 'Selecciona un rol válido.');
      } else {
        Alert.alert('Error', msg || 'No se pudo guardar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
            <Text style={s.h1}>{mode === 'create' ? 'Crear usuario' : 'Editar usuario'}</Text>

            <Text style={s.label}>Rol</Text>
            <View style={s.chipsRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => mode === 'create' && setCodRol(r.value)}
                  style={[s.chip, codRol === r.value && s.chipActive, mode !== 'create' && { opacity: 0.6 }]}
                  disabled={mode !== 'create'}
                >
                  <Text style={[s.chipTxt, codRol === r.value && s.chipTxtActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Nombres</Text>
            <TextInput style={s.input} value={nombre} onChangeText={setNombre} />

            <Text style={s.label}>Apellidos</Text>
            <TextInput style={s.input} value={apellido} onChangeText={setApellido} />

            <Text style={s.label}>Nickname (opcional)</Text>
            <TextInput style={s.input} value={nickname} onChangeText={setNickname} />

            <Text style={s.label}>Correo</Text>
            <TextInput style={s.input} keyboardType="email-address" autoCapitalize="none" value={correo} onChangeText={setCorreo} />

            <Text style={s.label}>Contraseña {mode === 'edit' ? '(deja vacío si no cambias)' : ''}</Text>
            <TextInput style={s.input} secureTextEntry value={contrasena} onChangeText={setContrasena} />

            <Text style={s.label}>Cédula</Text>
            <TextInput style={s.input} value={cedula} onChangeText={setCedula} />

            <TouchableOpacity disabled={loading} onPress={onSubmit} style={[s.btn, loading && { opacity: 0.7 }]}>
              {loading ? <ActivityIndicator /> : <Text style={s.btnTxt}>{mode === 'create' ? 'Crear' : 'Guardar'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 12 },
  label: { marginTop: 10, fontWeight: '700', color: '#111' },
  input: {
    height: 36, borderBottomWidth: 1, borderBottomColor: '#999', paddingHorizontal: 8, color: '#1F2937',
  },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: { paddingHorizontal: 10, height: 32, borderRadius: 8, backgroundColor: '#E0E0E0', justifyContent: 'center' },
  chipActive: { backgroundColor: '#BDBDBD' },
  chipTxt: { color: '#1F2937' },
  chipTxtActive: { fontWeight: '700' },
  btn: { marginTop: 18, backgroundColor: '#BDBDBD', height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: colors.navy, fontWeight: '800' },
});
