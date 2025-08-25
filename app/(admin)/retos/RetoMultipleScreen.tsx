import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../styles/globalStyles';
import type { RootStackParamList } from '../../navigation/StackNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RetoMultiple'>;

export default function RetoMultipleScreen({ route }: Props) {
  const { colors } = useTheme();
  const g = makeGlobalStyles(colors);
  const s = getStyles(colors);

  // Demo si no pasan params
  const pregunta = route.params?.pregunta ?? '¿Cuál(es) de las siguientes son EPP?';
  const opciones = route.params?.opciones ?? [
    { id: 'a', texto: 'Casco', correcta: true },
    { id: 'b', texto: 'Gorra', correcta: false },
    { id: 'c', texto: 'Guantes', correcta: true },
    { id: 'd', texto: 'Sandalias', correcta: false },
  ];
  const multiple = route.params?.multiple ?? true;

  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [verResultado, setVerResultado] = useState(false);

  const correctas = useMemo(
    () => new Set(opciones.filter(o => o.correcta).map(o => o.id)),
    [opciones]
  );

  const toggle = (id: string) => {
    if (verResultado) return;
    setSeleccion(prev => {
      const next = new Set(prev);
      if (multiple) {
        next.has(id) ? next.delete(id) : next.add(id);
      } else {
        next.clear(); next.add(id);
      }
      return next;
    });
  };

  const aciertos = useMemo(() => {
    let ok = 0; seleccion.forEach(id => { if (correctas.has(id)) ok++; });
    return ok;
  }, [seleccion, correctas]);

  return (
    <ScrollView contentContainerStyle={s.wrap} style={{ backgroundColor: colors.bg }}>
      <Text style={[g.text.h2, { marginBottom: 6 }]}>
        {pregunta}
      </Text>

      {opciones.map(o => {
        const checked = seleccion.has(o.id);
        const esCorrecta = correctas.has(o.id);

        // Colores por estado (tema-aware)
        let box = { backgroundColor: colors.card, borderColor: colors.inputBorder };
        if (checked && !verResultado) box = { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft };
        if (verResultado) {
          if (checked && esCorrecta) box = { backgroundColor: colors.successSoft, borderColor: colors.success };
          else if (checked && !esCorrecta) box = { backgroundColor: colors.dangerSoft ?? 'rgba(239,68,68,0.14)', borderColor: colors.danger };
          else if (!checked && esCorrecta) box = { backgroundColor: colors.warningSoft, borderColor: colors.warning };
        }

        return (
          <TouchableOpacity
            key={o.id}
            activeOpacity={0.9}
            onPress={() => toggle(o.id)}
            style={[s.option, box]}
          >
            <Text style={g.text.bodyStrong}>{o.texto}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={s.primaryBtn}
        onPress={() => setVerResultado(true)}
        disabled={verResultado || seleccion.size === 0}
      >
        <Text style={g.text.onPrimary}>{verResultado ? 'Completado' : 'Comprobar'}</Text>
      </TouchableOpacity>

      {verResultado && (
        <View style={[s.result, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
          <Text style={g.text.bodyStrong}>
            Seleccionaste {seleccion.size} opción(es). Aciertos: {aciertos} / {correctas.size}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function getStyles(c: import('../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    wrap: { padding: 16, gap: 10 },
    option: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    primaryBtn: {
      marginTop: 8,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    result: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
  });
}
