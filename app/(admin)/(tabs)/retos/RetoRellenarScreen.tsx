// app/(admin)/(tabs)/retos/RetoRellenarScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../../theme/GlobalStyles';

export default function RetoRellenarScreen() {
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  // Params desde Expo Router
  const params = useLocalSearchParams<{
    respuesta?: string;    // palabra correcta
    pista?: string;        // hint opcional
    textoBase?: string;    // texto visible opcional
    // también aceptaremos "palabra" como fallback
    palabra?: string;
  }>();

  const normalizar = (v: string | undefined) => (v ?? '').trim().toLowerCase();

  const respuesta = normalizar(params.respuesta ?? params.palabra ?? '');
  const pista = params.pista?.trim();

  // Si no llega textoBase: construimos máscara con 1ª y última letra
  const mask = (w: string) =>
    w.length < 2 ? w : `${w[0]} ${'_'.repeat(Math.max(0, w.length - 2))} ${w[w.length - 1]}`;

  const textoVisible = params.textoBase?.trim() ?? mask(respuesta);

  const [input, setInput] = useState('');
  const ok = useMemo(() => normalizar(input) === respuesta, [input, respuesta]);

  const comprobar = () => {
    if (!respuesta) {
      Alert.alert('Sin dato', 'No se recibió la palabra a adivinar.');
      return;
    }
    if (!input.trim()) {
      Alert.alert('Hey', 'Escribe tu respuesta.');
      return;
    }
    Alert.alert(ok ? '¡Correcto!' : 'Incorrecto', ok ? 'Bien ahí 👏' : 'Inténtalo otra vez');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={g.text.h2}>Completa la palabra</Text>

        {pista ? <Text style={[g.text.small, g.text.muted]}>Pista: {pista}</Text> : null}

        <View style={s.box}>
          <Text style={s.word}>{textoVisible}</Text>
        </View>

        <Text style={[g.text.smallStrong, s.label]}>Tu respuesta</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe aquí…"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          style={s.input}
        />

        <TouchableOpacity style={s.btn} onPress={comprobar}>
          <Text style={g.text.onPrimary}>Comprobar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getStyles(c: import('../../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12 },
    box: {
      backgroundColor: c.primarySoft,
      borderRadius: 10,
      paddingVertical: 18,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: c.primarySoft,
    },
    word: { fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: 2 },
    label: { marginTop: 4 },
    input: {
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.card,
      paddingHorizontal: 12,
      color: c.text,
    },
    btn: {
      marginTop: 12,
      backgroundColor: c.primary,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
