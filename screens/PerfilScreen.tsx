// screens/PerfilScreen.tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { makeGlobalStyles } from '../styles/globalStyles';

type Props = { navigation?: { goBack?: () => void } };

export default function PerfilScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const g = makeGlobalStyles(colors);
  const s = getStyles(colors);

  // Valores iniciales (podrías hidratar desde tu API)
  const [nombres, setNombres] = useState('Carlos Andrés');
  const [apellidos, setApellidos] = useState('Ramirez Gómez');
  const [correo, setCorreo] = useState('AndresR@gruas.com');
  const [password, setPassword] = useState('12345678');

  const init = useRef({ nombres, apellidos, correo, password }).current;

  const passRef = useRef<TextInput>(null);

  // Avatar con iniciales
  const initials = useMemo(() => {
    const n = `${nombres} ${apellidos}`.trim();
    return n
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [nombres, apellidos]);

  // Puntos grandes de password (wireframe aesthetic)
  const dots = useMemo(() => {
    const max = 10;
    const active = Math.min(password.length, max);
    return Array.from({ length: max }, (_, i) => i < active);
  }, [password.length]);

  // Validación simple
  const emailOk = /\S+@\S+\.\S+/.test(correo.trim());
  const nameOk = nombres.trim().length > 0 && apellidos.trim().length > 0;
  const passOk = password.trim().length >= 6; // ajusta la política que quieras
  const formOk = emailOk && nameOk && passOk;

  const dirty =
    nombres !== init.nombres ||
    apellidos !== init.apellidos ||
    correo !== init.correo ||
    password !== init.password;

  const onSave = () => {
    if (!formOk) {
      Alert.alert(
        'Revisa los datos',
        !nameOk
          ? 'Completa nombres y apellidos.'
          : !emailOk
          ? 'El correo no parece válido.'
          : 'La contraseña debe tener al menos 6 caracteres.'
      );
      return;
    }
    // Aquí conectarías a tu API / estado
    console.log({ nombres, apellidos, correo, password });
    Alert.alert('Guardado', 'Perfil actualizado correctamente.', [
      { text: 'OK', onPress: () => navigation?.goBack?.() },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Top bar */}
        <View style={s.topbar}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={12}>
            <Text style={[g.text.bodyStrong, s.topAction]}>{'\u2039'} Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            hitSlop={12}
            disabled={!dirty || !formOk}
            style={[s.saveBtn, (!dirty || !formOk) && { opacity: 0.5 }]}
          >
            <Text style={[g.text.bodyStrong, { color: colors.primary }]}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.content}>
          {/* Header con avatar */}
          <View style={s.headerRow}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initials || 'US'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[g.text.title]}>Tu perfil</Text>
              <Text style={[g.text.caption]}>Administra tus datos personales</Text>
            </View>
          </View>

          {/* Nombres */}
          <Text style={[g.text.smallStrong, s.label]}>Nombres</Text>
          <TextInput
            value={nombres}
            onChangeText={setNombres}
            style={s.input}
            placeholder="Nombres"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Apellidos */}
          <Text style={[g.text.smallStrong, s.label]}>Apellidos</Text>
          <TextInput
            value={apellidos}
            onChangeText={setApellidos}
            style={s.input}
            placeholder="Apellidos"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Correo */}
          <Text style={[g.text.smallStrong, s.label]}>Correo</Text>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            style={[s.input, !emailOk && s.inputError]}
            placeholder="correo@empresa.com"
            placeholderTextColor={colors.mutedText}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          {!emailOk && <Text style={[g.text.caption, g.text.danger]}>Correo inválido</Text>}

          {/* Contraseña */}
          <Text style={[g.text.smallStrong, s.label]}>Contraseña</Text>
          {/* Input real, oculto visualmente (usamos la fila de puntos grande) */}
          <TextInput
            ref={passRef}
            value={password}
            onChangeText={setPassword}
            style={s.hiddenPassword}
            secureTextEntry
          />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => passRef.current?.focus()}
            style={[
              s.dotsRow,
              !passOk && { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
            ]}
          >
            {dots.map((active, i) => (
              <View
                key={i}
                style={[s.dot, active ? { backgroundColor: colors.text } : { backgroundColor: colors.mutedBg }]}
              />
            ))}
          </TouchableOpacity>
          {!passOk && (
            <Text style={[g.text.caption, g.text.danger]}>
              Mínimo 6 caracteres.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- estilos con Theme ---------------- */

function getStyles(c: import('../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    topbar: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.bgHeader,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    topAction: { color: c.text },
    saveBtn: {
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },

    content: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 8,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.imageBg,
      borderWidth: 1,
      borderColor: c.outline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: { fontSize: 20, fontWeight: '800', color: c.text },

    label: { marginTop: 14, color: c.secondaryText },

    input: {
      color: c.text,
      paddingVertical: 10,
      paddingHorizontal: 0,
      borderBottomWidth: 1.5,
      borderBottomColor: c.inputBorder,
    },
    inputError: { borderBottomColor: c.danger },

    hiddenPassword: {
      height: 0,
      padding: 0,
      margin: 0,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 10,
      paddingBottom: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.mutedBg,
      paddingHorizontal: 10,
      marginTop: 6,
    },
    dot: { width: 14, height: 14, borderRadius: 7 },
  });
}
