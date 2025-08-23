// screens/OperarioFormScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/StackNavigator';
import FadeWrapper from '../components/FadeWrapper';
import { colors } from '../styles/globalStyles1';
import { API } from '../config/api';

type Mode = 'create' | 'edit';

type UsuarioResponse = {
  codUsuario: number;
  nombreUsuario?: string;
  apellidoUsuario?: string;
  nicknameUsuario?: string;
  correoUsuario?: string;
  contrasenaUsuario?: string;
  cedulaUsuario?: string;
  cargoUsuario?: 'Operario' | 'Mantenimiento' | 'Supervisor';
  // soporta back con snake_case por si acaso:
  nombre_usuario?: string;
  apellido_usuario?: string;
  nickname_usuario?: string;
  correo_usuario?: string;
  contrasena_usuario?: string;
  cedula_usuario?: string;
  cargo_usuario?: string;
};

type UsuarioPayload = {
  nombreUsuario: string;
  apellidoUsuario: string;
  nicknameUsuario: string;
  correoUsuario: string;
  // contrasenaUsuario: string; // se añade condicionalmente
  cedulaUsuario: string;
  cargoUsuario: 'Operario' | 'Mantenimiento' | 'Supervisor';
  codRol?: number; // ajusta si tu API lo requiere
};

const toApiCargo = (
  ui: 'Operativo' | 'Mantenimiento' | 'Supervisión',
): UsuarioPayload['cargoUsuario'] =>
  ui === 'Mantenimiento' ? 'Mantenimiento' : ui === 'Supervisión' ? 'Supervisor' : 'Operario';

const toUiCargo = (api?: string): 'Operativo' | 'Mantenimiento' | 'Supervisión' => {
  const v = (api ?? '').toLowerCase();
  if (v.startsWith('mante')) return 'Mantenimiento';
  if (v.startsWith('super')) return 'Supervisión';
  return 'Operativo';
};

export default function OperarioFormScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'OperarioForm'>>();
  const mode: Mode = params?.mode ?? 'create';
  const editingId = params?.id;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [nickname, setNickname] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cedula, setCedula] = useState('');
  const [cargo, setCargo] = useState<'Operativo' | 'Mantenimiento' | 'Supervisión'>('Operativo');
  const [loading, setLoading] = useState(false);

  // Cargar datos si estamos en edición
  useEffect(() => {
    if (mode === 'edit' && editingId) {
      (async () => {
        try {
          setLoading(true);
          const r = await fetch(API.usuario.obtener(editingId));
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const u: UsuarioResponse = await r.json();
          setNombre(u.nombreUsuario ?? u.nombre_usuario ?? '');
          setApellido(u.apellidoUsuario ?? u.apellido_usuario ?? '');
          setNickname(u.nicknameUsuario ?? u.nickname_usuario ?? '');
          setCorreo(u.correoUsuario ?? u.correo_usuario ?? '');
          setCedula(u.cedulaUsuario ?? u.cedula_usuario ?? '');
          setCargo(toUiCargo(u.cargoUsuario ?? u.cargo_usuario));
          setContrasena(''); // por seguridad no se precarga
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'No se pudo cargar el usuario');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [mode, editingId]);

  // Validaciones
  const validar = () => {
    if (!nombre.trim() || !apellido.trim() || !nickname.trim() || !correo.trim() || !cedula.trim()) {
      Alert.alert('Datos incompletos', 'Completa nombre, apellido, nickname, correo y cédula.');
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
    if (!/^\d{6,}$/.test(cedula)) {
      Alert.alert('Cédula inválida', 'La cédula deben ser solo números (mínimo 6).');
      return false;
    }
    if (nickname.trim().length < 3) {
      Alert.alert('Nickname muy corto', 'El nickname debe tener al menos 3 caracteres.');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validar()) return;

    const payload: UsuarioPayload = {
      nombreUsuario: nombre.trim(),
      apellidoUsuario: apellido.trim(),
      nicknameUsuario: nickname.trim(),
      correoUsuario: correo.trim(),
      cedulaUsuario: cedula.trim(),
      cargoUsuario: toApiCargo(cargo),
      // codRol: 2, // si aplica
    };

    // Agrega contraseña solo si corresponde
    const body: Record<string, any> = { ...payload };
    if (mode === 'create' || contrasena.trim().length > 0) {
      body.contrasenaUsuario = contrasena;
    }

    try {
      setLoading(true);
      const url = mode === 'create' ? API.usuario.crear : API.usuario.actualizar(editingId!);
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      Alert.alert('Éxito', mode === 'create' ? 'Usuario creado con éxito' : 'Usuario editado con éxito', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={s.container}>
            <Text style={s.h1}>{mode === 'create' ? 'Crear operario' : 'Editar operario'}</Text>

            <Text style={s.label}>Nombres</Text>
            <TextInput style={s.input} value={nombre} onChangeText={setNombre} />

            <Text style={s.label}>Apellidos</Text>
            <TextInput style={s.input} value={apellido} onChangeText={setApellido} />

            <Text style={s.label}>Nickname</Text>
            <TextInput
              style={s.input}
              autoCapitalize="none"
              value={nickname}
              onChangeText={setNickname}
            />

            <Text style={s.label}>Correo</Text>
            <TextInput
              style={s.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={correo}
              onChangeText={setCorreo}
            />

            <Text style={s.label}>Contraseña {mode === 'edit' ? '(opcional si no cambias)' : ''}</Text>
            <TextInput
              style={s.input}
              secureTextEntry
              value={contrasena}
              onChangeText={setContrasena}
            />

            <Text style={s.label}>Cédula</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              value={cedula}
              onChangeText={(t) => setCedula(t.replace(/[^\d]/g, ''))}
            />

            <Text style={s.label}>Cargo</Text>
            <View style={s.chipsRow}>
              {(['Operativo', 'Mantenimiento', 'Supervisión'] as const).map((op) => (
                <TouchableOpacity
                  key={op}
                  onPress={() => setCargo(op)}
                  style={[s.chip, cargo === op && s.chipActive]}
                >
                  <Text style={[s.chipTxt, cargo === op && s.chipTxtActive]}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity disabled={loading} onPress={onSubmit} style={[s.btn, loading && { opacity: 0.7 }]}>
              {loading ? <ActivityIndicator /> : <Text style={s.btnTxt}>{mode === 'create' ? 'Crear' : 'Editar'}</Text>}
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
    height: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    paddingHorizontal: 8,
    color: '#1F2937',
  },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#BDBDBD' },
  chipTxt: { color: '#1F2937' },
  chipTxtActive: { fontWeight: '700' },
  btn: {
    marginTop: 18,
    backgroundColor: '#BDBDBD',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { color: colors.navy, fontWeight: '800' },
});
