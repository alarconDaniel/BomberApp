// screens/RetosScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import { colors } from '../styles/globalStyles1';
import { BASE_URL, API } from '../config/api';

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
  tiempoEstimadoSegReto?: number | null;
  fechaInicioReto?: string | null;
  fechaFinReto?: string | null;
};

type ParUI = { id: string; izquierda: string; derecha: string }; // 👈 para Emparejar

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const normalizeReto = (x: any): RetoDTO => ({
  codReto: x?.codReto ?? x?.cod_reto ?? x?.id ?? 0,
  nombreReto: x?.nombreReto ?? x?.nombre_reto ?? '',
  descripcionReto: x?.descripcionReto ?? x?.descripcion_reto ?? null,
  tiempoEstimadoSegReto: x?.tiempoEstimadoSegReto ?? x?.tiempo_estimado_seg_reto ?? null,
  fechaInicioReto: x?.fechaInicioReto ?? x?.fecha_inicio_reto ?? null,
  fechaFinReto: x?.fechaFinReto ?? x?.fecha_fin_reto ?? null,
});

export default function RetosScreen() {
  const navigation = useNavigation<any>();

  // Campos del form general
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoReto | null>(null);
  const [query, setQuery] = useState('');

  const [cargando, setCargando] = useState(false);
  const [retos, setRetos] = useState<RetoDTO[]>([]);

  // ---------- Config específica por tipo ----------
  // Opción múltiple (simple demo: cambia en tu UI si quieres)
  const [pregunta, setPregunta] = useState('¿Cuál es de EPP?');
  const [opciones, setOpciones] = useState<
    { id: string; texto: string; correcta?: boolean }[]
  >([
    { id: 'a', texto: 'Casco', correcta: true },
    { id: 'b', texto: 'Gorra' },
    { id: 'c', texto: 'Guantes', correcta: true },
    { id: 'd', texto: 'Sandalias' },
  ]);
  const [multiple, setMultiple] = useState(true);

  // Emparejar
  const [pares, setPares] = useState<ParUI[]>([
    { id: 'p1', izquierda: '', derecha: '' },
    { id: 'p2', izquierda: '', derecha: '' },
  ]);
  const addPar = () =>
    setPares((prev) => [...prev, { id: `p${Date.now()}`, izquierda: '', derecha: '' }]);
  const removePar = (id: string) =>
    setPares((prev) => (prev.length > 2 ? prev.filter((p) => p.id !== id) : prev));

  // Rellenar
  const [fillWord, setFillWord] = useState('escaler');
  const [fillHint, setFillHint] = useState('Pa ponerse');

  const restantes = MAX_DESC - descripcion.length;

  useEffect(() => {
    if (__DEV__) {
      console.log('[RETOS] BASE_URL =', BASE_URL);
      console.log('[RETOS] LISTAR =', API.reto.listar);
    }
    listarRetos();
  }, []);

  const listarRetos = async () => {
    try {
      setCargando(true);
      const res = await fetch(`${API.reto.listar}?_ts=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store' as any,
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      if (!txt.trim()) { setRetos([]); return; }
      let json: any; try { json = JSON.parse(txt); } catch { throw new Error('Respuesta inválida'); }
      const raw = Array.isArray(json) ? json
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.items) ? json.items
        : Array.isArray(json?.retos) ? json.retos : [];
      setRetos(raw.map(normalizeReto).filter((r: RetoDTO) => !!r.codReto));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar la lista de retos');
    } finally {
      setCargando(false);
    }
  };

  const borrar = (id: string | number) => {
    Alert.alert('Confirmar', '¿Deseas borrar este reto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            setCargando(true);
            const res = await fetch(API.reto.borrar(id), { method: 'DELETE' });
            const txt = await res.text();
            if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
            await listarRetos();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo borrar');
          } finally {
            setCargando(false);
          }
        },
      },
    ]);
  };

  const crearReto = async () => {
    if (!nombre.trim()) { Alert.alert('Falta información', 'El nombre del reto es obligatorio'); return; }
    const hoy = new Date(); const fin = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    const payload = {
      nombreReto: nombre.trim(),
      descripcionReto: descripcion.trim() || null,
      tiempoEstimadoSegReto: 0,
      fechaInicioReto: isoDate(hoy),
      fechaFinReto: isoDate(fin),
    };
    try {
      setCargando(true);
      const res = await fetch(API.reto.crear, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || 'Falla al registrar');
      setNombre(''); setDescripcion(''); setTipo(null);
      await listarRetos();
      Alert.alert('OK', 'Reto creado correctamente');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  // ---------- PROBAR con los datos del admin ----------
  const probarReto = () => {
    if (!tipo) { Alert.alert('Selecciona un tipo de reto'); return; }

    if (tipo === 'Emparejar') {
  const valid = pares
    .map(p => ({
      izquierda: (p.izquierda ?? '').trim(),
      derecha: (p.derecha ?? '').trim(),
    }))
    .filter(p => p.izquierda && p.derecha);

  if (valid.length < 2) {
    Alert.alert('Mínimo 2 pares', 'Completa al menos dos pares válidos.');
    return;
  }

  navigation.navigate('RetoEmparejar', { pares: valid });
  return;
}

    if (tipo === 'Opción múltiple') {
      const clean = opciones.map(o => ({ ...o, texto: (o.texto || '').trim() }));
      if (!pregunta.trim() || clean.some(o => !o.texto)) {
        Alert.alert('Completa la pregunta y las 4 opciones');
        return;
      }
      if (!clean.some(o => o.correcta)) {
        Alert.alert('Marca al menos una opción correcta');
        return;
      }
      navigation.navigate('RetoMultiple', {
        pregunta: pregunta.trim(),
        opciones: clean,
        multiple,
      });
      return;
    }

    if (tipo === 'Rellenar') {
      if (fillWord.trim().length < 2) {
        Alert.alert('Palabra muy corta'); return;
      }
      navigation.navigate('RetoRellenar', {
        respuesta: fillWord.trim(),
        pista: fillHint.trim() || undefined,
      });
      return;
    }

    Alert.alert('Info', 'Para "Reporte" no hay preview aún.');
  };

  const retosFiltrados = useMemo(() => {
    const q = query.toLowerCase();
    return retos.filter((r: RetoDTO) =>
      (r.nombreReto || '').toLowerCase().includes(q)
    );
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

          {/* Nombre / Descripción */}
          <Text style={styles.label}>Ingrese el nombre del tema :</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre de tema"
            placeholderTextColor="#9aa4ad"
            style={styles.input}
          />

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

          {/* Tipo */}
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

          {/* ---------- Config por tipo ---------- */}
          {tipo === 'Opción múltiple' && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Configurar opción múltiple</Text>

              <Text style={styles.label}>Pregunta</Text>
              <TextInput
                value={pregunta}
                onChangeText={setPregunta}
                placeholder="Escribe la pregunta…"
                placeholderTextColor="#9aa4ad"
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: 8 }]}>Opciones</Text>
              {opciones.map((o, ix) => (
                <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const next = [...opciones];
                      next[ix] = { ...next[ix], correcta: !next[ix].correcta };
                      setOpciones(next);
                    }}
                    style={[
                      { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#9AA4AD' },
                      o.correcta && { backgroundColor: colors.blue },
                    ]}
                  />
                  <TextInput
                    value={o.texto}
                    onChangeText={(t) => {
                      const next = [...opciones];
                      next[ix] = { ...next[ix], texto: t };
                      setOpciones(next);
                    }}
                    placeholder={`Opción ${ix + 1}`}
                    placeholderTextColor="#9aa4ad"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
              ))}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => setMultiple((m) => !m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[
                    { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#9AA4AD' },
                    multiple && { backgroundColor: colors.blue },
                  ]} />
                  <Text style={{ color: '#1F2937' }}>Permitir varias correctas</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {tipo === 'Emparejar' && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Configurar emparejar</Text>

              {pares.map((p, ix) => (
                <View key={p.id} style={styles.pairRow}>
                  <TextInput
                    value={p.izquierda}
                    onChangeText={(t) => {
                      const next = [...pares];
                      next[ix] = { ...next[ix], izquierda: t };
                      setPares(next);
                    }}
                    placeholder="Izquierda"
                    placeholderTextColor="#9aa4ad"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <Text style={{ marginHorizontal: 6, color: '#4b5563' }}>—</Text>
                  <TextInput
                    value={p.derecha}
                    onChangeText={(t) => {
                      const next = [...pares];
                      next[ix] = { ...next[ix], derecha: t };
                      setPares(next);
                    }}
                    placeholder="Derecha"
                    placeholderTextColor="#9aa4ad"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TouchableOpacity onPress={() => removePar(p.id)} style={{ marginLeft: 8 }}>
                    <Text style={{ color: '#ef4444', fontWeight: '700' }}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={addPar} style={styles.addBtn}>
                <Text style={styles.addBtnTxt}>+ Añadir par</Text>
              </TouchableOpacity>
            </View>
          )}

          {tipo === 'Rellenar' && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Configurar rellenar</Text>
              <Text style={styles.label}>Palabra</Text>
              <TextInput
                value={fillWord}
                onChangeText={setFillWord}
                placeholder="Palabra objetivo"
                placeholderTextColor="#9aa4ad"
                style={styles.input}
              />
              <Text style={[styles.label, { marginTop: 8 }]}>Pista</Text>
              <TextInput
                value={fillHint}
                onChangeText={setFillHint}
                placeholder="Pista (opcional)"
                placeholderTextColor="#9aa4ad"
                style={styles.input}
              />
            </View>
          )}

          {/* Acciones */}
          <View style={{ marginTop: 16, gap: 10 }}>
            <TouchableOpacity style={styles.saveBtn} onPress={crearReto} disabled={cargando}>
              {cargando ? <ActivityIndicator /> : <Text style={styles.saveText}>Guardar reto</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#93c5fd' }]} onPress={probarReto}>
              <Text style={styles.saveText}>Probar reto</Text>
            </TouchableOpacity>
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

          {cargando ? (
            <View style={{ marginTop: 16 }}>
              <ActivityIndicator />
            </View>
          ) : retos.length > 0 ? (
            <FlatList
              data={retosFiltrados}
              keyExtractor={(item) => String(item.codReto)}
              renderItem={({ item }) => (
                <RetoItem item={item} onDelete={() => borrar(item.codReto)} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
              style={{ marginTop: 8 }}
            />
          ) : (
            <FlatList
              data={[
                'Tipos de EPP',
                'Tipos de cascos',
                'Tipos de guantes',
                'Tipos de gafas',
                'Tipos de equipos',
                'Señales de advertencia',
              ].filter(t => t.toLowerCase().includes(query.toLowerCase()))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => <HistoryItem title={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
              style={{ marginTop: 8 }}
            />
          )}
        </ScrollView>
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
function Square({ onPress, danger = false }: { onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.square, danger && { backgroundColor: '#ff6b6b' }]}
    />
  );
}
function RetoItem({ item, onDelete }: { item: RetoDTO; onDelete: () => void }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historyText} numberOfLines={1}>{item.nombreReto}</Text>
      <View style={styles.historyActions}>
        <Square onPress={() => { /* TODO: editar */ }} />
        <Square danger onPress={onDelete} />
      </View>
    </View>
  );
}
function HistoryItem({ title }: { title: string }) {
  return (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>{title}</Text>
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

  panel: { marginTop: 12, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 10 },
  panelTitle: { fontWeight: '800', color: '#1F2937', marginBottom: 8 },

  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },

  addBtn: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb', paddingHorizontal: 10, height: 34,
    borderRadius: 8, justifyContent: 'center',
  },
  addBtnTxt: { color: '#111827', fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },

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
  historyText: { fontWeight: '600', color: '#2A2A2A', flex: 1, marginRight: 8 },
  historyActions: { flexDirection: 'row', gap: 6 },

  square: { width: 20, height: 20, backgroundColor: '#BDBDBD', borderRadius: 4 },

  saveBtn: {
    backgroundColor: colors.blue, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: colors.white, fontWeight: '800' },
});
