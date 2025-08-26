// app/(admin)/(tabs)/operarios/OperarioFormScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FadeWrapper from '../../../../components/FadeWrapper';
import { colors } from '../../../../styles/globalStyles1';
import { API } from '../../../../config/api';
import { useAuth } from '../../../../auth/AuthContext'; // ⬅️ usa AuthContext (tokens, user, fetchJson)

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
  const mode: Mode = modeParam === 'edit' ? 'edit' : 'create';
  const editingId = id ? Number(id) : undefined;

  // ⬇️ Seguridad
  const { user, loading: authLoading, fetchJson } = useAuth();
  const isAdmin = user?.rol === 'admin';

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nickname, setNickname] = useState<string>('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cedula, setCedula] = useState('');
  const [codRol, setCodRol] = useState<number>(ROLES[1].value);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (mode === 'create' ? 'Crear usuario' : 'Editar usuario'), [mode]);

  // Bloquea pantalla mientras carga auth
  if (authLoading) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Verificando sesión…</Text>
        </SafeAreaView>
      </FadeWrapper>
    );
  }

  // 403 para no admins (la ruta está bajo (admin), pero reforzamos)
  if (!isAdmin) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginBottom: 8 }}>403 · Sin permisos</Text>
          <Text style={{ textAlign: 'center', color: '#333' }}>
            Esta acción requiere rol administrador.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[ui.primaryBtn, { marginTop: 18 }]}
            activeOpacity={0.9}
          >
            <Text style={ui.primaryTxt}>Volver</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </FadeWrapper>
    );
  }

  // Cargar datos si es edición (con token vía fetchJson)
  useEffect(() => {
    if (mode !== 'edit' || !editingId) return;

    (async () => {
      try {
        setLoading(true);
        const u = await fetchJson<UsuarioResponse>(API.usuario.obtener(editingId));
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
  }, [mode, editingId, fetchJson]);

  // Validaciones
  const validar = () => {
    if (mode === 'create' && !codRol) {
      Alert.alert('Falta rol', 'Selecciona un rol');
      return false;
    }
    if (!nombre.trim() || !apellido.trim() || !correo.trim() || !cedula.trim()) {
      Alert.alert('Datos incompletos', 'Completa nombre, apellido, correo y cédula.');
      return false;
    }
    if (mode === 'create' && !contrasena.trim()) {
      Alert.alert('Contraseña requerida', 'Ingresa una contraseña para crear el usuario.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(correo)) {
      Alert.alert('Correo inválido', 'Verifica el formato del correo.');
      return false;
    }
    if (cedula.length > 45) {
      Alert.alert('Cédula muy larga', 'Máximo 45 caracteres.');
      return false;
    }
    return true;
  };

  // Guardar (usa fetchJson para incluir Authorization y manejar 401/403/refresh)
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

      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      Alert.alert('Éxito', isCreate ? 'Usuario creado' : 'Usuario actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      } else if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
        Alert.alert('Sin permisos', 'No tienes permisos para esta operación.');
      } else if (msg.includes('Correo ya registrado') || msg.includes('duplicate') || msg.includes('1062')) {
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F7FB' }}>
        {/* Header simple */}
        <View style={ui.header}>
          <TouchableOpacity onPress={() => router.back()} style={ui.backBtn} activeOpacity={0.8}>
            <Text style={ui.backTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={ui.headerTitle}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={ui.card}>
              {/* Rol */}
              <Text style={ui.label}>Rol</Text>
              <View style={ui.chipsRow}>
                {ROLES.map(r => {
                  const active = codRol === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => mode === 'create' && setCodRol(r.value)}
                      style={[
                        ui.chip,
                        active && { backgroundColor: colors.blue, borderColor: colors.blue },
                        mode !== 'create' && { opacity: 0.6 },
                      ]}
                      disabled={mode !== 'create'}
                      activeOpacity={0.85}
                    >
                      <Text style={[ui.chipTxt, active && { color: colors.white }]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Nombres / Apellidos */}
              <Text style={ui.label}>Nombres</Text>
              <TextInput style={ui.input} value={nombre} onChangeText={setNombre} />

              <Text style={ui.label}>Apellidos</Text>
              <TextInput style={ui.input} value={apellido} onChangeText={setApellido} />

              {/* Nickname */}
              <Text style={ui.label}>Nickname (opcional)</Text>
              <TextInput style={ui.input} value={nickname} onChangeText={setNickname} />

              {/* Correo */}
              <Text style={ui.label}>Correo</Text>
              <TextInput
                style={ui.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={correo}
                onChangeText={setCorreo}
              />

              {/* Contraseña */}
              <Text style={ui.label}>
                Contraseña {mode === 'edit' ? '(deja vacío si no cambias)' : ''}
              </Text>
              <TextInput style={ui.input} secureTextEntry value={contrasena} onChangeText={setContrasena} />

              {/* Cédula */}
              <Text style={ui.label}>Cédula</Text>
              <TextInput style={ui.input} value={cedula} onChangeText={setCedula} />

              {/* Botón */}
              <TouchableOpacity
                disabled={loading}
                onPress={onSubmit}
                style={[ui.primaryBtn, loading && { opacity: 0.7 }]}
                activeOpacity={0.9}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={ui.primaryTxt}>{mode === 'create' ? 'Crear' : 'Guardar'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Estilos UI ---------- */
const ui = StyleSheet.create({
  header: {
    paddingTop: 10, paddingHorizontal: 12, paddingBottom: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8ECF3',
  },
  backTxt: { fontSize: 20, fontWeight: '800', color: colors.navy },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.navy },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E6E9ED',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },

  label: { marginTop: 10, fontWeight: '700', color: '#111' },
  input: {
    height: 44, borderWidth: 1, borderColor: '#D2D8DE', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#F8FAFC', color: '#1F2937',
  },

  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12, height: 34, borderRadius: 999, borderWidth: 1,
    backgroundColor: '#EEF2F7', justifyContent: 'center',
  },
  chipTxt: { color: '#1F2937', fontWeight: '700' },

  primaryBtn: {
    marginTop: 18, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.blue,
  },
  primaryTxt: { color: '#fff', fontWeight: '800' },
});
