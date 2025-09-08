// app/(modals)/reto/crear-reto.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useRouter } from 'expo-router';

import FadeWrapper from '../../../components/admin/FadeWrapper';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

import QuizRetoEditor from '../../../components/admin/reto/QuizRetoEditor';
import ChecklistRetoEditor from '../../../components/admin/reto/ChecklistRetoEditor';
import ArchivoRetoEditor from '../../../components/admin/reto/ArchivoRetoEditor';
import { EditorHandle } from '../../../components/admin/reto/types';
import { Radio, Segment, getStyles, clampInt } from '../../../components/admin/reto/EditorPrimitives';

type TipoReto = 'quiz' | 'form' | 'archivo';
const MAX_DESC = 255 as const;

type CargoRow = { id: number; nombre: string };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const pretty = (s: string) => {
  if (!isYYYYMMDD(s)) return s;
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function CrearRetoModal() {
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fetchJson } = useAuth();

  // Base
  const [tipo, setTipo] = useState<TipoReto>('quiz');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esAutomatico, setEsAutomatico] = useState<boolean>(true);
  const [activo, setActivo] = useState<boolean>(true);

  // Fechas + tiempo
  const hoy = useMemo(() => new Date(), []);
  const porDefectoFin = useMemo(() => new Date(hoy.getTime() + 7 * 86400000), [hoy]);
  const [inicio, setInicio] = useState<string>(isoDate(hoy));
  const [fin, setFin] = useState<string>(isoDate(porDefectoFin));
  const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState<number>(0);

  // calendario
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [dateTarget, setDateTarget] = useState<'inicio' | 'fin' | null>(null);
  const minDate = new Date('2020-01-01T00:00:00');
  const maxDate = new Date('2100-12-31T00:00:00');
  const openPicker = (target: 'inicio' | 'fin') => { setDateTarget(target); setDatePickerVisible(true); };
  const closePicker = () => { setDatePickerVisible(false); setDateTarget(null); };
  const onConfirmDate = (date: Date) => {
    const value = isoDate(date);
    if (dateTarget === 'inicio') setInicio(value);
    if (dateTarget === 'fin') setFin(value);
    closePicker();
  };

  // control default esAutomatico según tipo (si el usuario no lo ha tocado)
  const [touchedAuto, setTouchedAuto] = useState(false);
  useEffect(() => {
    if (!touchedAuto) {
      if (tipo === 'form') setEsAutomatico(true);
      if (tipo === 'quiz' || tipo === 'archivo') setEsAutomatico(false);
    }
  }, [tipo, touchedAuto]);

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

  // Refs a editores
  const quizRef = useRef<EditorHandle>(null);
  const checklistRef = useRef<EditorHandle>(null);
  const archivoRef = useRef<EditorHandle>(null);

  // CARGOS (desde BD)
  const [cargos, setCargos] = useState<CargoRow[]>([]);
  const [selCargoIds, setSelCargoIds] = useState<number[]>([]);
  const [cargandoCargos, setCargandoCargos] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCargandoCargos(true);
        const rows: CargoRow[] = await fetchJson('/catalogos/cargos');
        if (!alive) return;
        setCargos(rows || []);
        // Si quieres, selecciona todos por defecto:
        // setSelCargoIds((rows || []).map(r => r.id));
      } catch (e: any) {
        Alert.alert('Error', String(e?.message || 'No se pudieron cargar los cargos'));
      } finally {
        setCargandoCargos(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchJson]);

  const toggleCargo = (id: number) => {
    setSelCargoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Guardado
  const [cargando, setCargando] = useState(false);

  function buildPayload(config: any) {
    const tiempoEstimadoSegReto = Math.max(0, Math.floor(Number(tiempoEstimadoMin) * 60));
    const tipoApi: TipoReto = tipo;

    return {
      nombreReto: nombre.trim(),
      descripcionReto: (descripcion ?? '').trim(),
      tiempoEstimadoSegReto,
      fechaInicioReto: inicio,
      fechaFinReto: fin,

      // NUEVO: asignación por cargos (multi)
      cargoIds: selCargoIds,     // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

      esAutomaticoReto: !!esAutomatico,
      activo,
      tipo: tipoApi,
      tipoReto: tipoApi,
      config,
      metadataReto: config,
      metadata_reto: config,
    };
  }

  const crear = async () => {
    if (!nombre.trim()) return Alert.alert('Falta información', 'El nombre del reto es obligatorio');
    if (!validarFechas()) return;
    if (!selCargoIds.length) {
      Alert.alert('Asignación requerida', 'Selecciona al menos un cargo para asignar el reto.');
      return;
    }

    let handle = quizRef.current as EditorHandle | null;
    if (tipo === 'form') handle = checklistRef.current;
    if (tipo === 'archivo') handle = archivoRef.current;

    if (!handle?.validate()) {
      Alert.alert('Revisa el contenido', 'Faltan datos en la sección del reto.');
      return;
    }
    const config = handle.getConfig();

    try {
      setCargando(true);
      await fetchJson('/reto/crear', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(config)),
      });
      Alert.alert('OK', 'Reto creado correctamente 🎉');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || 'No se pudo crear el reto'));
    } finally {
      setCargando(false);
    }
  };

  return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
          {/* Header modal */}
          <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[g.text.h2, { flex: 1 }]}>Crear reto</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[s.card, { marginTop: 8 }]}>
              {/* Tipo de reto */}
              <Text style={g.text.smallStrong}>Tipo de reto</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
                <Segment label="Quiz" active={tipo === 'quiz'} onPress={() => setTipo('quiz')} c={colors} g={g} icon="help-circle" />
                <Segment label="Checklist" active={tipo === 'form'} onPress={() => setTipo('form')} c={colors} g={g} icon="checkbox" />
                <Segment label="Archivo" active={tipo === 'archivo'} onPress={() => setTipo('archivo')} c={colors} g={g} icon="document" />
              </View>

              <View style={{ height: 8 }} />

              {/* Nombre / Descripción */}
              <Text style={g.text.smallStrong}>Nombre del tema</Text>
              <TextInput value={nombre} onChangeText={setNombre} placeholder="Nombre de tema" placeholderTextColor={colors.mutedText} style={[s.input, { marginTop: 6 }]} />

              <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Descripción del tema</Text>
              <View style={[s.textAreaWrap, { marginTop: 6 }]}>
                <TextInput value={descripcion} onChangeText={(t) => t.length <= MAX_DESC && setDescripcion(t)} placeholder="Sobre qué trata el tema" placeholderTextColor={colors.mutedText} multiline style={s.textArea} />
                <Text style={[g.text.caption, { position: 'absolute', right: 8, bottom: 6 }]}>{Math.max(0, MAX_DESC - descripcion.length)}</Text>
              </View>

              {/* Tiempo estimado (min) */}
              <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Tiempo estimado (min)</Text>
              <TextInput
                  keyboardType="numeric"
                  value={String(tiempoEstimadoMin)}
                  onChangeText={(t) => setTiempoEstimadoMin(clampInt(t, 0, 1440))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedText}
                  style={[s.input, { marginTop: 6 }]}
              />

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

              {/* CARGOS (multi) */}
              <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Asignar a cargos</Text>
              {cargandoCargos ? (
                  <View style={{ paddingVertical: 10 }}><ActivityIndicator color={colors.text} /></View>
              ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {cargos.map(cg => {
                      const selected = selCargoIds.includes(cg.id);
                      return (
                          <Pressable
                              key={cg.id}
                              onPress={() => toggleCargo(cg.id)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                height: 36,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: selected ? colors.primary : colors.outline,
                                backgroundColor: selected ? colors.primary + '20' : colors.mutedBg,
                                gap: 8,
                              }}
                          >
                            <Text style={g.text.body}>{cg.nombre}</Text>
                            {selected ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                          </Pressable>
                      );
                    })}
                    {!cargos.length && <Text style={g.text.caption}>No hay cargos configurados</Text>}
                  </View>
              )}

              {/* Activo */}
              <View style={{ marginTop: 12 }}>
                <Pressable onPress={() => setActivo(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 }}>
                  <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                    {activo ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </View>
                  <Text style={g.text.body}>Activo</Text>
                </Pressable>
              </View>

              {/* Es automático */}
              <View style={{ marginTop: 6 }}>
                <Pressable
                    onPress={() => { setTouchedAuto(true); setEsAutomatico(v => !v); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 }}
                >
                  <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                    {esAutomatico ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </View>
                  <Text style={g.text.body}>Es automático</Text>
                </Pressable>
              </View>

              {/* ===== Sección modular según tipo ===== */}
              {tipo === 'quiz' && (
                  <QuizRetoEditor key="crear" ref={quizRef} colors={colors} g={g} />
              )}
              {tipo === 'form' && (
                  <ChecklistRetoEditor ref={checklistRef} colors={colors} g={g} />
              )}
              {tipo === 'archivo' && <ArchivoRetoEditor ref={archivoRef} colors={colors} g={g} />}

              {/* Acciones */}
              <View style={{ marginTop: 16, gap: 10 }}>
                <Pressable style={[s.primaryBtn, { backgroundColor: colors.primary, alignItems:'center', justifyContent:'center' }]} onPress={crear} disabled={cargando}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </FadeWrapper>
  );
}
