// screens/retos/RetoEmparejarScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/StackNavigator';
import { colors } from '../../../styles/globalStyles1';

type Props = NativeStackScreenProps<RootStackParamList, 'RetoEmparejar'>;
type Par = { izquierda?: string; derecha?: string };

export default function RetoEmparejarScreen({ route }: Props) {
  // Acepta `pares` y también `parejas` como fallback
  const incoming = (route.params as any) ?? {};
  const raw: Par[] = (incoming.pares ?? incoming.parejas ?? []) as Par[];

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

  // Si no llega nada, avisa
  if (pares.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={s.emptyWrap}>
          <Text style={s.h1}>Reto: Emparejar</Text>
          <Text style={s.emptyText}>
            No se recibieron pares desde la pantalla anterior.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Estado de selección y aciertos
  const [selIzq, setSelIzq] = useState<number | null>(null);
  const [selDer, setSelDer] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState<Set<number>>(new Set());

  const elegirIzq = (idx: number) => {
    if (aciertos.has(idx)) return; // ya acertado
    setSelIzq(idx === selIzq ? null : idx);
  };

  const elegirDer = (idx: number) => {
    if (aciertos.has(idx)) return;
    setSelDer(idx === selDer ? null : idx);
  };

  // Cuando hay una selección en ambos lados, comprobar
  if (selIzq !== null && selDer !== null) {
    const ok =
      pares[selIzq]?.izquierda.toLowerCase() ===
      pares[selDer]?.derecha.toLowerCase();

    setTimeout(() => {
      if (ok) {
        const next = new Set(aciertos);
        next.add(selIzq);
        setAciertos(next);
      } else {
        Alert.alert('Ups', 'No coinciden, intenta otra vez.');
      }
      setSelIzq(null);
      setSelDer(null);
    }, 80);
  }

  const terminado = aciertos.size === pares.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={s.container}>
        <Text style={s.h1}>Reto: Emparejar</Text>

        <View style={s.columns}>
          {/* Columna izquierda */}
          <View style={s.col}>
            <Text style={s.colTitle}>Izquierda</Text>
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
                    active && s.itemActive,
                    done && s.itemDone,
                  ]}
                >
                  <Text style={[s.itemTxt, done && s.itemTxtDone]}>
                    {p.izquierda}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Columna derecha (mismo orden para que veas EXACTAMENTE tus opciones) */}
          <View style={s.col}>
            <Text style={s.colTitle}>Derecha</Text>
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
                    active && s.itemActive,
                    done && s.itemDone,
                  ]}
                >
                  <Text style={[s.itemTxt, done && s.itemTxtDone]}>
                    {p.derecha}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {terminado ? (
          <View style={s.doneBox}>
            <Text style={s.doneTxt}>¡Completado! 🎉</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: '#111827' },

  columns: { flex: 1, flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colTitle: { fontWeight: '700', color: '#374151', marginBottom: 8 },

  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  itemActive: { borderColor: '#6D8CFF', backgroundColor: '#EEF2FF' },
  itemDone: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  itemTxt: { color: '#111827', fontWeight: '600' },
  itemTxtDone: { color: '#065F46' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#6b7280' },

  doneBox: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
  },
  doneTxt: { color: '#065F46', fontWeight: '800' },
});
