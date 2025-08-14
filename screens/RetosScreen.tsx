import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import CustomFooter from '../components/CustomFooter';
import { colors } from '../styles/globalStyles1';

const FOOTER_HEIGHT = 64;
const MAX_DESC = 255 as const;

const cargos = ['Operario', 'Mantenimiento', 'Supervisor'] as const;
type Cargo = (typeof cargos)[number];

const tiposReto = ['Opción múltiple', 'Reporte', 'Emparejar', 'Rellenar'] as const;
type TipoReto = (typeof tiposReto)[number];

export default function RetosScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoReto | null>(null);
  const [query, setQuery] = useState('');

  const restantes = MAX_DESC - descripcion.length;

  const dataHistorial = useMemo(
    () => [
      'Tipos de EPP',
      'Tipos de cascos',
      'Tipos de guantes',
      'Tipos de gafas',
      'Tipos de equipos',
      'Señales de advertencia',
    ].filter((t) => t.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

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

          {/* Acciones tipo wireframe (puedes conectar luego) */}
          <View style={styles.actionsRow}>
            <ActionBtn text="Reportar" onPress={() => {}} />
            <ActionBtn text="Emparejar" onPress={() => {}} />
            <ActionBtn text="Rellenar" onPress={() => {}} />
          </View>

          {/* Historial */}
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

       
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes ---------- */

function Radio({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.radioItem} activeOpacity={0.8}>
      <View style={[styles.radioOuter, selected && { borderColor: colors.blue }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
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

function ActionBtn({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionText}>{text}</Text>
    </TouchableOpacity>
  );
}

function HistoryItem({ title }: { title: string }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>{title}</Text>
      <View style={styles.historyActions}>
        {/* Tres “cuadritos” a la derecha como en el wireframe */}
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
    borderWidth: 1,
    borderColor: '#D2D8DE',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: '#F8FAFC',
    color: '#1F2937',
  },

  textAreaWrap: {
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D2D8DE',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    minHeight: 140,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24, // espacio para contador
    color: '#1F2937',
    textAlignVertical: 'top',
  },
  counter: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    fontSize: 12,
    color: '#8A93A0',
  },

  radioRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  radioItem: { flexDirection: 'row', alignItems: 'center' },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9AA4AD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  radioLabel: { color: colors.navy },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: { fontWeight: '700', color: colors.navy },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: {
    backgroundColor: colors.orange,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
  },
  actionText: { color: colors.white, fontWeight: '800' },

  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 18,
    color: colors.navy,
  },
  searchWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D2D8DE',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  searchInput: { height: 38, paddingHorizontal: 12, color: '#1F2937' },

  historyItem: {
    backgroundColor: '#D9D9D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyText: { fontWeight: '600', color: '#2A2A2A' },
  historyActions: { flexDirection: 'row', gap: 6 },
  square: {
    width: 20,
    height: 20,
    backgroundColor: '#BDBDBD',
    borderRadius: 4,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
});
