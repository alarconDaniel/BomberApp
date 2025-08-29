import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, StatusBar, BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../../theme/GlobalStyles';

type Par = { izquierda?: string; derecha?: string };

const norm = (s?: string) => (s ?? '').trim().toLowerCase();
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default function RetoEmparejarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const params = useLocalSearchParams<Record<string, any>>();
  const incomingRaw = (params?.pares ?? params?.parejas) as unknown;

  const paresLimpios = useMemo<Required<Par>[]>(() => {
    let raw: Par[] = [];
    if (typeof incomingRaw === 'string') { try { raw = JSON.parse(incomingRaw) as Par[]; } catch {} }
    else if (Array.isArray(incomingRaw)) raw = incomingRaw as Par[];
    return raw
      .map(p => ({ izquierda: (p.izquierda ?? '').trim(), derecha: (p.derecha ?? '').trim() }))
      .filter(p => p.izquierda && p.derecha);
  }, [incomingRaw]);

  const goRetos = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('../../RetosScreen');
    return true;
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goRetos);
      return () => sub.remove();
    }, [goRetos]),
  );

  if (paresLimpios.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top','bottom']}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={[s.emptyWrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
          <Text style={g.text.h2}>Reto: Emparejar</Text>
          <Text style={[g.text.small, g.text.muted]}>No se recibieron pares desde la pantalla anterior.</Text>
          <TouchableOpacity onPress={goRetos} style={[s.secondaryBtn, { marginTop: 10 }]}>
            <Text style={g.text.bodyStrong}>Volver a Retos</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const izquierda = paresLimpios.map(p => p.izquierda);
  const [derecha, setDerecha] = useState<string[]>(() => shuffle(paresLimpios.map(p => p.derecha)));
  const [selIzq, setSelIzq] = useState<number | null>(null);
  const [selDer, setSelDer] = useState<number | null>(null);
  const [matchLeft, setMatchLeft] = useState<Set<number>>(new Set());
  const [matchRight, setMatchRight] = useState<Set<number>>(new Set());

  const elegirIzq = (idx: number) => { if (!matchLeft.has(idx)) setSelIzq(idx === selIzq ? null : idx); };
  const elegirDer = (idx: number) => { if (!matchRight.has(idx)) setSelDer(idx === selDer ? null : idx); };

  useEffect(() => {
    if (selIzq === null || selDer === null) return;

    // compara por valor: izquierda[selIzq] con derecha[selDer]
    const valorCorrectoDer = paresLimpios[selIzq].derecha;
    const valorElegidoDer = derecha[selDer];
    const ok = norm(valorCorrectoDer) === norm(valorElegidoDer);

    const t = setTimeout(() => {
      if (ok) {
        setMatchLeft(prev => new Set(prev).add(selIzq));
        setMatchRight(prev => new Set(prev).add(selDer));
      } else {
        Alert.alert('Ups', 'No coinciden, intenta otra vez.');
      }
      setSelIzq(null);
      setSelDer(null);
    }, 120);

    return () => clearTimeout(t);
  }, [selIzq, selDer, derecha, paresLimpios]);

  const terminado = matchLeft.size === paresLimpios.length;

  const reiniciar = () => {
    setMatchLeft(new Set());
    setMatchRight(new Set());
    setSelIzq(null);
    setSelDer(null);
    setDerecha(shuffle(paresLimpios.map(p => p.derecha)));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top','bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={[s.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {/* Back */}
        <TouchableOpacity onPress={goRetos} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={g.text.bodyStrong}>Retos</Text>
        </TouchableOpacity>

        <Text style={g.text.h2}>Reto: Emparejar</Text>

        <View style={s.columns}>
          {/* Columna izquierda */}
          <View style={s.col}>
            <Text style={[g.text.smallStrong, s.colTitle]}>Izquierda</Text>
            {izquierda.map((txt, ix) => {
              const done = matchLeft.has(ix);
              const active = selIzq === ix;
              return (
                <TouchableOpacity
                  key={`L-${ix}`}
                  onPress={() => elegirIzq(ix)}
                  disabled={done}
                  style={[
                    s.item,
                    active && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    done && { backgroundColor: colors.successSoft, borderColor: colors.success },
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={[g.text.bodyStrong, done && { color: colors.success }]} numberOfLines={1}>
                    {txt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Columna derecha (barajada) */}
          <View style={s.col}>
            <Text style={[g.text.smallStrong, s.colTitle]}>Derecha</Text>
            {derecha.map((txt, ix) => {
              const done = matchRight.has(ix);
              const active = selDer === ix;
              return (
                <TouchableOpacity
                  key={`R-${ix}`}
                  onPress={() => elegirDer(ix)}
                  disabled={done}
                  style={[
                    s.item,
                    active && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    done && { backgroundColor: colors.successSoft, borderColor: colors.success },
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={[g.text.bodyStrong, done && { color: colors.success }]} numberOfLines={1}>
                    {txt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={reiniciar}>
            <Text style={g.text.bodyStrong}>Reiniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={goRetos}>
            <Text style={g.text.bodyStrong}>Volver a Retos</Text>
          </TouchableOpacity>
        </View>

        {terminado ? (
          <View style={[s.doneBox, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Text style={[g.text.bodyStrong, { color: colors.success }]}>¡Completado! 🎉</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function getStyles(c: import('../../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, gap: 12 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    columns: { flex: 1, flexDirection: 'row', gap: 12 },
    col: { flex: 1 },
    colTitle: { marginBottom: 8 },
    item: {
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
      borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.card, marginBottom: 8,
    },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
    doneBox: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginTop: 8 },
    secondaryBtn: {
      height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.mutedBg, borderWidth: 1, borderColor: c.outline,
    },
  });
}
