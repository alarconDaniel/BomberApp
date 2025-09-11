// app/(modals)/reto/editar-reto.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import FadeWrapper from '../../../components/admin/FadeWrapper';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

import QuizRetoEditor from '../../../components/admin/reto/QuizRetoEditor';
import ChecklistRetoEditor from '../../../components/admin/reto/ChecklistRetoEditor';
import ArchivoRetoEditor from '../../../components/admin/reto/ArchivoRetoEditor';
import { EditorHandle } from '../../../components/admin/reto/types';
import { Segment, getStyles, clampInt } from '../../../components/admin/reto/EditorPrimitives';

type TipoReto = 'quiz' | 'form' | 'archivo';
type CargoRow = { id: number; nombre: string };

const MAX_DESC = 255 as const;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const isYYYYMMDD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const pretty = (s: string) => {
    if (!isYYYYMMDD(s)) return s;
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function EditarRetoModal() {
    const { colors } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);
    const s = useMemo(() => getStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { fetchJson } = useAuth();

    const { item } = useLocalSearchParams<{ item?: string }>();
    const [itemParsed, setItemParsed] = useState<any | null>(null);

    const [cargandoInit, setCargandoInit] = useState(false);

    // Base
    const [tipo, setTipo] = useState<TipoReto>('quiz');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [esAutomatico, setEsAutomatico] = useState<boolean>(true);
    const [activo, setActivo] = useState<boolean>(true);

    // Fechas + tiempo
    const hoy = useMemo(() => new Date(), []);
    const [inicio, setInicio] = useState<string>(isoDate(hoy));
    const [fin, setFin] = useState<string>(isoDate(hoy));
    const [tiempoEstimadoMin, setTiempoEstimadoMin] = useState<number>(0);

    const [initialConfig, setInitialConfig] = useState<any>(null);

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

    // Refs a editores
    const quizRef = useRef<EditorHandle>(null);
    const checklistRef = useRef<EditorHandle>(null);
    const archivoRef = useRef<EditorHandle>(null);

    // ============ CARGOS DINÁMICOS ============
    const [cargos, setCargos] = useState<CargoRow[]>([]);
    const [selCargoIds, setSelCargoIds] = useState<number[]>([]);
    const [cargandoCargos, setCargandoCargos] = useState(false);

    // carga/parseo del reto
    useEffect(() => {
        async function hydrate() {
            setCargandoInit(true);
            try {
                let parsed: any = null;
                try { parsed = item ? JSON.parse(item) : null; } catch { parsed = null; }

                // si no vino completo, intenta rutas comunes
                if (!parsed || !parsed.codReto) {
                    const maybeId = parsed?.codReto ?? parsed?.id ?? null;
                    const id = maybeId || null;
                    if (id) {
                        const paths = [
                            `/reto/detalle/${id}`,
                            `/reto/get/${id}`,
                            `/reto/${id}`,
                            `/reto/buscar/${id}`,
                            `/retos/detalle/${id}`,
                            `/retos/${id}`,
                            `/reto/config/${id}`,
                            `/reto/metadata/${id}`,
                        ];
                        for (const p of paths) {
                            try {
                                const resp = await fetchJson<any>(p, { method: 'GET', headers: { Accept: 'application/json' } });
                                if (resp) { parsed = resp?.data ?? resp?.reto ?? resp ?? null; if (parsed) break; }
                            } catch {}
                        }
                    }
                }

                if (!parsed) {
                    Alert.alert('Ups', 'No se pudieron cargar los datos del reto');
                    router.back();
                    return;
                }

                setItemParsed(parsed);

                // base
                setNombre(parsed.nombreReto ?? parsed.nombre_reto ?? '');
                setDescripcion(parsed.descripcionReto ?? parsed.descripcion_reto ?? '');
                setInicio(parsed.fechaInicioReto ?? parsed.fecha_inicio_reto ?? isoDate(hoy));
                setFin(parsed.fechaFinReto ?? parsed.fecha_fin_reto ?? isoDate(hoy));
                setTiempoEstimadoMin(Math.max(0, Math.round(Number(parsed.tiempoEstimadoSegReto ?? 0) / 60)));

                setActivo(!!(parsed?.activo !== 0 && parsed?.activo !== false));
                setEsAutomatico(!!(parsed?.esAutomaticoReto ?? parsed?.es_automatico_reto));

                // tipo + config
                const rawTipo = (parsed?.tipo ?? parsed?.tipoReto ?? parsed?.tipo_reto) as TipoReto | undefined;
                const cfgAny = parsed?.config ?? parsed?.metadataReto ?? parsed?.metadata_reto;
                let kind: string | undefined;
                try { kind = (typeof cfgAny === 'string' ? JSON.parse(cfgAny) : cfgAny)?.kind; } catch { kind = undefined; }

                let t: TipoReto = 'form';
                if (rawTipo === 'quiz') t = 'quiz';
                else if (rawTipo === 'archivo' || kind === 'archivo') t = 'archivo';
                else t = 'form';
                setTipo(t);
                setInitialConfig(typeof cfgAny === 'string' ? JSON.parse(cfgAny) : cfgAny);
            } finally {
                setCargandoInit(false);
            }
        }
        hydrate().catch(() => setCargandoInit(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // carga de cargos + preselección (versión simplificada y determinística)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setCargandoCargos(true);

                // 1) Cargar catálogo de cargos
                const rows: CargoRow[] = await fetchJson('/catalogos/cargos');
                if (!alive) return;
                setCargos(rows || []);

                // 2) Si ya tenemos el id del reto → pedir cargos asignados a ese reto
                const id = itemParsed?.codReto ?? itemParsed?.id ?? null;
                if (!id) {
                    setSelCargoIds([]); // nada que preseleccionar todavía
                    return;
                }

                const asignados: Array<{ id: number; nombre: string }> =
                    await fetchJson(`/reto/${id}/cargos`);

                if (!alive) return;

                const ids = (asignados || [])
                    .map((r) => Number(r?.id))
                    .filter((n) => Number.isFinite(n) && n > 0);

                setSelCargoIds(ids);
            } catch (e: any) {
                Alert.alert('Error', 'No se pudieron cargar los cargos');
            } finally {
                setCargandoCargos(false);
            }
        })();
        return () => { alive = false; };
    }, [fetchJson, itemParsed]);

    const toggleCargo = (id: number) => {
        setSelCargoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const [cargando, setCargando] = useState(false);

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

    function buildPayload(config: any) {
        const tiempoEstimadoSegReto = Math.max(0, Math.floor(Number(tiempoEstimadoMin) * 60));
        const tipoApi: TipoReto = tipo;

        return {
            codReto: itemParsed?.codReto ?? itemParsed?.id,
            nombreReto: nombre.trim(),
            descripcionReto: (descripcion ?? '').trim(),
            tiempoEstimadoSegReto,
            fechaInicioReto: inicio,
            fechaFinReto: fin,

            // >>> clave: multi-cargos desde BD
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

    const guardar = async () => {
        if (!itemParsed?.codReto && !itemParsed?.id) {
            Alert.alert('Ups', 'Falta el identificador del reto');
            return;
        }
        if (!validarFechas()) return;
        if (!selCargoIds.length) {
            Alert.alert('Asignación requerida', 'Selecciona al menos un cargo para este reto.');
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
            // 1) Cabecera + cargos
            await fetchJson('/reto/modificar', {
                method: 'PUT',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload(config)),
            });

            // 2) Si es quiz, sobrescribe preguntas
            if (tipo === 'quiz') {
                await fetchJson('/reto/quiz/sobrescribir', {
                    method: 'PUT',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        codReto: itemParsed?.codReto ?? itemParsed?.id,
                        preguntas: config?.preguntas ?? [],
                    }),
                });
            }

            Alert.alert('OK', 'Reto actualizado ✅');
            router.back();
        } catch (e: any) {
            Alert.alert('Error','No se pudo actualizar el reto');
        } finally {
            setCargando(false);
        }
    };

    // si cambian el tipo en edición, advertimos (como antes)
    const onSwitchTipo = (t: TipoReto) => {
        if (t === tipo) return;
        Alert.alert(
            'Cambiar tipo de reto',
            'Esto cambiará el formulario de edición. El contenido no compatible podría descartarse visualmente (tu config original sigue en la DB hasta guardar).',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cambiar', style: 'destructive', onPress: () => { setTipo(t); setInitialConfig(null); } }
            ]
        );
    };

    if (cargandoInit) {
        return (
            <FadeWrapper>
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
                    <View style={{ padding: 24, alignItems: 'center' }}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={[g.text.caption, { marginTop: 8 }]}>Cargando reto…</Text>
                    </View>
                </SafeAreaView>
            </FadeWrapper>
        );
    }

    return (
        <FadeWrapper>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
                {/* Header modal */}
                <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={[g.text.h2, { flex: 1 }]}>Editar reto</Text>
                </View>

                <ScrollView contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={[s.card, { marginTop: 8 }]}>
                        {/* Tipo de reto */}
                        <Text style={g.text.smallStrong}>Tipo de reto</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap:'wrap' }}>
                            <Segment label="Quiz" active={tipo === 'quiz'} onPress={() => onSwitchTipo('quiz')} c={colors} g={g} icon="help-circle" />
                            <Segment label="Checklist" active={tipo === 'form'} onPress={() => onSwitchTipo('form')} c={colors} g={g} icon="checkbox" />
                            <Segment label="Archivo" active={tipo === 'archivo'} onPress={() => onSwitchTipo('archivo')} c={colors} g={g} icon="document" />
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

                        {/* CARGOS DINÁMICOS (multi) */}
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
                                onPress={() => setEsAutomatico(v => !v)}
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
                            <QuizRetoEditor
                                key={`editar-${itemParsed?.codReto ?? 'new'}`}
                                ref={quizRef}
                                colors={colors}
                                g={g}
                                codReto={itemParsed?.codReto}
                                initialConfig={initialConfig?.kind === 'quiz' ? initialConfig : undefined}
                            />
                        )}

                        {tipo === 'form' && (
                            <ChecklistRetoEditor
                                ref={checklistRef}
                                colors={colors}
                                g={g}
                                initialConfig={initialConfig}
                            />
                        )}

                        {tipo === 'archivo' && (
                            <ArchivoRetoEditor
                                ref={archivoRef}
                                colors={colors}
                                g={g}
                                initialConfig={initialConfig?.kind === 'archivo' ? initialConfig : undefined}
                            />
                        )}

                        {/* Acciones */}
                        <View style={{ marginTop: 16, gap: 10 }}>
                            <Pressable style={[s.primaryBtn, { backgroundColor: colors.primary, alignItems:'center', justifyContent:'center' }]} onPress={guardar} disabled={cargando}>
                                {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar cambios</Text>}
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </FadeWrapper>
    );
}
