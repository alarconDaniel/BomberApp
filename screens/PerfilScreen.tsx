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
} from 'react-native';
import { colors } from '../styles/globalStyles1';

type Props = { navigation?: { goBack?: () => void } };

export default function PerfilScreen({ navigation }: Props) {
  const [nombres, setNombres] = useState('Carlos Andrés');
  const [apellidos, setApellidos] = useState('Ramirez Gómez');
  const [correo, setCorreo] = useState('AndresR@gruas.com');
  const [password, setPassword] = useState('12345678');

  const passRef = useRef<TextInput>(null);

  const dots = useMemo(() => {
    // mostramos hasta 10 puntos para el wireframe
    const max = 10;
    const active = Math.min(password.length, max);
    const arr = Array.from({ length: max }, (_, i) => i < active);
    return arr;
  }, [password.length]);

  const onSave = () => {
    // aquí conectarías a tu API / estado
    console.log({ nombres, apellidos, correo, password });
    navigation?.goBack?.();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        {/* Top bar */}
        <View style={styles.topbar}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} hitSlop={12}>
            <Text style={styles.back}>{'\u2039'} Volver</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSave} hitSlop={12}>
            <Text style={styles.save}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>

          {/* Nombres */}
          <Text style={styles.label}>Nombres</Text>
          <TextInput
            value={nombres}
            onChangeText={setNombres}
            style={styles.underlineInput}
            placeholder="Nombres"
            placeholderTextColor="#C8CBD0"
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Apellidos */}
          <Text style={[styles.label, styles.mt16]}>Apellidos</Text>
          <TextInput
            value={apellidos}
            onChangeText={setApellidos}
            style={styles.underlineInput}
            placeholder="Apellidos"
            placeholderTextColor="#C8CBD0"
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Correo */}
          <Text style={[styles.label, styles.mt16]}>Correo</Text>
          <TextInput
            value={correo}
            onChangeText={setCorreo}
            style={styles.underlineInput}
            placeholder="correo@empresa.com"
            placeholderTextColor="#C8CBD0"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* Contraseña */}
          <Text style={[styles.label, styles.mt16]}>Contraseña</Text>
          <TextInput
            ref={passRef}
            value={password}
            onChangeText={setPassword}
            style={styles.hiddenPassword} // el input real
            secureTextEntry
          />
          {/* Indicador de puntos grandes (estético del mock) */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => passRef.current?.focus()}
            style={styles.dotsRow}
          >
            {dots.map((active, i) => (
              <View
                key={i}
                style={[styles.dot, active ? styles.dotOn : styles.dotOff]}
              />
            ))}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- estilos ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#9FA1A3' }, // gris del mock
  topbar: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: '#1e1e1e', fontSize: 16 },
  save: { color: '#1e1e1e', fontSize: 16, fontWeight: '700' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  mt16: { marginTop: 16 },

  underlineInput: {
    color: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#D2D4D6',
  },

  hiddenPassword: {
    height: 0, // ocultamos el input, sólo sirve para enfocar/editar
    padding: 0,
    margin: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotOn: { backgroundColor: colors.white },
  dotOff: { backgroundColor: '#CFCFCF' },
});
