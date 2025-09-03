import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import FadeWrapper from '../../../components/FadeWrapper';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

// util compartido
import {
  createReto, updateReto,
  type RetoDTO, type Cargo, type TipoKey
} from '../../(admin)/lib/retos';

const MAX_DESC = 255 as const;
const cargos: Cargo[] = ['Operario', 'Mantenimiento', 'Supervisor'];

// claves → etiquetas visibles
const TIPOS: Record<TipoKey, string> = {
  multiple: 'Opción múltiple',
  match: 'Emparejar',
  fill: 'Rellenar',
};

type ParUI = { id: string; izquierda: string; derecha: string };

// helpers fecha
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// opcional: para mostrar bonito en el botón (pero guardamos YYYY-MM-DD)
const pretty = (s: string) => {
  if (!isYYYYMMDD(s)) return s;
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function CrearRetoModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();

  // 👇 ahora también traemos user
  const { fetchJson, user } = useAuth();

  // === detectar admin (robusto a distintos formatos del rol) ===
  const isAdmin = useMemo(() => {
    const u: any = user || {};
    // nombre del rol
    const rname = String(
      u?.rol?.nombre ?? u?.rol?.name ?? u?.role?.nombre ?? u?.role?.name ?? u?.perfil ?? ''
    ).toLowerCase();
    if (rname.includes('admin') || rname.includes('administrador')) return true;

    // id / código del rol
    const rid = Number(
      u?.rol?.id ?? u?.rol?.codRol ?? u?.rol?.cod_rol ??
      u?.role?.id ?? u?.role?.codRol ?? u?.role?.cod_rol ??
      u?.codRol ?? u?.cod_rol ?? u?.rolId ?? u?.roleId ?? u?.idRol ?? u?.id_rol
    );
    if (rid === 1) return true;

    if (u?.isAdmin === true) return true;
    return false;
  }, [user]);

  // params
  const { mode = 'create', item } = useLocalSearchParams<{ mode?: string; item?: string }>();
  const isEdit = String(mode) === 'edit';
  const itemParsed: RetoDTO | null = useMemo(() => {
    try { return item ? JSON.parse(item) : null; } catch { return null; }
  }, [item]);

  // ===== Form base
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoKey | null>(null);

  // fechas
  const hoy = useMemo(() => new Date(), []);
  const porDefectoFin = useMemo(() => new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000), [hoy]);
  const [inicio, setInicio] = useState<string>(isoDate(hoy));
  const [fin, setFin] = useState<string>(isoDate(porDefectoFin));

  // estado del calendario modal
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [dateTarget, setDateTarget] = useState<'inicio' | 'fin' | null>(null);

  // Opción múltiple
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState<{ id: string; texto: string; correcta?: boolean }[]>([
    { id: 'a', texto: '' },
    { id: 'b', texto: '' },
    { id: 'c', texto: '' },
    { id: 'd', texto: '' },
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
  const [fillWord, setFillWord] = useState('');
  const [fillHint, setFillHint] = useState('');

  const [cargando, setCargando] = useState(false);

  // Prefill edición
  useEffect(() => {
    if (!isEdit || !itemParsed) return;
    setNombre(itemParsed.nombreReto || '');
    setDescripcion(itemParsed.descripcionReto || '');
    setInicio(itemParsed.fechaInicioReto || isoDate(hoy));
    setFin(itemParsed.fechaFinReto || isoDate(porDefectoFin));

    if (itemParsed.cargo) setCargo(itemParsed.cargo);
    if (itemParsed.tipo) setTipo(itemParsed.tipo);
  }, [isEdit, itemParsed, hoy, porDefectoFin]);

  function validarFechas(): boolean {
    if (!isYYYYMMDD(inicio) || !isYYYYMMDD(fin)) {
      Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD.');
      return false;
    }
    if (new Date(inicio) > new Date(fin)) {
      Alert.alert('Rango inválido', 'La fecha de inicio no puede ser mayor a la de fin.');
      return false;
    }
    return true;
  }

  // ===== Crear
  const crear = async () => {
    if (!nombre.trim()) return Alert.alert('Falta información', 'El nombre del reto es obligatorio');
    if (!validarFechas()) return;

    const payload: Partial<RetoDTO> & Record<string, any> = {
      nombreReto: nombre.trim(),
      descripcionReto: descripcion.trim(), // string, nunca null
      tiempoEstimadoSegReto: 0,
      fechaInicioReto: inicio,
      fechaFinReto: fin,
      cargo,
      tipo: tipo ?? undefined,
      config:
        tipo === 'multiple' ? { pregunta, opciones, multiple } :
        tipo === 'match'    ? { pares } :
        tipo === 'fill'     ? { respuesta: fillWord, pista: fillHint } :
        undefined,
    };

    try {
      setCargando(true);
      await createReto(fetchJson, payload);
      Alert.alert('OK', 'Reto creado correctamente');
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('403')) Alert.alert('Sin permisos', 'No puedes crear retos.');
      else if (msg.includes('401')) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      else Alert.alert('Error', msg || 'No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  // ===== Guardar cambios
  const guardarCambios = async () => {
    if (!isEdit || !itemParsed) return;
    if (!validarFechas()) return;

    const payload: Partial<RetoDTO> & Record<string, any> = {
      codReto: itemParsed.codReto,
      nombreReto: nombre.trim(),
      descripcionReto: (descripcion ?? '').trim(),
      fechaInicioReto: inicio,
      fechaFinReto: fin,
      tiempoEstimadoSegReto: itemParsed.tiempoEstimadoSegReto ?? 0,
      cargo,
      tipo: tipo ?? undefined,
      config:
        tipo === 'multiple' ? { pregunta, opciones, multiple } :
        tipo === 'match'    ? { pares } :
        tipo === 'fill'     ? { respuesta: fillWord, pista: fillHint } :
        undefined,
    };

    try {
      setCargando(true);
      await updateReto(fetchJson, itemParsed.codReto, payload);
      Alert.alert('OK', 'Reto actualizado');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || 'No se pudo actualizar el reto'));
    } finally {
      setCargando(false);
    }
  };

  // ===== Preview
  const probarReto = () => {
    if (!tipo) { Alert.alert('Selecciona un tipo de reto'); return; }

    if (tipo === 'match') {
      const valid = pares
        .map(p => ({ izquierda: (p.izquierda ?? '').trim(), derecha: (p.derecha ?? '').trim() }))
        .filter(p => p.izquierda && p.derecha);
      if (valid.length < 2) { Alert.alert('Mínimo 2 pares', 'Completa al menos dos pares válidos.'); return; }
      router.push({ pathname: '/(admin)/(tabs)/retos/RetoEmparejarScreen', params: { pares: JSON.stringify(valid) } });
      return;
    }

    if (tipo === 'multiple') {
      const clean = opciones.map(o => ({ ...o, texto: (o.texto || '').trim() }));
      if (!pregunta.trim() || clean.some(o => !o.texto)) { Alert.alert('Completa la pregunta y las 4 opciones'); return; }
      if (!clean.some(o => o.correcta)) { Alert.alert('Marca al menos una opción correcta'); return; }
      router.push({
        pathname: '/(admin)/(tabs)/retos/RetoMultipleScreen',
        params: { pregunta: pregunta.trim(), opciones: JSON.stringify(clean), multiple: String(multiple) },
      });
      return;
    }

    if (tipo === 'fill') {
      if (fillWord.trim().length < 2) { Alert.alert('Palabra muy corta'); return; }
      router.push({
        pathname: '/(admin)/(tabs)/retos/RetoRellenarScreen',
        params: { respuesta: fillWord.trim(), pista: (fillHint.trim() || undefined) as any },
      });
    }
  };

  // Handlers del calendario
  const openPicker = (target: 'inicio' | 'fin') => {
    setDateTarget(target);
    setDatePickerVisible(true);
  };
  const closePicker = () => {
    setDatePickerVisible(false);
    setDateTarget(null);
  };
  const onConfirmDate = (date: Date) => {
    const value = isoDate(date);
    if (dateTarget === 'inicio') setInicio(value);
    if (dateTarget === 'fin') setFin(value);
    closePicker();
  };

  // fecha mínima/máxima para UX
  const minDate = new Date('2020-01-01T00:00:00');
  const maxDate = new Date('2100-12-31T00:00:00');

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header modal */}
        <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[g.text.h2, { flex: 1 }]}>{isEdit ? 'Editar reto' : 'Crear reto'}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={g.text.smallStrong}>Nombre del tema</Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre de tema"
              placeholderTextColor={colors.mutedText}
              style={[s.input, { marginTop: 6 }]}
            />

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Descripción del tema</Text>
            <View style={[s.textAreaWrap, { marginTop: 6 }]}>
              <TextInput
                value={descripcion}
                onChangeText={(t) => t.length <= MAX_DESC && setDescripcion(t)}
                placeholder="Sobre qué trata el tema"
                placeholderTextColor={colors.mutedText}
                multiline
                style={s.textArea}
              />
              <Text style={[g.text.caption, { position: 'absolute', right: 8, bottom: 6 }]}>
                {Math.max(0, MAX_DESC - descripcion.length)}
              </Text>
            </View>

            {/* Fechas */}
            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Fechas</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Pressable style={[s.dateBtn, { borderColor: colors.inputBorder, backgroundColor: colors.card }]} onPress={() => openPicker('inicio')}>
                <Ionicons name="calendar" size={16} color={colors.mutedText} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={g.text.caption}>Inicio</Text>
                  <Text style={g.text.bodyStrong}>{pretty(inicio)}</Text>
                </View>
              </Pressable>

              <Pressable style={[s.dateBtn, { borderColor: colors.inputBorder, backgroundColor: colors.card }]} onPress={() => openPicker('fin')}>
                <Ionicons name="calendar" size={16} color={colors.mutedText} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={g.text.caption}>Fin</Text>
                  <Text style={g.text.bodyStrong}>{pretty(fin)}</Text>
                </View>
              </Pressable>
            </View>

            <DateTimePickerModal
              isVisible={datePickerVisible}
              mode="date"
              onConfirm={onConfirmDate}
              onCancel={closePicker}
              minimumDate={minDate}
              maximumDate={maxDate}
              date={new Date((dateTarget === 'fin' ? fin : inicio) + 'T00:00:00')}
              display="inline"
            />

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Seleccione el cargo</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {cargos.map((c) => (
                <Radio key={c} label={c} selected={cargo === c} onPress={() => setCargo(c)} c={colors} g={g} />
              ))}
            </View>

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Escoja tipo de reto</Text>
            <View style={s.chipsRow}>
              {(Object.keys(TIPOS) as TipoKey[]).map((key) => (
                <Chip
                  key={key}
                  label={TIPOS[key]}
                  active={tipo === key}
                  onPress={() => setTipo(key)}
                  c={colors}
                  g={g}
                />
              ))}
            </View>

            {/* ===== Config por tipo ===== */}
            {tipo === 'multiple' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “{TIPOS.multiple}”</Text>

                <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Pregunta</Text>
                <TextInput
                  value={pregunta}
                  onChangeText={setPregunta}
                  placeholder="Escribe la pregunta"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />

                <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Opciones</Text>
                {opciones.map((o, idx) => (
                  <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Pressable
                      onPress={() => setOpciones(prev => prev.map(p => p.id === o.id ? { ...p, correcta: !p.correcta } : p))}
                      style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}
                    >
                      {o.correcta ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                    </Pressable>
                    <TextInput
                      value={o.texto}
                      onChangeText={(t) => setOpciones(prev => prev.map(p => p.id === o.id ? { ...p, texto: t } : p))}
                      placeholder={`Opción ${idx + 1}`}
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                  </View>
                ))}

                <Pressable onPress={() => setMultiple(m => !m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                    {multiple ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </View>
                  <Text style={g.text.body}>Permitir múltiples respuestas correctas</Text>
                </Pressable>
              </View>
            )}

            {tipo === 'match' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “{TIPOS.match}”</Text>
                {pares.map((p) => (
                  <View key={p.id} style={s.pairRow}>
                    <TextInput
                      value={p.izquierda}
                      onChangeText={(t) => setPares(prev => prev.map(x => x.id === p.id ? { ...x, izquierda: t } : x))}
                      placeholder="Izquierda"
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                    <Ionicons name="swap-horizontal" size={18} color={colors.mutedText} />
                    <TextInput
                      value={p.derecha}
                      onChangeText={(t) => setPares(prev => prev.map(x => x.id === p.id ? { ...x, derecha: t } : x))}
                      placeholder="Derecha"
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                    <Square onPress={() => removePar(p.id)} danger c={colors} title="Quitar par" />
                  </View>
                ))}
                <TouchableOpacity
                  onPress={addPar}
                  activeOpacity={0.9}
                  style={[s.addBtn, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}
                >
                  <Text style={g.text.bodyStrong}>Añadir par</Text>
                </TouchableOpacity>
              </View>
            )}

            {tipo === 'fill' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “{TIPOS.fill}”</Text>
                <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Respuesta</Text>
                <TextInput
                  value={fillWord}
                  onChangeText={setFillWord}
                  placeholder="Palabra correcta"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />
                <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Pista (opcional)</Text>
                <TextInput
                  value={fillHint}
                  onChangeText={setFillHint}
                  placeholder="Pista para ayudar"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />
              </View>
            )}

            {/* Acciones */}
            <View style={{ marginTop: 14, gap: 10 }}>
              {!isEdit ? (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={crear}
                  disabled={cargando}
                  activeOpacity={0.9}
                >
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={guardarCambios}
                  disabled={cargando}
                  activeOpacity={0.9}
                >
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar cambios</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primarySoft }]}
                onPress={probarReto}
              >
                <Text style={[g.text.bodyStrong]}>Probar reto</Text>
              </TouchableOpacity>

              {/* (Opcional) puedes usar isAdmin para mostrar un aviso */}
              {!isAdmin && (
                <Text style={[g.text.caption, { color: colors.danger, marginTop: 6 }]}>
                  * Necesitas permisos de administrador para crear/editar retos.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes & estilos ---------- */
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
        { paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
        active ? { backgroundColor: c.primary, borderColor: c.primary } : { backgroundColor: c.mutedBg, borderColor: c.outline },
      ]}
    >
      <Text style={[g.text.smallStrong, active ? g.text.onPrimary : {}]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Square({ onPress, danger = false, c, title }: { onPress?: () => void; danger?: boolean; c: any; title?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: danger ? c.danger : c.mutedBg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: danger ? c.danger : c.outline
      }}
    >
      <Ionicons name={danger ? 'trash' : 'create'} size={16} color={danger ? '#fff' : c.text} />
    </Pressable>
  );
}

function getStyles(c: import('../../../theme/ThemeProvider').Palette) {
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
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    panel: {
      marginTop: 12, padding: 12, backgroundColor: c.cardTint, borderRadius: 12,
      borderWidth: 1, borderColor: c.tabBorder,
    },
    panelTitle: { fontWeight: '800', color: c.text, marginBottom: 8 },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.inputBorder },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    addBtn: {
      marginTop: 8, alignSelf: 'flex-start',
      paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1,
    },
    primaryBtn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dateBtn: {
      flex: 1,
      height: 54,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      alignItems: 'center',
      flexDirection: 'row',
    },
  });
}
