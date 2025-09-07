// app/(modals)/admin/editar-perfil-admin.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../../../auth/AuthContext';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useMarkModalOnClose } from '../../../navigation/useMarkModalOnClose';
import { markModalClosed } from '../../../navigation/ModalTracker';

import type { PerfilResumen } from '../../../models/PerfilResumen';

// --- Hook: altura del teclado ---
function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates?.height ?? 0));
    const s2 = Keyboard.addListener(hideEvt, () => setH(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);
  return h;
}

// --- Util: sanitizar string ---
function nz(s?: string | null) {
  return (s ?? '').trim();
}

export default function EditarPerfilAdminModal() {
  useMarkModalOnClose();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();

  const { colors, isDark } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  const { fetchJson } = useAuth();

  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<PerfilResumen | null>(null);

  // Campos editables
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [cedula, setCedula] = useState('');
  const [nickname, setNickname] = useState('');

  // Contraseña
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [savingAll, setSavingAll] = useState(false);
  const [savingNick, setSavingNick] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const s = useMemo(
      () =>
          StyleSheet.create({
            safe: { flex: 1, backgroundColor: isDark ? colors.bg : "#f8fafc" },
            headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
            backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
            content: { flexGrow: 1, paddingHorizontal: 24 },
            title: { textAlign: 'center', marginTop: 8 },
            label: { marginTop: 14 },
            input: {
              marginTop: 8,
              borderWidth: 1,
              borderColor: isDark ? colors.inputBorder : 'rgba(0,0,0,0.15)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: isDark ? colors.card : '#fff',
              color: colors.text,
            },
            card: {
              marginTop: 16,
              backgroundColor: isDark ? colors.card : "#ffffff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: isDark ? colors.divider : "rgba(15,23,42,0.08)",
              width: '100%' as any,
            },
            help: { fontSize: 12, marginTop: 4 },
            primaryBtn: {
              marginTop: 16, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: isDark ? colors.primary : "#7c3aed",
            },
            primaryTxt: { color: '#fff', fontWeight: '800' },
            secondaryBtn: {
              marginTop: 12, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: isDark ? colors.mutedBg : "#e5e7eb",
            },
            secondaryTxt: { fontWeight: '800', color: isDark ? colors.primary : '#7c3aed' },
            ro: { opacity: 0.9, color: colors.text }
          }),
      [colors, isDark]
  );

  const cargar = async () => {
    try {
      setLoading(true);
      const r = await fetchJson<PerfilResumen>('/mi-perfil/resumen');
      setPerfil(r);
      const u: any = r?.usuario ?? {};
      setNombre(nz(u?.nombre) || '');
      setApellido(nz(u?.apellido) || '');
      setCorreo(nz(u?.email ?? u?.correo) || '');
      setCedula(
          nz(
              u?.cedula ?? u?.cédula ?? u?.cedulaUsuario ?? u?.dni ?? u?.documento ?? u?.numeroDocumento
          ) || ''
      );
      setNickname(nz(u?.nickname) || '');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const validarDatos = () => {
    if (!nz(nombre) || !nz(apellido) || !nz(correo) || !nz(cedula)) {
      Alert.alert('Datos incompletos', 'Completa nombre, apellido, correo y cédula.');
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

  // 👉 NUEVO: guardar propios datos vía /mi-perfil/datos
  const guardarDatos = async () => {
    if (!validarDatos()) return;
    try {
      setSavingAll(true);
      await fetchJson('/mi-perfil/datos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreUsuario: nz(nombre),
          apellidoUsuario: nz(apellido),
          correoUsuario: nz(correo).toLowerCase(),
          cedulaUsuario: nz(cedula),
          nicknameUsuario: nz(nickname) ? nz(nickname) : null,
        }),
      });
      Alert.alert('Éxito', 'Tu perfil fue actualizado.', [
        { text: 'OK', onPress: () => { markModalClosed(); router.back(); } },
      ]);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      } else if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
        Alert.alert('Sin permisos', 'No tienes permisos para esta operación.');
      } else if (msg.includes('Correo ya registrado') || msg.includes('duplicate') || msg.includes('1062')) {
        Alert.alert('Duplicado', 'El correo ya está registrado.');
      } else {
        Alert.alert('Error', msg || 'No se pudo guardar');
      }
    } finally {
      setSavingAll(false);
    }
  };

  const guardarNickname = async () => {
    if (!nz(nickname) || nz(nickname).length < 3) {
      Alert.alert('Ups', 'El nickname debe tener al menos 3 caracteres.');
      return;
    }
    try {
      setSavingNick(true);
      await fetchJson('/mi-perfil/nickname', {
        method: 'PATCH',
        body: JSON.stringify({ nickname: nz(nickname) }),
      });
      Alert.alert('Listo', 'Tu nickname fue actualizado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar el nickname');
    } finally {
      setSavingNick(false);
    }
  };

  const cambiarPassword = async () => {
    if (!nz(currentPw) || !nz(newPw)) {
      Alert.alert('Ups', 'Completa ambos campos de contraseña.');
      return;
    }
    if (nz(newPw).length < 8) {
      Alert.alert('Ups', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      setSavingPw(true);
      await fetchJson('/mi-perfil/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: nz(currentPw), newPassword: nz(newPw) }),
      });
      Alert.alert('Hecho', 'Contraseña cambiada. Puede que debas iniciar sesión de nuevo.');
      setCurrentPw(''); setNewPw('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPw(false);
    }
  };

  return (
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.headerRow}>
          <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
            <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
            <Text style={[g.text.body]}>Volver</Text>
          </Pressable>
        </View>

        {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[g.text.caption, { marginTop: 10 }]}>Cargando…</Text>
            </View>
        ) : (
            <KeyboardAvoidingView
                behavior={Platform.select({ ios: 'padding', android: undefined })}
                style={{ flex: 1 }}
            >
              <ScrollView
                  contentContainerStyle={[
                    s.content,
                    { paddingBottom: insets.bottom + (kbHeight > 0 ? kbHeight + 24 : 32) },
                  ]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  bounces={false}
                  overScrollMode="never"
              >
                <Text style={[g.text.h2, s.title]}>Editar perfil (Admin)</Text>

                {/* Datos personales */}
                <View style={s.card}>
                  <Text style={[g.text.bodyStrong, s.label]}>Nombres</Text>
                  <TextInput
                      style={s.input}
                      value={nombre}
                      onChangeText={setNombre}
                      placeholder="Juan Carlos"
                      placeholderTextColor={colors.mutedText}
                      autoCapitalize="words"
                      returnKeyType="next"
                  />

                  <Text style={[g.text.bodyStrong, s.label]}>Apellidos</Text>
                  <TextInput
                      style={s.input}
                      value={apellido}
                      onChangeText={setApellido}
                      placeholder="Pérez García"
                      placeholderTextColor={colors.mutedText}
                      autoCapitalize="words"
                      returnKeyType="next"
                  />

                  <Text style={[g.text.bodyStrong, s.label]}>Correo</Text>
                  <TextInput
                      style={s.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      value={correo}
                      onChangeText={setCorreo}
                      placeholder="nombre@empresa.com"
                      placeholderTextColor={colors.mutedText}
                      returnKeyType="next"
                  />

                  <Text style={[g.text.bodyStrong, s.label]}>Cédula</Text>
                  <TextInput
                      style={s.input}
                      value={cedula}
                      onChangeText={setCedula}
                      placeholder="12345678"
                      placeholderTextColor={colors.mutedText}
                      keyboardType="numeric"
                      returnKeyType="done"
                  />

                  <Pressable style={[s.primaryBtn, savingAll && { opacity: 0.8 }]} onPress={guardarDatos} disabled={savingAll}>
                    {savingAll ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>Guardar datos</Text>}
                  </Pressable>

                  <Text style={[g.text.caption, s.help, { color: isDark ? colors.mutedText : '#6b7280' }]}>
                    Aquí puedes modificar tus datos personales, no dejes campos clave vacíos. 🌀
                  </Text>
                </View>

                {/* Nickname */}
                <View style={s.card}>
                  <Text style={[g.text.bodyStrong, s.label]}>Nickname</Text>
                  <TextInput
                      style={s.input}
                      value={nickname}
                      onChangeText={setNickname}
                      placeholder="tu-nick"
                      placeholderTextColor={colors.mutedText}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={guardarNickname}
                  />
                  <Pressable style={s.secondaryBtn} onPress={guardarNickname} disabled={savingNick}>
                    {savingNick ? <ActivityIndicator color={isDark ? colors.text : undefined} /> : (
                        <Text style={s.secondaryTxt}>Guardar nickname</Text>
                    )}
                  </Pressable>
                </View>

                {/* Contraseña */}
                <View style={s.card}>
                  <Text style={[g.text.bodyStrong, s.label]}>Contraseña actual</Text>
                  <TextInput
                      style={s.input}
                      placeholder="••••••••"
                      placeholderTextColor={colors.mutedText}
                      secureTextEntry
                      value={currentPw}
                      onChangeText={setCurrentPw}
                      returnKeyType="next"
                  />

                  <Text style={[g.text.bodyStrong, s.label]}>Nueva contraseña</Text>
                  <TextInput
                      style={s.input}
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor={colors.mutedText}
                      secureTextEntry
                      value={newPw}
                      onChangeText={setNewPw}
                      returnKeyType="send"
                      onSubmitEditing={cambiarPassword}
                  />

                  <Pressable style={s.secondaryBtn} onPress={cambiarPassword} disabled={savingPw}>
                    {savingPw ? <ActivityIndicator color={isDark ? colors.text : undefined} /> : (
                        <Text style={s.secondaryTxt}>Cambiar contraseña</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
        )}
      </SafeAreaView>
  );
}
