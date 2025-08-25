// screens/retos/RetoRellenarScreen.tsx
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/StackNavigator';
import { colors } from '../../../styles/globalStyles1';

type Props = NativeStackScreenProps<RootStackParamList, 'RetoRellenar'>;

export default function RetoRellenarScreen({ route }: Props) {
  // Tip oficial: respuesta. Si llegara "palabra", la tomamos como fallback para no romper.
  const pAny = route.params as any;
  const normalizar = (s: string) => (s ?? '').trim().toLowerCase();

  const respuesta = normalizar(route.params.respuesta ?? pAny?.palabra ?? '');
  const pista = route.params.pista?.trim();

  // Texto mostrado: si llega textoBase lo usamos; si no, 1ª y última letra + guiones
  const mask = (w: string) =>
    w.length < 2
      ? w ?? ''
      : `${w[0]} ${'_'.repeat(Math.max(0, w.length - 2))} ${w[w.length - 1]}`;

  const textoVisible = route.params.textoBase?.trim() ?? mask(respuesta);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={s.container}>
        <Text style={s.h1}>Completa la palabra</Text>

        {pista ? <Text style={s.hint}>Pista: {pista}</Text> : null}

        <View style={s.box}>
          <Text style={s.word}>{textoVisible}</Text>
        </View>

        <Text style={s.label}>Tu respuesta</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe aquí…"
          placeholderTextColor="#9aa4ad"
          autoCapitalize="none"
          style={s.input}
        />

        <TouchableOpacity style={s.btn} onPress={comprobar}>
          <Text style={s.btnTxt}>Comprobar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: '#111827' },
  hint: { color: '#6b7280' },

  box: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  word: { fontSize: 22, fontWeight: '800', color: '#1f2937', letterSpacing: 2 },

  label: { marginTop: 4, fontWeight: '700', color: '#111827' },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D2D8DE',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    color: '#1F2937',
  },

  btn: {
    marginTop: 12,
    backgroundColor: '#6d8cff',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: { color: '#fff', fontWeight: '800' },
});
