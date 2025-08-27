// app/(admin)/(tabs)/RetosScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Alert, ActivityIndicator, Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { BASE_URL, API } from '../../config/api';
import { useAuth } from '../../auth/AuthContext';

const FOOTER_HEIGHT = 64;
const MAX_DESC = 255 as const;

const cargos = ['Operario', 'Mantenimiento', 'Supervisor'] as const;
type Cargo = (typeof cargos)[number];

const tiposReto = ['Opción múltiple', 'Emparejar', 'Rellenar'] as const;
type TipoReto = (typeof tiposReto)[number];

type RetoDTO = {
  codReto: number;
  nombreReto: string;
  descripcionReto?: string | null;
  tiempoEstimadoSegReto?: number | null;
  fechaInicioReto?: string | null;
  fechaFinReto?: string | null;
};

type ParUI = { id: string; izquierda: string; derecha: string };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const normalizeReto = (x: any): RetoDTO => ({
  codReto: x?.codReto ?? x?.cod_reto ?? x?.id ?? 0,
  nombreReto: x?.nombreReto ?? x?.nombre_reto ?? '',
  descripcionReto: x?.descripcionReto ?? x?.descripcion_reto ?? null,
  tiempoEstimadoSegReto: x?.tiempoEstimadoSegReto ?? x?.tiempo_estimado_seg_reto ?? null,
  fechaInicioReto: x?.fechaInicioReto ?? x?.fecha_inicio_reto ?? null,
  fechaFinReto: x?.fechaFinReto ?? x?.fecha_fin_reto ?? null,
});

/* ===== Helper robusto para permisos ===== */
function hasAdminRole(u: any): boolean {
  if (!u) return false;
  const flat = [
    u?.rol, u?.role, u?.roleId, u?.rolId, u?.codRol, u?.cod_rol,
    u?.idRol, u?.id_rol, u?.perfil, u?.nombreRol, u?.nombre_rol,
  ].filter(v => v !== undefined && v !== null);

  for (const v of flat) {
    const s = String(v).trim().toLowerCase();
    if (s === '1' || s === 'admin' || s === 'administrador') return true;
    const n = Number(s);
    if (!Number.isNaN(n) && n === 1) return true;
  }
  const rname = u?.rol?.name ?? u?.rol?.nombre ?? u?.role?.name ?? u?.role?.nombre;
  if (rname && ['admin', 'administrador'].includes(String(rname).toLowerCase())) return true;
  const rid = u?.rol?.id ?? u?.role?.id;
  return rid === 1 || String(rid) === '1';
}

