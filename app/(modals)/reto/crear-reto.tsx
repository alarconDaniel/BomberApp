import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import FadeWrapper from '../../../components/admin/FadeWrapper';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

import type { RetoDTO, Cargo, TipoKey, TipoReto } from '../../(admin)/lib/retos';

const MAX_DESC = 255 as const;
const cargos: Cargo[] = ['Bomberman', 'Gruaman', 'Robin'] as const;

const TIPOS: Record<TipoKey, string> = {
  multiple: 'Opción múltiple',
  match: 'Emparejar',
  fill: 'Rellenar',
};

const FORM_TYPES = ['pdf', 'jpg', 'png', 'docx'] as const;
type FormType = typeof FORM_TYPES[number];
const toFormType = (v: any): FormType | null => {
  const s = String(v).toLowerCase() as FormType;
  return (FORM_TYPES as readonly FormType[]).includes(s) ? s : null;
};

type ParUI = { id: string; izquierda: string; derecha: string };
type ChecklistItem = { id: string; texto: string; obligatorio?: boolean };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const pretty = (s: string) => {
  if (!isYYYYMMDD(s)) return s;
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

type BloquePregunta =
  | {
      kind: 'multiple';
      enunciado: string;
      puntos: number;
      tiempoSeg: number;
      opciones: { id: string; texto: string; correcta?: boolean }[];
      allowMultiple: boolean;
    }
  | {
      kind: 'match';
      enunciado: string;
      puntos: number;
      tiempoSeg: number;
      pares: ParUI[];
    }
  | {
      kind: 'fill';
      enunciado: string;
      puntos: number;
      tiempoSeg: number;
      respuesta: string;
      pista?: string;
    };

export default function CrearRetoModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const { fetchJson } = useAuth();

  // params
  const { mode = 'create', item } = useLocalSearchParams<{ mode?: string; item?: string }>();
  const isEdit = String(mode) === 'edit';
  const itemParsed: RetoDTO | null = useMemo(() => {
    try { return item ? JSON.parse(item) : null; } catch { return null; }
  }, [item]);

  // ===== Form base
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Bomberman');

  // Flags DB
  const [esAutomatico, setEsAutomatico] = useState<boolean>(true);
  const [activo, setActivo] = useState<boolean>(true);

  // Tipo de reto de UI (quiz | form(checklist) | archivo(subida))
  const [tipo, setTipo] = useState<TipoReto>('quiz');

  // Fechas + tiempo estimado (UI en minutos → DB en segundos)
  const hoy = useMemo(() => new Date(), []);
  const porDefectoFin = useMemo(() => new Date(hoy.getTime() + 7 * 86400000), [hoy]);
  const [inicio, setInicio] = useState<string>(isoDate(hoy));
  const [fin, setFin] = useState<string>(isoDate(porDefectoFin));
  const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState<number>(0); // UI en MINUTOS

  // calendario
  const [datePickerVisible, setDatePickerVisible] = useState<boolean>(false);
  const [dateTarget, setDateTarget] = useState<'inicio' | 'fin' | null>(null);

  // QUIZ
  const [bloques, setBloques] = useState<BloquePregunta[]>([
    {
      kind: 'multiple',
      enunciado: '',
      puntos: 1,
      tiempoSeg: 60,
      opciones: [
        { id: 'a', texto: '' },
        { id: 'b', texto: '' },
        { id: 'c', texto: '' },
        { id: 'd', texto: '' },
      ],
      allowMultiple: false,
    },
  ]);
  const addBloque = (kind: TipoKey) => {
    if (kind === 'multiple') {
      setBloques(prev => [...prev, {
        kind: 'multiple', enunciado: '', puntos: 1, tiempoSeg: 60,
        opciones: [{ id: cryptoRandomId(), texto: '' }, { id: cryptoRandomId(), texto: '' }],
        allowMultiple: false,
      }]);
    } else if (kind === 'match') {
      setBloques(prev => [...prev, {
        kind: 'match', enunciado: '', puntos: 1, tiempoSeg: 60,
        pares: [
          { id: cryptoRandomId(), izquierda: '', derecha: '' },
          { id: cryptoRandomId(), izquierda: '', derecha: '' },
        ],
      }]);
    } else {
      setBloques(prev => [...prev, { kind: 'fill', enunciado: '', puntos: 1, tiempoSeg: 60, respuesta: '', pista: '' }]);
    }
  };

  // CHECKLIST (tipo = "form")
  const [checkItems, setCheckItems] = useState<ChecklistItem[]>([
    { id: cryptoRandomId(), texto: '', obligatorio: true },
  ]);

  // ARCHIVO (tipo = "archivo")
  const [formInstr, setFormInstr] = useState<string>('');
  const [formAllowed, setFormAllowed] = useState<FormType[]>(['pdf']);

  const [cargando, setCargando] = useState(false);

  /* ================= Prefill (modo edición) ================= */
  useEffect(() => {
    if (!isEdit || !itemParsed) return;

    setNombre(itemParsed.nombreReto || '');
    setDescripcion(itemParsed.descripcionReto || '');
    setInicio(itemParsed.fechaInicioReto || isoDate(hoy));
    setFin(itemParsed.fechaFinReto || isoDate(porDefectoFin));
    setTiempoEstimadoMin(Math.max(0, Math.round(Number(itemParsed.tiempoEstimadoSegReto ?? 0) / 60))); // sec → min

    // flags
    setEsAutomatico(!!(itemParsed as any)?.esAutomaticoReto || !!(itemParsed as any)?.es_automatico_reto);
    setActivo((itemParsed as any)?.activo !== 0 && (itemParsed as any)?.activo !== false);
    if ((itemParsed as any)?.cargo) setCargo(((itemParsed as any).cargo as string) || 'Bomberman');

    // Resolver tipo desde tipoReto + metadata.kind
    const cfgAny = (itemParsed as any)?.config ?? (itemParsed as any)?.metadataReto ?? (itemParsed as any)?.metadata_reto;
    const rawTipo = (itemParsed as any)?.tipo ?? (itemParsed as any)?.tipoReto ?? (itemParsed as any)?.tipo_reto;
    let kind: string | undefined;
    try { kind = (typeof cfgAny === 'string' ? JSON.parse(cfgAny) : cfgAny)?.kind; } catch {}
    if (rawTipo === 'quiz') setTipo('quiz');
    else if (rawTipo === 'archivo' || kind === 'archivo') setTipo('archivo');
    else setTipo('form');
  }, [isEdit, itemParsed, hoy, porDefectoFin]);

  // Hidratar config según tipo
  useEffect(() => {
    if (!isEdit || !itemParsed) return;
    const cfgAny = (itemParsed as any)?.config ?? (itemParsed as any)?.metadataReto ?? (itemParsed as any)?.metadata_reto;
    if (!cfgAny) return;
    let parsed: any = null;
    try { parsed = typeof cfgAny === 'string' ? JSON.parse(cfgAny) : cfgAny; } catch { parsed = null; }
    if (!parsed) return;

    if (tipo === 'quiz' && Array.isArray(parsed?.bloques)) {
      const mapped: BloquePregunta[] = parsed.bloques.map((b: any, idx: number) => {
        const t = String(b?.tipo || '').toLowerCase();
        if (t === 'multiple') {
          return {
            kind: 'multiple',
            enunciado: String(b.enunciado ?? ''),
            puntos: Number(b.puntos ?? 1),
            tiempoSeg: Number(b.tiempoSeg ?? 60),
            opciones: Array.isArray(b.opciones) ? b.opciones.map((o: any, k: number) => ({
              id: cryptoRandomId() + k,
              texto: String(o?.texto ?? ''),
              correcta: !!o?.correcta,
            })) : [],
            allowMultiple: !!b.allowMultiple,
          };
        }
        if (t === 'match') {
          return {
            kind: 'match',
            enunciado: String(b.enunciado ?? ''),
            puntos: Number(b.puntos ?? 1),
            tiempoSeg: Number(b.tiempoSeg ?? 60),
            pares: Array.isArray(b.pares) ? b.pares.map((p: any, k: number) => ({
              id: cryptoRandomId() + k,
              izquierda: String(p?.a ?? ''),
              derecha: String(p?.b ?? ''),
            })) : [],
          };
        }
        return {
          kind: 'fill',
          enunciado: String(b.enunciado ?? ''),
          puntos: Number(b.puntos ?? 1),
          tiempoSeg: Number(b.tiempoSeg ?? 60),
          respuesta: String(b.respuesta ?? ''),
          pista: b?.pista ? String(b.pista) : undefined,
        };
      });
      if (mapped.length) setBloques(mapped);
    }

    if (tipo === 'form' && Array.isArray(parsed?.items)) {
      const mapped: ChecklistItem[] = parsed.items.map((it: any, k: number) => ({
        id: cryptoRandomId() + k,
        texto: String(it?.texto ?? ''),
        obligatorio: !!it?.obligatorio,
      }));
      if (mapped.length) setCheckItems(mapped);
    }

    if (tipo === 'archivo') {
      if (parsed?.instrucciones) setFormInstr(String(parsed.instrucciones));
      if (Array.isArray(parsed?.tiposPermitidos)) {
        const valid = (parsed.tiposPermitidos as any[]).map(toFormType).filter((x): x is FormType => !!x);
        if (valid.length) setFormAllowed(valid);
      }
    }
  }, [isEdit, itemParsed, tipo]);

  // En creación, no sobre-escribir el flag al cambiar tabs si ya tocaste el toggle
  const [touchedAuto, setTouchedAuto] = useState(false);
  useEffect(() => {
    if (!isEdit && !touchedAuto) {
      if (tipo === 'quiz') setEsAutomatico(true);
      if (tipo === 'form' || tipo === 'archivo') setEsAutomatico(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

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

  function validarPorTipo(): boolean {
    if (tipo === 'quiz') {
      if (bloques.length === 0) {
        Alert.alert('Faltan preguntas', 'Agrega al menos un bloque de pregunta.');
        return false;
      }
    } else if (tipo === 'form') {
      const filled = checkItems.filter(i => i.texto.trim()).length;
      if (filled === 0) {
        Alert.alert('Checklist vacía', 'Agrega al menos un ítem con texto.');
        return false;
      }
    } else if (tipo === 'archivo') {
      if (!formInstr.trim()) {
        Alert.alert('Instrucciones', 'Añade instrucciones para el envío de archivos.');
        return false;
      }
      if (formAllowed.length === 0) {
        Alert.alert('Tipos permitidos', 'Selecciona al menos un tipo de archivo permitido.');
        return false;
      }
    }
    return true;
  }

  /* ============== Build payload (edición y creación) ============== */
  function buildPayloadBase() {
    let config: any = {};
    if (tipo === 'quiz') {
      config = {
        kind: 'quiz',
        bloques: bloques.map((b, i) => b.kind === 'multiple'
          ? {
              tipo: 'multiple',
              numero: i + 1,
              enunciado: b.enunciado,
              puntos: Number(b.puntos) || 1,
              tiempoSeg: Number(b.tiempoSeg) || 60,
              opciones: b.opciones.map(o => ({ texto: o.texto, correcta: !!o.correcta })),
              allowMultiple: !!b.allowMultiple,
            }
          : b.kind === 'match'
          ? {
              tipo: 'match',
              numero: i + 1,
              enunciado: b.enunciado,
              puntos: Number(b.puntos) || 1,
              tiempoSeg: Number(b.tiempoSeg) || 60,
              pares: b.pares
                .filter(p => p.izquierda.trim() && p.derecha.trim())
                .map(p => ({ a: p.izquierda.trim(), b: p.derecha.trim() })),
            }
          : {
              tipo: 'fill',
              numero: i + 1,
              enunciado: b.enunciado,
              puntos: Number(b.puntos) || 1,
              tiempoSeg: Number(b.tiempoSeg) || 60,
              respuesta: b.respuesta.trim(),
              pista: (b.pista || '').trim() || undefined,
            })
      };
    } else if (tipo === 'form') {
      config = {
        kind: 'checklist',
        items: checkItems
          .filter(x => x.texto.trim())
          .map((x, idx) => ({ numero: idx + 1, texto: x.texto.trim(), obligatorio: !!x.obligatorio })),
      };
    } else if (tipo === 'archivo') {
      config = { kind: 'archivo', instrucciones: formInstr.trim(), tiposPermitidos: formAllowed };
    }

    const tiempoEstimadoSegReto = Math.max(0, Math.floor(Number(tiempoEstimadoMin) * 60));
    const tipoApi: 'quiz' | 'form' = (tipo === 'quiz') ? 'quiz' : 'form';

    return {
      nombreReto: nombre.trim(),
      descripcionReto: (descripcion ?? '').trim(),
      tiempoEstimadoSegReto,
      fechaInicioReto: inicio,
      fechaFinReto: fin,
      cargo,
      esAutomaticoReto: !!esAutomatico, // <-- ahora siempre
      activo,

      // ambos campos por compatibilidad
      tipo: tipoApi,
      tipoReto: tipoApi,

      // metadata/config en ambos nombres
      config,
      metadataReto: config,
      metadata_reto: config,
    };
  }

  const crear = async () => {
    if (!nombre.trim()) return Alert.alert('Falta información', 'El nombre del reto es obligatorio');
    if (!validarFechas()) return;
    if (!validarPorTipo()) return;

    const body = buildPayloadBase();
    try {
      setCargando(true);
      await fetchJson('/reto/crear', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      Alert.alert('OK', 'Reto creado correctamente');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || 'No se pudo crear el reto'));
    } finally {
      setCargando(false);
    }
  };

  const guardarCambios = async () => {
    if (!isEdit || !itemParsed) return;
    if (!validarFechas()) return;
    if (!validarPorTipo()) return;

    const base = buildPayloadBase();
    const body = { codReto: itemParsed.codReto, ...base };

    try {
      setCargando(true);
      await fetchJson('/reto/modificar', {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      Alert.alert('OK', 'Reto actualizado');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || 'No se pudo actualizar el reto'));
    } finally {
      setCargando(false);
    }
  };

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
            {/* Tipo de reto */}
            <Text style={g.text.smallStrong}>Tipo de reto</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
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

            {/* Cargo */}
            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Seleccione el cargo</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {cargos.map((c) => (
                <Radio key={c} label={c} selected={cargo === c} onPress={() => setCargo(c)} c={colors} g={g} />
              ))}
            </View>

            {/* Activo */}
            <View style={{ marginTop: 12 }}>
              <Pressable onPress={() => setActivo(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 }}>
                <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>{activo ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}</View>
                <Text style={g.text.body}>Activo</Text>
              </Pressable>
            </View>

            {/* Es automático (visible para TODOS los tipos) */}
            <View style={{ marginTop: 6 }}>
              <Pressable
                onPress={() => { setTouchedAuto(true); setEsAutomatico(v => !v); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 }}
              >
                <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>{esAutomatico ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}</View>
                <Text style={g.text.body}>Es automático</Text>
              </Pressable>
            </View>

            {/* ===== Secciones por tipo ===== */}
            {tipo === 'quiz' && (
              <>
                <Text style={[g.text.smallStrong, { marginTop: 16 }]}>Preguntas del reto (QUIZ)</Text>
                {bloques.map((b, idx) => (
                  <View key={idx} style={s.panel}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={s.panelTitle}>Pregunta {idx + 1} • {TIPOS[b.kind]}</Text>
                      <Pressable onPress={() => setBloques(prev => prev.filter((_, i) => i !== idx))}>
                        <Ionicons name="trash" size={18} color={colors.danger} />
                      </Pressable>
                    </View>

                    <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Enunciado</Text>
                    <TextInput
                      value={b.enunciado}
                      onChangeText={(t) => setBloques(prev => prev.map((x, i) => i === idx ? { ...x, enunciado: t } : x))}
                      placeholder="Escribe el enunciado"
                      placeholderTextColor={colors.mutedText}
                      style={s.input}
                    />

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={g.text.smallStrong}>Puntos</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={String(b.puntos)}
                          onChangeText={(t) => setBloques(prev => prev.map((x, i) => i === idx ? { ...x, puntos: clampInt(t, 1, 999) } : x))}
                          placeholder="1"
                          placeholderTextColor={colors.mutedText}
                          style={s.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={g.text.smallStrong}>Tiempo (seg)</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={String(b.tiempoSeg)}
                          onChangeText={(t) => setBloques(prev => prev.map((x, i) => i === idx ? { ...x, tiempoSeg: clampInt(t, 1, 3600) } : x))}
                          placeholder="60"
                          placeholderTextColor={colors.mutedText}
                          style={s.input}
                        />
                      </View>
                    </View>

                    {b.kind === 'multiple' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Opciones</Text>
                        {b.opciones.map((o, k) => (
                          <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Pressable
                              onPress={() => setBloques(prev => prev.map((x, i) =>
                                i === idx
                                  ? { ...x, opciones: (x as any).opciones.map((y: any) => y.id === o.id ? { ...y, correcta: !y.correcta } : y) }
                                  : x
                              ))}
                              style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}
                            >
                              {o.correcta ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                            </Pressable>
                            <TextInput
                              value={o.texto}
                              onChangeText={(t) => setBloques(prev => prev.map((x, i) =>
                                i === idx
                                  ? { ...x, opciones: (x as any).opciones.map((y: any) => y.id === o.id ? { ...y, texto: t } : y) }
                                  : x
                              ))}
                              placeholder={`Opción ${k + 1}`}
                              placeholderTextColor={colors.mutedText}
                              style={[s.input, { flex: 1 }]}
                            />
                            <Pressable
                              onPress={() => setBloques(prev => prev.map((x, i) =>
                                i === idx ? { ...(x as any), opciones: (x as any).opciones.filter((y: any) => y.id !== o.id) } : x
                              ))}
                              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Ionicons name="remove-circle" size={18} color={colors.danger} />
                            </Pressable>
                          </View>
                        ))}
                        <TouchableOpacity
                          onPress={() => setBloques(prev => prev.map((x, i) =>
                            i === idx ? { ...(x as any), opciones: [...(x as any).opciones, { id: cryptoRandomId(), texto: '' }] } : x
                          ))}
                          activeOpacity={0.9}
                          style={[s.addBtn, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}
                        >
                          <Text style={g.text.bodyStrong}>Añadir opción</Text>
                        </TouchableOpacity>

                        <Pressable
                          onPress={() => setBloques(prev => prev.map((x, i) => i === idx ? { ...(x as any), allowMultiple: !(x as any).allowMultiple } : x))}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}
                        >
                          <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                            {(b as any).allowMultiple ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                          </View>
                          <Text style={g.text.body}>Permitir múltiples respuestas correctas</Text>
                        </Pressable>
                      </View>
                    )}

                    {b.kind === 'match' && (
                      <View style={{ marginTop: 10 }}>
                        {b.pares.map((p, k) => (
                          <View key={p.id} style={s.pairRow}>
                            <TextInput
                              value={p.izquierda}
                              onChangeText={(t) => setBloques(prev => prev.map((x, i) =>
                                i === idx
                                  ? { ...(x as any), pares: (x as any).pares.map((y: any, j: number) => j === k ? { ...y, izquierda: t } : y) }
                                  : x
                              ))}
                              placeholder="Izquierda"
                              placeholderTextColor={colors.mutedText}
                              style={[s.input, { flex: 1 }]}
                            />
                            <Ionicons name="swap-horizontal" size={18} color={colors.mutedText} />
                            <TextInput
                              value={p.derecha}
                              onChangeText={(t) => setBloques(prev => prev.map((x, i) =>
                                i === idx
                                  ? { ...(x as any), pares: (x as any).pares.map((y: any, j: number) => j === k ? { ...y, derecha: t } : y) }
                                  : x
                              ))}
                              placeholder="Derecha"
                              placeholderTextColor={colors.mutedText}
                              style={[s.input, { flex: 1 }]}
                            />
                            <Pressable
                              onPress={() => setBloques(prev => prev.map((x, i) =>
                                i === idx ? { ...(x as any), pares: (x as any).pares.filter((y: any) => y.id !== p.id) } : x
                              ))}
                              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Ionicons name="trash" size={18} color={colors.danger} />
                            </Pressable>
                          </View>
                        ))}
                        <TouchableOpacity
                          onPress={() => setBloques(prev => prev.map((x, i) =>
                            i === idx ? { ...(x as any), pares: [ ...(x as any).pares, { id: cryptoRandomId(), izquierda: '', derecha: '' } ] } : x
                          ))}
                          activeOpacity={0.9}
                          style={[s.addBtn, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}
                        >
                          <Text style={g.text.bodyStrong}>Añadir par</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {b.kind === 'fill' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Respuesta</Text>
                        <TextInput
                          value={b.respuesta}
                          onChangeText={(t) => setBloques(prev => prev.map((x, i) => i === idx ? { ...(x as any), respuesta: t } : x))}
                          placeholder="Palabra correcta"
                          placeholderTextColor={colors.mutedText}
                          style={s.input}
                        />
                        <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Pista (opcional)</Text>
                        <TextInput
                          value={b.pista ?? ''}
                          onChangeText={(t) => setBloques(prev => prev.map((x, i) => i === idx ? { ...(x as any), pista: t } : x))}
                          placeholder="Pista para ayudar"
                          placeholderTextColor={colors.mutedText}
                          style={s.input}
                        />
                      </View>
                    )}
                  </View>
                ))}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Chip label="Añadir • Opción múltiple" onPress={() => addBloque('multiple')} c={colors} g={g} />
                  <Chip label="Añadir • Emparejar" onPress={() => addBloque('match')} c={colors} g={g} />
                  <Chip label="Añadir • Rellenar" onPress={() => addBloque('fill')} c={colors} g={g} />
                </View>
              </>
            )}

            {tipo === 'form' && (
              <>
                <Text style={[g.text.smallStrong, { marginTop: 16 }]}>Ítems del checklist</Text>
                <View style={{ marginTop: 8 }}>
                  {checkItems.map((it, idx) => (
                    <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        value={it.texto}
                        onChangeText={(t) => setCheckItems(prev => prev.map((x, i) => i === idx ? { ...x, texto: t } : x))}
                        placeholder={`Ítem ${idx + 1}`}
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { flex: 1 }]}
                      />
                      <Pressable onPress={() => setCheckItems(prev => prev.map((x, i) => i === idx ? { ...x, obligatorio: !x.obligatorio } : x))} style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                        {it.obligatorio ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                      </Pressable>
                      <Text style={g.text.caption}>Oblig.</Text>
                      <Pressable onPress={() => setCheckItems(prev => prev.filter((_, i) => i !== idx))} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="trash" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setCheckItems(prev => [...prev, { id: cryptoRandomId(), texto: '', obligatorio: false }])} activeOpacity={0.9} style={[s.addBtn, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}>
                  <Text style={g.text.bodyStrong}>Añadir ítem</Text>
                </TouchableOpacity>
              </>
            )}

            {tipo === 'archivo' && (
              <>
                <Text style={[g.text.smallStrong, { marginTop: 16 }]}>Instrucciones</Text>
                <TextInput
                  value={formInstr}
                  onChangeText={setFormInstr}
                  placeholder="Describe qué debe subir el usuario (ej: reporte en PDF con fotos, etc.)"
                  placeholderTextColor={colors.mutedText}
                  style={[s.input, { marginTop: 6 }]}
                />

                <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Tipos de archivo permitidos</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {FORM_TYPES.map(t => {
                    const selected = formAllowed.includes(t);
                    return (
                      <Pressable
                        key={t}
                        onPress={() => setFormAllowed(prev => selected ? prev.filter(x => x !== t) : [...prev, t])}
                        style={[
                          { paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
                          { backgroundColor: selected ? colors.primary : colors.mutedBg, borderColor: selected ? colors.primary : colors.outline }
                        ]}
                      >
                        <Text style={selected ? g.text.onPrimary : g.text.smallStrong}>{t.toUpperCase()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[g.text.caption, { marginTop: 6, color: colors.mutedText }]}>
                  Coincide con tu DB: SET('pdf','jpg','png','docx')
                </Text>
              </>
            )}

            {/* Acciones */}
            <View style={{ marginTop: 16, gap: 10 }}>
              {!isEdit ? (
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={crear} disabled={cargando} activeOpacity={0.9}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]} onPress={guardarCambios} disabled={cargando} activeOpacity={0.9}>
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar cambios</Text>}
                </TouchableOpacity>
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
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? c.primary : c.inputBorder, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
      </View>
      <Text style={g.text.body}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, onPress, c, g }: { label: string; onPress?: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' }, { backgroundColor: c.mutedBg, borderColor: c.outline }]}>
      <Text style={[g.text.smallStrong]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Segment({ label, active, onPress, c, g, icon }:{
  label: string; active: boolean; onPress: () => void;
  c: any; g: ReturnType<typeof makeGlobalStyles>;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable onPress={onPress} style={[{ paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' }, { backgroundColor: active ? c.primary : c.mutedBg, borderColor: active ? c.primary : c.outline }]} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Ionicons name={icon} size={14} color={active ? '#fff' : c.text} /> : null}
        <Text style={active ? g.text.onPrimary : g.text.smallStrong}>{label}</Text>
      </View>
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
    panel: {
      marginTop: 12, padding: 12, backgroundColor: c.cardTint, borderRadius: 12,
      borderWidth: 1, borderColor: c.tabBorder,
    },
    panelTitle: { fontWeight: '800', color: c.text, marginBottom: 8 },
    check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.inputBorder },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    addBtn: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1 },
    primaryBtn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dateBtn: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row' },
  });
}

// utils
function clampInt(v: string, min: number, max: number) {
  const n = Math.max(min, Math.min(max, parseInt(v || '0', 10) || min));
  return n;
}
function cryptoRandomId() {
  try {
    // @ts-ignore
    const arr = new Uint32Array(1);
    // @ts-ignore
    globalThis.crypto?.getRandomValues?.(arr);
    // @ts-ignore
    return 'id' + (arr[0] || Math.floor(Math.random() * 1e9)).toString(16);
  } catch {
    return 'id' + Math.floor(Math.random() * 1e9).toString(16);
  }
}
