// app/(modals)/editar-perfil.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../../auth/AuthContext';
import type { PerfilResumen } from '../../models/PerfilResumen';
import type { DimensionValue } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

import { markModalClosed } from '../../navigation/ModalTracker';
import { useMarkModalOnClose } from '../../navigation/useMarkModalOnClose';

// --- Hook para altura del teclado ---
function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates?.height ?? 0));
    const s2 = Keyboard.addListener(hideEvt, () => setH(0));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);
  return h;
}

export default function EditarPerfilModal() {
  useMarkModalOnClose();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const g = makeGlobalStyles(colors);
  const { fetchJson } = useAuth();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();

  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<PerfilResumen | null>(null);

  const [nickname, setNickname] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const [savingNick, setSavingNick] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const s = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: isDark ? colors.bg : '#f8fafc' },

        // Header fijo y alineado (no se monta debajo de la status bar)
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: colors.bg,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: colors.divider,
        },
        backBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 10,
        },
        backTxt: { fontSize: 16, color: colors.text, marginLeft: 6 },

        content: { flexGrow: 1, paddingHorizontal: 24 },
        title: { textAlign: 'center', marginTop: 8 },
        label: { marginTop: 16 },
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
          backgroundColor: isDark ? colors.card : '#ffffff',
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? colors.divider : 'rgba(15,23,42,0.08)',
          width: '100%' as DimensionValue,
        },
        help: { fontSize: 12, marginTop: 4 },
        primaryBtn: {
          marginTop: 16,
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: isDark ? colors.primary : '#7c3aed',
          borderRadius: 999,
          alignItems: 'center',
        },
        secondaryBtn: {
          marginTop: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
          backgroundColor: isDark ? colors.mutedBg : '#e5e7eb',
          borderRadius: 999,
          alignItems: 'center',
        },
        dangerTxt: { color: isDark ? colors.primary : '#7c3aed' },
        ro: { opacity: 0.9, color: colors.text },
      }),
    [colors, isDark, insets.top]
  );

  const cargar = async () => {
    try {
      setCargando(true);
      const r = await fetchJson<PerfilResumen>('/mi-perfil/resumen');
      setPerfil(r);
      setNickname(r.usuario.nickname || '');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cargar el perfil');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const guardarNickname = async () => {
    if (!nickname || nickname.trim().length < 3) {
      Alert.alert('Ups', 'El nickname debe tener al menos 3 caracteres.');
      return;
    }
    try {
      setSavingNick(true);
      await fetchJson('/mi-perfil/nickname', {
        method: 'PATCH',
        body: JSON.stringify({ nickname }),
      });
      Alert.alert('Listo', 'Tu nickname fue actualizado.');
      markModalClosed();
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo actualizar el nickname');
    } finally {
      setSavingNick(false);
    }
  };

  const cambiarPassword = async () => {
    if (!currentPw || !newPw) {
      Alert.alert('Ups', 'Completa ambos campos de contraseña.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Ups', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      setSavingPw(true);
      await fetchJson('/mi-perfil/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      Alert.alert('Hecho', 'Contraseña cambiada. Puede que debas iniciar sesión de nuevo.');
      markModalClosed();
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header fijo con botón volver alineado */}
      <View style={s.headerRow}>
        <Pressable
          onPress={() => {
            markModalClosed();
            router.back();
          }}
          style={({ pressed }) => [
            s.backBtn,
            { backgroundColor: pressed ? colors.mutedBg : 'transparent' },
          ]}
          hitSlop={10}
        >
          <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
          <Text style={s.backTxt}>Volver</Text>
        </Pressable>
      </View>

      {cargando ? (
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
            <Text style={[g.text.h2, s.title]}>Editar perfil</Text>

            {/* Solo lectura */}
            <View style={s.card}>
              <Text style={[g.text.bodyStrong, s.label]}>Nombre</Text>
              <TextInput
                editable={false}
                style={[s.input, s.ro]}
                value={`${perfil?.usuario.nombre ?? ''} ${perfil?.usuario.apellido ?? ''}`}
                placeholderTextColor={colors.mutedText}
              />

              <Text style={[g.text.bodyStrong, s.label]}>Correo</Text>
              <TextInput
                editable={false}
                style={[s.input, s.ro]}
                value={perfil?.usuario.email ?? ''}
                placeholderTextColor={colors.mutedText}
              />

              <Text style={[g.text.bodyStrong, s.label]}>Cédula</Text>
              <TextInput
                editable={false}
                style={[s.input, s.ro]}
                value={(perfil as any)?.usuario?.cedula ?? ''}
                placeholderTextColor={colors.mutedText}
              />

              <Text style={[g.text.caption, { color: isDark ? colors.mutedText : '#6b7280' }]}>
                Para cambiar datos personales comunícate con un administrador.
              </Text>
            </View>

            {/* Nickname */}
            <View style={s.card}>
              <Text style={[g.text.bodyStrong, s.label]}>Nickname</Text>
              <TextInput
                style={s.input}
                placeholder="Tu nickname"
                placeholderTextColor={colors.mutedText}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Pressable style={s.primaryBtn} onPress={guardarNickname} disabled={savingNick}>
                {savingNick ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[g.text.smallStrong, { color: '#fff' }]}>Guardar nickname</Text>
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
                {savingPw ? (
                  <ActivityIndicator color={isDark ? colors.text : undefined} />
                ) : (
                  <Text style={[g.text.smallStrong, s.dangerTxt]}>Cambiar contraseña</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
