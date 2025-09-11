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

  // Color de error (fallback si el tema no trae uno)
  const ERROR_COLOR = (colors as any).error ?? '#ef4444';

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

  function validarFechas(): { ok: boolean; errs: string[]; flags: Record<'inicio'|'fin', boolean> } {
    const flags = { inicio: false, fin: false as boolean };
    const errs: string[] = [];
    let ok = true;

    if (!isYYYYMMDD(inicio)) { ok = false; flags.inicio = true; errs.push('Fecha de inicio (formato YYYY-MM-DD)'); }
    if (!isYYYYMMDD(fin))    { ok = false; flags.fin = true; errs.push('Fecha de fin (formato YYYY-MM-DD)'); }

    if (isYYYYMMDD(inicio) && isYYYYMMDD(fin) && new Date(inicio) > new Date(fin)) {
      ok = false; flags.inicio = true; flags.fin = true; errs.push('Rango de fechas válido (inicio ≤ fin)');
    }
    return { ok, errs, flags };
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
        Alert.alert('Error', 'No se pudieron cargar los cargos');
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

  // === NUEVO: Estado de errores por campo ===
  const [fieldErrors, setFieldErrors] = useState<{
    nombre?: boolean;
    inicio?: boolean;
    fin?: boolean;
    cargos?: boolean;
    editor?: boolean;
  }>({});
  const [editorErrors, setEditorErrors] = useState<string[]>([]);

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
      cargoIds: selCargoIds,

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
    // Limpia errores previos
    setFieldErrors({});
    setEditorErrors([]);

    const missing: string[] = [];
    const nextFlags: typeof fieldErrors = {};

    // Nombre
    if (!nombre.trim()) {
      missing.push('Nombre del tema');
      nextFlags.nombre = true;
    }

    // Fechas
    const vf = validarFechas();
    if (!vf.ok) {
      missing.push(...vf.errs);
      if (vf.flags.inicio) nextFlags.inicio = true;
      if (vf.flags.fin) nextFlags.fin = true;
    }

    // Cargos
    if (!selCargoIds.length) {
      missing.push('Asignar a cargos (elige al menos uno)');
      nextFlags.cargos = true;
    }

    // Editor según tipo
    let handle = quizRef.current as EditorHandle | null;
    if (tipo === 'form') handle = checklistRef.current;
    if (tipo === 'archivo') handle = archivoRef.current;

    const editorDetail: string[] = [];
    let editorOk = true;

    if (!handle || typeof handle.validate !== 'function') {
      // Si no hay handle o no implementa validate, lo marcamos como error para no pasar en falso positivo
      editorOk = false;
    } else {
      try {
        const result: any = handle.validate();
        if (result === true) {
          editorOk = true;
        } else if (Array.isArray(result)) {
          editorOk = result.length === 0;
          if (!editorOk) editorDetail.push(...result);
        } else if (typeof result === 'object' && result) {
          editorOk = !!result.ok;
          if (result.errors && Array.isArray(result.errors)) editorDetail.push(...result.errors);
        } else {
          editorOk = false;
        }
      } catch {
        editorOk = false;
      }
    }

    if (!editorOk) {
      nextFlags.editor = true;
      missing.push('Contenido del reto');
      if (editorDetail.length) {
        // agrega subdetalles al alert como viñetas
        editorDetail.forEach(d => missing.push(`• ${d}`));
      }
    }

    // ¿Hay faltantes?
    if (missing.length) {
      setFieldErrors(nextFlags);
      setEditorErrors(editorDetail);

      // Construye mensaje con viñetas limpias (sin duplicar bullets)
      const bullets = missing.map(m => (m.startsWith('• ') ? m : `• ${m}`)).join('\n');
      Alert.alert('Revisa el contenido', `Faltan datos en la selección del reto:\n\n${bullets}`);
      return;
    }

    // Si todo ok, armamos config y enviamos
    const config = handle!.getConfig();

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
      Alert.alert('Error','No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  // Helpers para estilos con error
  const labelStyle = (flag?: boolean) => [g.text.smallStrong, flag ? { color: ERROR_COLOR } : null];
  const inputStyle = (flag?: boolean) => [
    s.input,
    { marginTop: 6, borderColor: flag ? ERROR_COLOR : (colors.inputBorder ?? colors.outline) }
  ];
  const chipWrapStyle = (flag?: boolean) => ({
    borderColor: flag ? ERROR_COLOR : colors.outline,
  });
  const sectionTitleStyle = (flag?: boolean) => [g.text.smallStrong, { marginTop: 12, color: flag ? ERROR_COLOR : g.text.smallStrong.color }];

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
              <Text style={labelStyle(fieldErrors.nombre)}>Nombre del tema</Text>
              <TextInput
                  value={nombre}
                  onChangeText={(v) => { setNombre(v); if (fieldErrors.nombre && v.trim()) setFieldErrors(f => ({ ...f, nombre: false })); }}
                  placeholder="Nombre de tema"
                  placeholderTextColor={colors.mutedText}
                  style={inputStyle(fieldErrors.nombre)}
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
              <Text style={sectionTitleStyle(fieldErrors.inicio || fieldErrors.fin)}>Fechas</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Pressable
                    style={[
                      s.dateBtn,
                      { borderColor: (fieldErrors.inicio ? ERROR_COLOR : colors.inputBorder), backgroundColor: colors.card }
                    ]}
                    onPress={() => openPicker('inicio')}
                >
                  <Ionicons name="calendar" size={16} color={colors.mutedText} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={g.text.caption}>Inicio</Text>
                    <Text style={[g.text.bodyStrong, fieldErrors.inicio ? { color: ERROR_COLOR } : null]}>{pretty(inicio)}</Text>
                  </View>
                </Pressable>

                <Pressable
                    style={[
                      s.dateBtn,
                      { borderColor: (fieldErrors.fin ? ERROR_COLOR : colors.inputBorder), backgroundColor: colors.card }
                    ]}
                    onPress={() => openPicker('fin')}
                >
                  <Ionicons name="calendar" size={16} color={colors.mutedText} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={g.text.caption}>Fin</Text>
                    <Text style={[g.text.bodyStrong, fieldErrors.fin ? { color: ERROR_COLOR } : null]}>{pretty(fin)}</Text>
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
              <Text style={sectionTitleStyle(fieldErrors.cargos)}>Asignar a cargos</Text>
              {cargandoCargos ? (
                  <View style={{ paddingVertical: 10 }}><ActivityIndicator color={colors.text} /></View>
              ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {cargos.map(cg => {
                      const selected = selCargoIds.includes(cg.id);
                      const borderColor = selected ? colors.primary : (fieldErrors.cargos ? ERROR_COLOR : colors.outline);
                      const bgColor = selected ? (colors.primary + '20') : colors.mutedBg;
                      return (
                          <Pressable
                              key={cg.id}
                              onPress={() => {
                                toggleCargo(cg.id);
                                if (fieldErrors.cargos) setFieldErrors(f => ({ ...f, cargos: false }));
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 12,
                                height: 36,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor,
                                backgroundColor: bgColor,
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
              {fieldErrors.cargos && (
                  <Text style={[g.text.caption, { color: ERROR_COLOR, marginTop: 6 }]}>
                    Debes seleccionar al menos un cargo.
                  </Text>
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
              <Text style={sectionTitleStyle(fieldErrors.editor)}>
                {tipo === 'quiz' ? 'Contenido del Quiz' : tipo === 'form' ? 'Contenido del Checklist' : 'Contenido del Archivo'}
              </Text>
              {tipo === 'quiz' && (
                  <QuizRetoEditor key="crear" ref={quizRef} colors={colors} g={g} />
              )}
              {tipo === 'form' && (
                  <ChecklistRetoEditor ref={checklistRef} colors={colors} g={g} />
              )}
              {tipo === 'archivo' && <ArchivoRetoEditor ref={archivoRef} colors={colors} g={g} />}

              {fieldErrors.editor && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={[g.text.caption, { color: ERROR_COLOR }]}>
                      Revisa el contenido. {editorErrors.length ? 'Faltan:' : ''}
                    </Text>
                    {editorErrors.map((e, i) => (
                        <Text key={i} style={[g.text.caption, { color: ERROR_COLOR }]}>• {e}</Text>
                    ))}
                  </View>
              )}

              {/* Acciones */}
              <View style={{ marginTop: 16, gap: 10 }}>
                <Pressable
                    style={[s.primaryBtn, { backgroundColor: colors.primary, alignItems:'center', justifyContent:'center' }]}
                    onPress={crear}
                    disabled={cargando}
                >
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </FadeWrapper>
  );
}