export default function RetosScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const { user, loading: authLoading, fetchJson } = useAuth();
  const isAdmin = useMemo(() => hasAdminRole(user), [user]);

  // Form
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoReto | null>(null);
  const [query, setQuery] = useState('');

  const [cargando, setCargando] = useState(false);
  const [retos, setRetos] = useState<RetoDTO[]>([]);

  // Opción múltiple
  const [pregunta, setPregunta] = useState('¿Cuál(es) de las siguientes son EPP?');
  const [opciones, setOpciones] = useState<{ id: string; texto: string; correcta?: boolean }[]>([
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
  const addPar = () => setPares(prev => [...prev, { id: `p${Date.now()}`, izquierda: '', derecha: '' }]);
  const removePar = (id: string) => setPares(prev => (prev.length > 2 ? prev.filter(p => p.id !== id) : prev));

  // Rellenar
  const [fillWord, setFillWord] = useState('escaler');
  const [fillHint, setFillHint] = useState('Pa ponerse');

  const restantes = MAX_DESC - descripcion.length;

  useEffect(() => {
    if (__DEV__) {
      console.log('[RETOS] BASE_URL =', BASE_URL);
      console.log('[RETOS] LISTAR =', API.reto.listar);
      console.log('[RETOS] isAdmin =', isAdmin, 'user=', user);
    }
    listarRetos();
  }, [isAdmin]);

  if (authLoading) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Verificando sesión…</Text>
        </SafeAreaView>
      </FadeWrapper>
    );
  }

  const listarRetos = async () => {
    try {
      setCargando(true);
      const json = await fetchJson<any>(`${API.reto.listar}?_ts=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const raw = Array.isArray(json) ? json
        : Array.isArray(json?.data) ? json.data
        : Array.isArray(json?.items) ? json.items
        : Array.isArray(json?.retos) ? json.retos : [];
      setRetos(raw.map(normalizeReto).filter((r: RetoDTO) => !!r.codReto));
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('401')) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      else Alert.alert('Error', msg || 'No se pudo cargar la lista de retos');
    } finally {
      setCargando(false);
    }
  };

  /* ======== BORRAR con fallback por POST ======== */
  const borrar = (id: string | number) => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo un administrador puede borrar retos.');
      return;
    }
    Alert.alert('Confirmar', '¿Deseas borrar este reto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            setCargando(true);
            // Debe apuntar a /reto/borrar/:id
            await fetchJson(API.reto.borrar(id), { method: 'DELETE' });
            await listarRetos();
            Alert.alert('Listo', 'Reto eliminado');
          } catch (e: any) {
            const msg = String(e?.message || '');
            if (/401/.test(msg)) {
              Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
            } else if (/403/.test(msg)) {
              Alert.alert('Sin permisos', 'El servidor rechazó el borrado (403).');
            } else {
              Alert.alert('Error', msg || 'No se pudo borrar');
            }
          } finally {
            setCargando(false);
          }
        },
      },
    ]);
  };
  

  const crearReto = async () => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo un administrador puede crear retos.');
      return;
    }
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
      await fetchJson(API.reto.crear, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setNombre(''); setDescripcion(''); setTipo(null);
      await listarRetos();
      Alert.alert('OK', 'Reto creado correctamente');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('403')) Alert.alert('Sin permisos', 'No puedes crear retos.');
      else if (msg.includes('401')) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      else Alert.alert('Error', msg || 'No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  const probarReto = () => {
    if (!tipo) { Alert.alert('Selecciona un tipo de reto'); return; }
    if (tipo === 'Emparejar') {
      const valid = pares
        .map(p => ({ izquierda: (p.izquierda ?? '').trim(), derecha: (p.derecha ?? '').trim() }))
        .filter(p => p.izquierda && p.derecha);
      if (valid.length < 2) { Alert.alert('Mínimo 2 pares', 'Completa al menos dos pares válidos.'); return; }
      router.push({ pathname: '/(admin)/(tabs)/retos/RetoEmparejarScreen', params: { pares: JSON.stringify(valid) } });
      return;
    }
    if (tipo === 'Opción múltiple') {
      const clean = opciones.map(o => ({ ...o, texto: (o.texto || '').trim() }));
      if (!pregunta.trim() || clean.some(o => !o.texto)) { Alert.alert('Completa la pregunta y las 4 opciones'); return; }
      if (!clean.some(o => o.correcta)) { Alert.alert('Marca al menos una opción correcta'); return; }
      router.push({
        pathname: '/(admin)/(tabs)/retos/RetoMultipleScreen',
        params: { pregunta: pregunta.trim(), opciones: JSON.stringify(clean), multiple: String(multiple) },
      });
      return;
    }
    if (tipo === 'Rellenar') {
      if (fillWord.trim().length < 2) { Alert.alert('Palabra muy corta'); return; }
      router.push({
        pathname: '/(admin)/(tabs)/retos/RetoRellenarScreen',
        params: { respuesta: fillWord.trim(), pista: (fillHint.trim() || undefined) as any },
      });
      return;
    }
  };

  const retosFiltrados = useMemo(() => {
    const q = query.toLowerCase();
    return retos.filter(r => (r.nombreReto || '').toLowerCase().includes(q));
  }, [query, retos]);

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={g.text.h2}>Crear un nuevo reto</Text>
            {!isAdmin && (
              <Text style={[g.text.caption, { opacity: 0.8 }]}>Solo administradores pueden guardar/borrar</Text>
            )}
          </View>

          {/* Form */}
          <View style={[s.card, { marginTop: 8, opacity: isAdmin ? 1 : 0.9 }]}>
            <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Nombre del tema</Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre de tema"
              placeholderTextColor={colors.mutedText}
              style={s.input}
            />
            <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Descripción del tema</Text>
            <View style={s.textAreaWrap}>
              <TextInput
                value={descripcion}
                onChangeText={(t) => t.length <= MAX_DESC && setDescripcion(t)}
                placeholder="Sobre qué trata el tema"
                placeholderTextColor={colors.mutedText}
                multiline
                style={s.textArea}
              />
              <Text style={[g.text.caption, { position: 'absolute', right: 8, bottom: 6 }]}>{MAX_DESC - descripcion.length}</Text>
            </View>

            <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 8 }]}>Seleccione el cargo</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {cargos.map((c) => (
                <Radio key={c} label={c} selected={cargo === c} onPress={() => setCargo(c)} c={colors} g={g} />
              ))}
            </View>

            <Text style={[g.text.smallStrong, { marginTop: 12, marginBottom: 8 }]}>Escoja tipo de reto</Text>
            <View style={s.chipsRow}>
              {tiposReto.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={tipo === t}
                  onPress={() => setTipo(prev => (prev === t ? null : t))}
                  c={colors}
                  g={g}
                />
              ))}
            </View>

            {/* Acciones */}
            <View style={{ marginTop: 14, gap: 10 }}>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primary, opacity: isAdmin ? 1 : 0.6 }]}
                onPress={crearReto}
                disabled={cargando || !isAdmin}
                activeOpacity={0.9}
              >
                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primarySoft }]} onPress={probarReto}>
                <Text style={[g.text.bodyStrong]}>Probar reto</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Historial */}
          <View style={[s.card, { marginTop: 16 }]}>
            <Text style={g.text.h3}>Historial de retos</Text>

            <View style={[s.searchWrap, { marginTop: 10 }]}>
              <Ionicons name="search" size={16} color={colors.mutedText} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar…"
                placeholderTextColor={colors.mutedText}
                style={s.searchInput}
              />
            </View>

            {cargando ? (
              <View style={{ marginTop: 12 }}><ActivityIndicator /></View>
            ) : retos.length > 0 ? (
              <FlatList
                data={retosFiltrados}
                keyExtractor={(item) => String(item.codReto)}
                renderItem={({ item }) => (
                  <RetoItem
                    item={item}
                    onDelete={() => borrar(item.codReto)}
                    c={colors}
                    g={g}
                    isAdmin={isAdmin}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
                style={{ marginTop: 10 }}
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
                renderItem={({ item }) => <HistoryItem title={item} c={colors} g={g} />}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
                style={{ marginTop: 10 }}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes ---------- */
function Radio({ label, selected, onPress, c, g }: { label: string; selected: boolean; onPress: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 18, height: 18, borderRadius: 9, borderWidth: 2,
        borderColor: selected ? c.primary : c.inputBorder, alignItems: 'center', justifyContent: 'center',
        marginRight: 8
      }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
      </View>
      <Text style={g.text.body}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress, c, g }: { label: string; active?: boolean; onPress?: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        {
          paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1,
          justifyContent: 'center',
        },
        active
          ? { backgroundColor: c.primary, borderColor: c.primary }
          : { backgroundColor: c.mutedBg, borderColor: c.outline },
      ]}
    >
      <Text style={[g.text.smallStrong, active ? g.text.onPrimary : {}]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Square({ onPress, danger = false, c }: { onPress?: () => void; danger?: boolean; c: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 28, height: 28, borderRadius: 6,
        backgroundColor: danger ? c.danger : c.mutedBg,
        alignItems: 'center', justifyContent: 'center'
      }}
    >
      <Ionicons name={danger ? 'trash' : 'create'} size={16} color={danger ? '#fff' : c.text} />
    </Pressable>
  );
}

function RetoItem({ item, onDelete, c, g, isAdmin }: { item: RetoDTO; onDelete: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; isAdmin: boolean; }) {
  return (
    <View style={{
      backgroundColor: c.cardTint, borderRadius: 12, paddingHorizontal: 12, minHeight: 52,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: c.tabBorder
    }}>
      <Text style={[g.text.bodyStrong]} numberOfLines={1}>{item.nombreReto}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {isAdmin && <Square onPress={onDelete} danger c={c} />}
      </View>
    </View>
  );
}

function HistoryItem({ title, c, g }: { title: string; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <View style={{
      backgroundColor: c.cardTint, borderRadius: 12, paddingHorizontal: 12, minHeight: 48,
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.tabBorder
    }}>
      <Text style={g.text.bodyStrong}>{title}</Text>
    </View>
  );
}

/* ---------- Estilos base ---------- */
function getStyles(c: import('../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 18,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.tabBorder,
      backgroundColor: c.card,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    input: {
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10,
      paddingHorizontal: 12, height: 40, backgroundColor: c.card, color: c.text,
    },
    textAreaWrap: {
      position: 'relative', borderWidth: 1, borderColor: c.inputBorder,
      borderRadius: 10, backgroundColor: c.card,
    },
    textArea: {
      minHeight: 140, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24,
      color: c.text, textAlignVertical: 'top',
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    panel: {
      marginTop: 12, padding: 12, backgroundColor: c.cardTint, borderRadius: 12,
      borderWidth: 1, borderColor: c.tabBorder,
    },
    panelTitle: { fontWeight: '800', color: c.text, marginBottom: 8 },
    check: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.inputBorder,
    },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    addBtn: {
      marginTop: 8, alignSelf: 'flex-start',
      paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1,
    },
    primaryBtn: {
      height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10,
      backgroundColor: c.card, paddingHorizontal: 10, height: 40,
    },
    searchInput: { flex: 1, color: c.text },
  });
}
