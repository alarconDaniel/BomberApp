import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../../theme/GlobalStyles';

type Opcion = { id: string; texto: string; correcta: boolean };

export default function RetoMultipleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const params = useLocalSearchParams<{ pregunta?: string; opciones?: string; multiple?: string }>();
  const pregunta = (params?.pregunta ?? '').trim();

  const opciones: Opcion[] = useMemo(() => {
    const raw = params?.opciones;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((x: any, i: number) => {
            if (typeof x === 'string') return { id: String.fromCharCode(97 + i), texto: x, correcta: false };
            const txt = (x?.texto ?? x?.label ?? x?.title ?? '').trim();
            if (!txt) return null;
            const id = (x?.id ?? String.fromCharCode(97 + i)).toString();
            const corr = !!(x?.correcta ?? x?.isCorrect ?? x?.ok);
            return { id, texto: txt, correcta: corr };
          }).filter(Boolean) as Opcion[];
        }
      } catch {}
    }
    return [];
  }, [params?.opciones]);

  const multiple = (typeof params?.multiple === 'string') ? params.multiple === 'true' : false;

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [verResultado, setVerResultado] = useState(false);

  const correctas = useMemo(() => new Set(opciones.filter(o => o.correcta).map(o => o.id)), [opciones]);

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

  const toggle = (id: string) => {
    if (verResultado) return;
    setSeleccion(prev => {
      const next = new Set(prev);
      if (multiple) (next.has(id) ? next.delete(id) : next.add(id));
      else { next.clear(); next.add(id); }
      return next;
    });
  };

  const aciertos = useMemo(() => {
    let ok = 0;
    seleccion.forEach(id => { if (correctas.has(id)) ok++; });
    return ok;
  }, [seleccion, correctas]);

  const sinDatos = !pregunta && opciones.length === 0;
  const reiniciar = () => { setSeleccion(new Set()); setVerResultado(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top','bottom']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity onPress={goRetos} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={g.text.bodyStrong}>Retos</Text>
        </TouchableOpacity>

        <Text style={g.text.h2}>Opción múltiple</Text>
        {!!pregunta && <Text style={[g.text.bodyStrong, { marginBottom: 8 }]}>{pregunta}</Text>}

        {sinDatos && (
          <View style={[s.empty, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}>
            <Text style={[g.text.small, g.text.muted]}>No se recibieron datos (pregunta u opciones).</Text>
          </View>
        )}

        {opciones.map((o) => {
          const checked = seleccion.has(o.id);
          const esCorrecta = correctas.has(o.id);
          let box = { backgroundColor: colors.card, borderColor: colors.inputBorder };
          if (checked && !verResultado) box = { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft };
          else if (verResultado) {
            if (checked && esCorrecta) box = { backgroundColor: colors.successSoft, borderColor: colors.success };
            else if (checked && !esCorrecta) box = { backgroundColor: colors.dangerSoft ?? 'rgba(239,68,68,0.14)', borderColor: colors.danger };
            else if (!checked && esCorrecta) box = { backgroundColor: colors.warningSoft, borderColor: colors.warning };
          }
          return (
            <TouchableOpacity key={o.id} activeOpacity={0.9} onPress={() => toggle(o.id)} style={[s.option, box]}>
              <Text style={g.text.bodyStrong}>{o.texto}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[s.primaryBtn, { flex: 1, opacity: (verResultado || seleccion.size === 0 || opciones.length === 0) ? 0.6 : 1 }]}
            onPress={() => setVerResultado(true)}
            disabled={verResultado || seleccion.size === 0 || opciones.length === 0}
          >
            <Text style={g.text.onPrimary}>{verResultado ? 'Completado' : 'Comprobar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { flex: 1 }]} onPress={reiniciar}>
            <Text style={g.text.bodyStrong}>Reiniciar</Text>
          </TouchableOpacity>
        </View>

        {verResultado && (
          <View style={[s.result, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
            <Text style={g.text.bodyStrong}>
              Seleccionaste {seleccion.size} opción(es). Aciertos: {aciertos} / {correctas.size}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: import('../../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 16, gap: 10 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
    option: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
    primaryBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    secondaryBtn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.mutedBg, borderWidth: 1, borderColor: c.outline },
    result: { marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
    empty: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 6 },
  });
}
