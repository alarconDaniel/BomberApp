import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Alert, ActivityIndicator
} from 'react-native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import FooterOperario from '../components/CustomFooter';
import { colors } from '../styles/globalStyles1';

import { API } from '../config/api';

const FOOTER_HEIGHT = 64;
const MAX_DESC = 255 as const;

const cargos = ['Operario', 'Mantenimiento', 'Supervisor'] as const;
type Cargo = (typeof cargos)[number];

const tiposReto = ['Opción múltiple', 'Reporte', 'Emparejar', 'Rellenar'] as const;
type TipoReto = (typeof tiposReto)[number];

type RetoDTO = {
  codReto: number;
  nombreReto: string;
  descripcionReto?: string | null;
  tiempoReto?: number | null;
  fechaInicioReto?: string | null;
  fechaFinReto?: string | null;
};

export default function RetosScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoReto | null>(null);
  const [query, setQuery] = useState('');

  const [cargando, setCargando] = useState(false);
  const [retos, setRetos] = useState<RetoDTO[]>([]);

  const restantes = MAX_DESC - descripcion.length;

  useEffect(() => {
    listarRetos();
  }, []);

  const listarRetos = async () => {
    try {
      setCargando(true);
      const res = await fetch(API.listar);
      const json: RetoDTO[] = await res.json();
      setRetos(Array.isArray(json) ? json : []);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar la lista de retos');
    } finally {
      setCargando(false);
    }
  };

  const crearReto = async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta información', 'El nombre del reto es obligatorio');
      return;
    }

    const payload = {
      nombreReto: nombre.trim(),
      descripcionReto: descripcion.trim() || null,
      tiempoReto: 0,
      // fechaInicioReto: '2025-09-01',
      // fechaFinReto: '2025-09-07',
    };

    try {
      setCargando(true);
      console.log('POST →', API.crear);
      const res = await fetch(API.crear, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Falla al registrar');
      }

      setNombre('');
      setDescripcion('');
      setTipo(null);
      await listarRetos();
      Alert.alert('OK', 'Reto creado correctamente');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  const dataHistorialBase = [
    'Tipos de EPP',
    'Tipos de cascos',
    'Tipos de guantes',
    'Tipos de gafas',
    'Tipos de equipos',
    'Señales de advertencia',
  ];

  const dataHistorial = useMemo(() => {
    const src = retos.length ? retos.map(r => r.nombreReto) : dataHistorialBase;
    return src.filter((t) => t.toLowerCase().includes(query.toLowerCase()));
  }, [query, retos]);

  return (
    <FadeWrapper>
      <SafeAreaView style={styles.container}>
        <HeaderOperario />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Crear un nuevo reto</Text>

          {/* Nombre */}
          <Text style={styles.label}>Ingrese el nombre del tema :</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre de tema"
            placeholderTextColor="#9aa4ad"
            style={styles.input}
          />

          {/* Descripción */}
          <Text style={[styles.label, { marginTop: 10 }]}>Ingrese la descripción del tema :</Text>
          <View style={styles.textAreaWrap}>
            <TextInput
              value={descripcion}
              onChangeText={(t) => t.length <= MAX_DESC && setDescripcion(t)}
              placeholder="Sobre qué trata el tema"
              placeholderTextColor="#9aa4ad"
              multiline
              style={styles.textArea}
            />
            <Text style={styles.counter}>{restantes}</Text>
          </View>

          {/* Cargo */}
          <Text style={[styles.label, { marginTop: 10 }]}>Seleccione el cargo</Text>
          <View style={styles.radioRow}>
            {cargos.map((c) => (
              <Radio key={c} label={c} selected={cargo === c} onPress={() => setCargo(c)} />
            ))}
          </View>

          {/* Tipo de reto */}
          <Text style={[styles.label, { marginTop: 10 }]}>Escoja tipo de reto</Text>
          <View style={styles.chipsRow}>
            {tiposReto.map((t) => (
              <Chip
                key={t}
                label={t}
                active={tipo === t}
                onPress={() => setTipo((prev) => (prev === t ? null : t))}
              />
            ))}
          </View>

          {/* Botón Guardar */}
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity style={styles.saveBtn} onPress={crearReto} disabled={cargando}>
              {cargando ? <ActivityIndicator /> : <Text style={styles.saveText}>Guardar reto</Text>}
            </TouchableOpacity>
          </View>

          {/* Historial / Lista */}
          <Text style={styles.historyTitle}>Historial de retos</Text>

          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar…"
              placeholderTextColor="#9aa4ad"
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={dataHistorial}
            keyExtractor={(item) => item}
            renderItem={({ item }) => <HistoryItem title={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            scrollEnabled={false}
            style={{ marginTop: 8 }}
          />
        </ScrollView>

        {/* (opcional) footer si lo usas */}
        {/* <FooterOperario /> */}
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes ---------- */
function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.radioItem} activeOpacity={0.8}>
      <View style={[styles.radioOuter, selected && { borderColor: colors.blue }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.blue, borderColor: colors.blue }
          : { backgroundColor: '#E9EDF1', borderColor: '#D2D8DE' },
      ]}
    >
      <Text style={[styles.chipText, active && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}
function HistoryItem({ title }: { title: string }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>{title}</Text>
      <View style={styles.historyActions}>
        <View style={styles.square} />
        <View style={styles.square} />
        <View style={styles.square} />
      </View>
    </View>
  );
}

/* ---------- Estilos ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8, color: colors.navy },
  label: { fontSize: 14, fontWeight: '600', color: colors.navy, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#D2D8DE', borderRadius: 8,
    paddingHorizontal: 12, height: 40, backgroundColor: '#F8FAFC', color: '#1F2937',
  },
  textAreaWrap: {
    position: 'relative', borderWidth: 1, borderColor: '#D2D8DE',
    borderRadius: 8, backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 140, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24,
    color: '#1F2937', textAlignVertical: 'top',
  },
  counter: { position: 'absolute', right: 8, bottom: 6, fontSize: 12, color: '#8A93A0' },
  radioRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: '#9AA4AD', alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  radioLabel: { color: colors.navy },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontWeight: '700', color: colors.navy },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: colors.orange, paddingHorizontal: 14, height: 36, borderRadius: 10, justifyContent: 'center' },
  actionText: { color: colors.white, fontWeight: '800' },
  historyTitle: { fontSize: 18, fontWeight: '800', marginTop: 18, color: colors.navy },
  searchWrap: {
    marginTop: 8, borderWidth: 1, borderColor: '#D2D8DE',
    borderRadius: 8, backgroundColor: '#F8FAFC',
  },
  searchInput: { height: 38, paddingHorizontal: 12, color: '#1F2937' },
  historyItem: {
    backgroundColor: '#D9D9D9', borderRadius: 8, paddingHorizontal: 12, height: 42,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  historyText: { fontWeight: '600', color: '#2A2A2A' },
  historyActions: { flexDirection: 'row', gap: 6 },
  square: { width: 20, height: 20, backgroundColor: '#BDBDBD', borderRadius: 4 },

  saveBtn: {
    backgroundColor: colors.blue, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: colors.white, fontWeight: '800' },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: FOOTER_HEIGHT,
    backgroundColor: colors.white, elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 },
  },
});
