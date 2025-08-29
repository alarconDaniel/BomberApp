import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, StatusBar, BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../../theme/GlobalStyles';

export default function RetoRellenarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const params = useLocalSearchParams<{ respuesta?: string; pista?: string; textoBase?: string; palabra?: string }>();
  const normalize = (v?: string) => (v ?? '').trim().toLowerCase();

  const respuesta = normalize(params.respuesta ?? params.palabra);
  const pista = params.pista?.trim();

  // Si no llega textoBase, solo mostramos máscara si hay respuesta; si no, nada.
  const mask = (w: string) => (w.length < 2 ? w : `${w[0]} ${'_'.repeat(Math.max(0, w.length - 2))} ${w[w.length - 1]}`);
  const textoVisible = (params.textoBase?.trim() || (respuesta ? mask(respuesta) : '')).trim();

  const [input, setInput] = useState('');

  const goRetos = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('../../RetosScreen'); // ruta relativa desde /retos/*
    return true;
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goRetos);
      return () => sub.remove();
    }, [goRetos]),
  );

  const comprobar = () => {
    if (!respuesta) return Alert.alert('Sin dato', 'No se recibió la palabra a adivinar.');
    if (!input.trim()) return Alert.alert('Hey', 'Escribe tu respuesta.');
    const ok = normalize(input) === respuesta;
    Alert.alert(ok ? '¡Correcto!' : 'Incorrecto', ok ? 'Bien ahí 👏' : 'Inténtalo otra vez');
  };

  const reiniciar = () => setInput('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top','bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={[s.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {/* Back */}
        <TouchableOpacity onPress={goRetos} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={g.text.bodyStrong}>Retos</Text>
        </TouchableOpacity>

        <Text style={g.text.h2}>Completa la palabra</Text>
        {!!pista && <Text style={[g.text.small, g.text.muted, { marginTop: 2 }]}>Pista: {pista}</Text>}
        {!!textoVisible && (
          <View style={s.box}>
            <Text style={s.word}>{textoVisible}</Text>
          </View>
        )}

        <Text style={[g.text.smallStrong, s.label]}>Tu respuesta</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe aquí…"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          style={s.input}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.primary }]} onPress={comprobar}>
            <Text style={g.text.onPrimary}>Comprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: colors.mutedBg, borderWidth: 1, borderColor: colors.outline }]} onPress={reiniciar}>
            <Text style={g.text.bodyStrong}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function getStyles(c: import('../../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, gap: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    box: { backgroundColor: c.primarySoft, borderRadius: 10, paddingVertical: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: c.primarySoft },
    word: { fontSize: 22, fontWeight: '800', color: c.text, letterSpacing: 2 },
    label: { marginTop: 4 },
    input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card, paddingHorizontal: 12, color: c.text },
    btn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
}
