// app/(admin)/(tabs)/retos/RetoEmparejarScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '../../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../../theme/GlobalStyles';

type Par = { izquierda?: string; derecha?: string };

export default function RetoEmparejarScreen() {
  const { colors } = useTheme();
  const gs = useMemo(() => makeGlobalStyles(colors), [colors]);

  // Lee params desde expo-router
  const params = useLocalSearchParams<Record<string, any>>();
  // Acepta `pares` y también `parejas`; soporta string JSON o array directo
  const incomingRaw = (params?.pares ?? params?.parejas) as unknown;

  const raw: Par[] = useMemo(() => {
    if (!incomingRaw) return [];
    if (typeof incomingRaw === 'string') {
      try { return JSON.parse(incomingRaw) as Par[]; } catch { return []; }
    }
    return Array.isArray(incomingRaw) ? (incomingRaw as Par[]) : [];
  }, [incomingRaw]);

  const pares = useMemo(
    () =>
      raw
        .map(p => ({
          izquierda: (p.izquierda ?? '').trim(),
          derecha: (p.derecha ?? '').trim(),
        }))
        .filter(p => p.izquierda && p.derecha),
    [raw]
  );

  // Estado de selección y aciertos
  const [selIzq, setSelIzq] = useState<number | null>(null);
  const [selDer, setSelDer] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState<Set<number>>(new Set());

  const elegirIzq = (idx: number) => {
    if (aciertos.has(idx)) return;
    setSelIzq(idx === selIzq ? null : idx);
  };
  const elegirDer = (idx: number) => {
    if (aciertos.has(idx)) return;
    setSelDer(idx === selDer ? null : idx);
  };

  // Mostrar vacío si no llegaron pares
  if (pares.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={s.emptyWrap}>
          <Text style={gs.text.h2}>Reto: Emparejar</Text>
          <Text style={[gs.text.small, gs.text.muted]}>
            No se recibieron pares desde la pantalla anterior.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificación al tener dos selecciones
  useEffect(() => {
    if (selIzq === null || selDer === null) return;

    const ok =
      pares[selIzq]?.izquierda.toLowerCase() ===
      pares[selDer]?.derecha.toLowerCase();

    const t = setTimeout(() => {
      if (ok) {
        setAciertos(prev => {
          const next = new Set(prev);
          next.add(selIzq);
          return next;
        });
      } else {
        Alert.alert('Ups', 'No coinciden, intenta otra vez.');
      }
      setSelIzq(null);
      setSelDer(null);
    }, 80);

    return () => clearTimeout(t);
  }, [selIzq, selDer, pares]);

  const terminado = aciertos.size === pares.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.container}>
        <Text style={gs.text.h2}>Reto: Emparejar</Text>

        <View style={s.columns}>
          {/* Columna izquierda */}
          <View style={s.col}>
            <Text style={[gs.text.smallStrong, s.colTitle]}>Izquierda</Text>
            {pares.map((p, ix) => {
              const done = aciertos.has(ix);
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
                >
                  <Text style={[gs.text.bodyStrong, done && { color: colors.success }]}>
                    {p.izquierda}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Columna derecha */}
          <View style={s.col}>
            <Text style={[gs.text.smallStrong, s.colTitle]}>Derecha</Text>
            {pares.map((p, ix) => {
              const done = aciertos.has(ix);
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
                >
                  <Text style={[gs.text.bodyStrong, done && { color: colors.success }]}>
                    {p.derecha}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {terminado ? (
          <View style={[s.doneBox, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Text style={[gs.text.bodyStrong, { color: colors.success }]}>¡Completado! 🎉</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  columns: { flex: 1, flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colTitle: { marginBottom: 8 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  doneBox: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
