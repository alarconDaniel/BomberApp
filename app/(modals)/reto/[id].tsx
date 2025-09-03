// app/(modals)/reto/[id].tsx
import React, {useEffect, useMemo, useState} from 'react';
import {
    View, Text, Pressable, ActivityIndicator, SafeAreaView,
    StyleSheet, ScrollView, TextInput, Alert
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {FontAwesome5} from '@expo/vector-icons';
import dayjs from 'dayjs';

import {useAuth} from '../../../auth/AuthContext';
import {markModalClosed} from '../../../navigation/ModalTracker';
import {useMarkModalOnClose} from "../../../navigation/useMarkModalOnClose";
import {useTheme} from '../../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../../theme/GlobalStyles';
import {Reto} from '../../../models/Reto';

/** ─────────────────────────────────────────────────
 *  Tipos (modelo UI)
 *  ───────────────────────────────────────────────── */
type Pregunta = {
    codPregunta: number;
    numero: number;
    enunciado: string;
    tipo: 'abcd' | 'rellenar' | 'emparejar' | 'reporte';
    puntos: number;
    tiempoMax: number;
    opciones?: { codOpcion: number; texto: string; correcta: number }[];
    items?: { codItem: number; lado: 'A' | 'B'; contenido: string }[];
    parejas?: { a: number; b: number }[];
    reporte?: { instrucciones: string; tipos: string };
};

type RetoFull = {
    reto: Reto;
    tipoReto: 'quiz' | 'form' | 'checklist';
    quiz?: { preguntas: Pregunta[] };
    form?: any;
    metadataReto?: any;   // JSON que define el schema
};

type InstanciaUR = {
    codUsuarioReto: number;
    estado: 'asignado' | 'en_progreso' | 'abandonado' | 'completado' | 'vencido';
    fechaObjetivo?: string | null;
    ventanaInicio?: string | null;
    ventanaFin?: string | null;
};

/** Checklists “por grupos” */
type ItemDef = {
    n: number;
    grupo: string;
    texto: string;
    selector: 'brm' | 'sino' | 'volts' | 'ohms';
    required?: boolean;
};
type ItemValor = {
    n: number;
    selector: ItemDef['selector'];
    valor?: string | number | null;   // "B" | "R" | "M" | "SI" | "NO" | número
    observacion?: string;
};

/** Form genérico */
type PrimitiveField = {
    type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'file';
    label?: string;
    required?: boolean;
    options?: string[];    // para 'select'
    accept?: string[];     // para 'file' (informativo)
};
type ArrayField = {
    type: 'array';
    label?: string;
    item: Record<string, PrimitiveField>; // fila es un objeto de campos primitivos
    required?: boolean;                    // si la lista como tal es obligatoria (min 1)
};
type AnyField = PrimitiveField | ArrayField | Record<string, any>; // grupos (objetos sin "type")

/** ─────────────────────────────────────────────────
 *  Utilidades
 *  ───────────────────────────────────────────────── */
const asJson = (body: unknown) => ({
    method: 'POST' as const,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body ?? {})
});
const s10 = (d?: string | null) => (d ?? '').slice(0, 10);

const nowHHmm = () => dayjs().format('HH:mm');
const todayYMD = () => dayjs().format('YYYY-MM-DD');

const humanTitle = (k: string) =>
    k.replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

/** Heurística: ¿es checklist agrupado? */
const isGroupedChecklist = (meta: any): boolean => {
    const items = meta?.schema?.items;
    if (!Array.isArray(items)) return false;
    return items.every((x: any) =>
        x && typeof x === 'object' &&
        Number.isFinite(+x.n) && !!x.grupo && !!x.texto && !!x.selector
    );
};

/** Inicializa valores para form genérico */
const initGenericValues = (schemaObj: Record<string, AnyField>) => {
    const out: any = {};
    for (const [k, def] of Object.entries(schemaObj || {})) {
        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            if (t === 'array') out[k] = [];
            else out[k] = '';
            // Autollenados básicos por nombre
            if (t === 'date' || k.toLowerCase() === 'fecha') out[k] = todayYMD();
            if (k.toLowerCase().includes('hora') && t === 'text') out[k] = nowHHmm();
        } else {
            // Grupo/objeto
            out[k] = initGenericValues(def as any);
        }
    }
    return out;
};

/** Valida form genérico según requireds; retorna faltantes “bonitos” */
const validateGeneric = (
    schemaObj: Record<string, AnyField>,
    values: any,
    path: string[] = []
): string[] => {
    const falt: string[] = [];
    for (const [k, def] of Object.entries(schemaObj || {})) {
        const val = values?.[k];
        const trail = [...path, k];
        const label = (def as any)?.label || humanTitle(k);

        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            const req = !!(def as any).required;

            if (t === 'array') {
                if (req && (!Array.isArray(val) || val.length === 0)) {
                    falt.push(trail.join(' > ') + ' (lista vacía)');
                } else {
                    // validar filas
                    const itemDef = (def as ArrayField).item || {};
                    (val || []).forEach((row: any, idx: number) => {
                        const subFalt = validateGeneric(itemDef as any, row, [...trail, `#${idx + 1}`]);
                        falt.push(...subFalt);
                    });
                }
            } else {
                const v = (val ?? '').toString().trim();
                if (req && !v) falt.push(trail.join(' > '));
            }
        } else {
            // Grupo/objeto
            const subFalt = validateGeneric(def as any, val, trail);
            falt.push(...subFalt);
        }
    }
    return falt;
};

/** ─────────────────────────────────────────────────
 *  UI atómico para selectores de checklist
 *  ───────────────────────────────────────────────── */
function BRMSeg({
                    value, onChange, disabled, colors
                }: {
    value?: 'B' | 'R' | 'M' | null,
    onChange: (v: 'B' | 'R' | 'M') => void,
    disabled?: boolean,
    colors: any
}) {
    const opts: ('B' | 'R' | 'M')[] = ['B', 'R', 'M'];
    return (
        <View style={{flexDirection: 'row', gap: 6}}>
            {opts.map(k => {
                const active = value === k;
                return (
                    <Pressable
                        key={k}
                        disabled={disabled}
                        onPress={() => onChange(k)}
                        style={{
                            paddingVertical: 6, paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: active ? colors.primary : colors.card,
                            borderWidth: 1, borderColor: active ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={{color: active ? '#fff' : colors.text, fontWeight: '700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function SiNoToggle({
                        value, onChange, disabled, colors
                    }: {
    value?: 'SI' | 'NO' | null,
    onChange: (v: 'SI' | 'NO') => void,
    disabled?: boolean,
    colors: any
}) {
    return (
        <View style={{flexDirection: 'row', gap: 6}}>
            {(['SI', 'NO'] as const).map(k => {
                const active = value === k;
                return (
                    <Pressable
                        key={k}
                        disabled={disabled}
                        onPress={() => onChange(k)}
                        style={{
                            paddingVertical: 6, paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: active ? colors.primary : colors.card,
                            borderWidth: 1, borderColor: active ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={{color: active ? '#fff' : colors.text, fontWeight: '700'}}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

/** ─────────────────────────────────────────────────
 *  Pantalla
 *  ───────────────────────────────────────────────── */
export default function DetalleRetoScreen() {
    useMarkModalOnClose();
    const {colors, isDark} = useTheme();
    const g = makeGlobalStyles(colors);
    const styles = useMemo(() => StyleSheet.create({
        safe: {flex: 1, backgroundColor: isDark ? colors.bg : '#fff'},
        headerRow: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8},
        backBtn: {flexDirection: 'row', alignItems: 'center', gap: 8},
        center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
        content: {flex: 1, paddingHorizontal: 16},
        hSep: {height: 1, backgroundColor: colors.divider, marginVertical: 10},
        cellBadge: {
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.divider
        },
        sectionTitle: {marginTop: 18, fontSize: 18, fontWeight: '700', color: colors.text},
        pill: {marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999}
    }), [colors, isDark]);

    const {id, ur: urParam, fecha: fechaParam} = useLocalSearchParams<{ id: string; ur?: string; fecha?: string }>();
    const router = useRouter();
    const {fetchJson} = useAuth();

    const [data, setData] = useState<RetoFull | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [resolviendo, setResolviendo] = useState(false);
    const [codUsuarioReto, setCodUsuarioReto] = useState<number | null>(null);
    const [ur, setUr] = useState<InstanciaUR | null>(null);

    // quiz state
    const [idx, setIdx] = useState(0);
    const [respuestas, setRespuestas] = useState<any>({});
    const preguntaActual = data?.quiz?.preguntas?.[idx];

    // checklist state
    const [headerVals, setHeaderVals] = useState<Record<string, string>>({});
    const [itemsVals, setItemsVals] = useState<ItemValor[]>([]);

    // generic form state
    const [formVals, setFormVals] = useState<any>({});

    /** Carga de reto */
    const cargarReto = async () => {
        try {
            setCargando(true);
            setError(null);
            const api = await fetchJson<any>(`/reto/ver/full/${id}`);
            const reto = Reto.fromApi(api);
            const tipoReto: RetoFull['tipoReto'] = (api.tipoReto ?? 'quiz') as any;

            const meta = api.metadataReto || {};
            const isChecklist = isGroupedChecklist(meta);

            setData({
                reto,
                tipoReto,
                quiz: api.quiz,
                form: api.form ?? meta?.schema,
                metadataReto: meta
            });

            if (isChecklist) {
                const header = meta?.schema?.header ?? {};
                const items: ItemDef[] = (meta?.schema?.items ?? [])
                    .slice()
                    .sort((a: ItemDef, b: ItemDef) => a.n - b.n);

                const hv: Record<string, string> = {};
                Object.keys(header).forEach(k => {
                    hv[k] = '';
                });

                if ('fecha' in header) hv['fecha'] = todayYMD();
                if ('hora-inicio' in header) hv['hora-inicio'] = nowHHmm();
                if ('hora-final' in header) hv['hora-final'] = ''; // se pondrá al enviar

                setHeaderVals(hv);
                setItemsVals(items.map((it: ItemDef) => ({
                    n: it.n, selector: it.selector, valor: null, observacion: ''
                })));
            } else {
                const schemaObj = (meta?.schema || {}) as Record<string, AnyField>;
                const init = initGenericValues(schemaObj);
                setFormVals(init);
            }
        } catch (e: any) {
            setError(e?.message || 'No pudimos cargar el reto');
        } finally {
            setCargando(false);
        }
    };

    /** Carga de tupla usuarios_retos (instancia del día) */
    const cargarUR = async () => {
        try {
            const dia = s10(fechaParam || dayjs().format('YYYY-MM-DD'));
            const rows = await fetchJson<any[]>(`/mis-retos/dia?fecha=${dia}`);
            let row = urParam
                ? rows.find(r => Number(r.codUsuarioReto) === Number(urParam))
                : rows.find(r => Number(r.codReto) === Number(id));
            if (row) {
                setUr({
                    codUsuarioReto: row.codUsuarioReto,
                    estado: row.estado,
                    fechaObjetivo: row.fechaObjetivo,
                    ventanaInicio: row.ventanaInicio,
                    ventanaFin: row.ventanaFin
                });
            } else setUr(null);
        } catch {
            setUr(null);
        }
    };

    useEffect(() => {
        cargarReto();
    }, [id]);
    useEffect(() => {
        cargarUR();
    }, [id, urParam, fechaParam]);

    /** Derivados */
    const hoy = dayjs().format('YYYY-MM-DD');
    const diaModal = s10(fechaParam || hoy);
    const esHoy = diaModal === hoy;

    const estadoVisible = useMemo<'Disponible' | 'Aún no disponible' | 'Vencido' | 'No asignado'>(() => {
        if (!ur) return 'No asignado';
        const ini = s10(ur.ventanaInicio), fin = s10(ur.ventanaFin), obj = s10(ur.fechaObjetivo);
        const ref = hoy;
        if (obj) {
            if (ref < obj) return 'Aún no disponible';
            if (ref > obj) return 'Vencido';
            return 'Disponible';
        }
        if (ini && fin) {
            if (ref < ini) return 'Aún no disponible';
            if (ref > fin) return 'Vencido';
            return 'Disponible';
        }
        return 'No asignado';
    }, [ur, hoy]);

    const puedeResolver = useMemo(() => {
        if (!ur) return false;
        if (!esHoy) return false;
        const isDisponible = estadoVisible === 'Disponible';
        const estadoOk = ur.estado === 'asignado' || ur.estado === 'en_progreso';
        return isDisponible && estadoOk;
    }, [ur, esHoy, estadoVisible]);

    /** Acciones base */
    const empezar = async () => {
        if (!data) return;
        if (!puedeResolver) {
            Alert.alert('No disponible', 'Este reto no es resoluble ahora (no corresponde a hoy o está fuera de su ventana).');
            return;
        }
        try {
            const r = await fetchJson<any>(`/mis-retos/abrir`, asJson({codReto: Number(id)}));
            setCodUsuarioReto(r.codUsuarioReto);
            setResolviendo(true);
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No fue posible abrir el reto');
        }
    };

    /** VALIDACIÓN del checklist + estado del botón */
    const validarChecklist = (): { ok: boolean; faltantes: string[] } => {
        const schema = data?.metadataReto?.schema ?? {};
        const header = schema.header ?? {};
        const items: ItemDef[] = schema.items ?? [];

        const falt: string[] = [];

        // header
        Object.entries(header).forEach(([k, def]: any) => {
            const req = !!def.required;
            const v = (headerVals[k] ?? '').toString().trim();
            if (k === 'hora-final') return; // se sella al enviar
            if (req && !v) falt.push(`Header: ${def.label ?? k}`);
        });

        // items
        const mapByN = new Map<number, ItemValor>();
        itemsVals.forEach(it => mapByN.set(it.n, it));

        for (const it of items) {
            const v = mapByN.get(it.n);
            const label = `${it.n}. ${it.grupo} – ${it.texto}`;
            if (it.required) {
                if (!v) {
                    falt.push(label);
                    continue;
                }
                const s = (v.valor ?? '').toString().toUpperCase();
                if (it.selector === 'volts' || it.selector === 'ohms') {
                    const num = Number(v.valor);
                    if (!isFinite(num)) falt.push(`${label} (${it.selector === 'volts' ? 'Volts' : 'Ohmios'})`);
                } else if (it.selector === 'brm') {
                    if (!['B', 'R', 'M'].includes(s)) falt.push(label);
                } else if (it.selector === 'sino') {
                    if (!['SI', 'NO'].includes(s)) falt.push(label);
                }
            }
        }

        return {ok: falt.length === 0, faltantes: falt};
    };

    const {ok: checklistOK} = useMemo(() => validarChecklist(), [headerVals, itemsVals, data?.metadataReto]);
    const [formOK, setFormOK] = useState<boolean>(true);

    useEffect(() => {
        const isChecklist = isGroupedChecklist(data?.metadataReto);
        if (!data || isChecklist) return;
        const schemaObj = (data?.metadataReto?.schema || {}) as Record<string, AnyField>;
        const falt = validateGeneric(schemaObj, formVals);
        setFormOK(falt.length === 0);
    }, [data?.metadataReto, formVals]);

    /** Envío (sella hora-final para checklist) */
    const enviarFormulario = async () => {
        if (!data || !codUsuarioReto) return;

        const isChecklist = isGroupedChecklist(data?.metadataReto);

        if (isChecklist) {
            const {ok, faltantes} = validarChecklist();
            if (!ok) {
                Alert.alert('Faltan campos', `Por favor completa:\n\n• ${faltantes.join('\n• ')}`);
                return;
            }
            const snapshot = {
                kind: 'groupedChecklist',
                header: {
                    ...headerVals,
                    ...(('hora-final' in (data?.metadataReto?.schema?.header ?? {})) ? {'hora-final': nowHHmm()} : {})
                },
                items: itemsVals
            };
            try {
                const r = await fetchJson(`/mis-retos/${codUsuarioReto}/form/enviar`,
                    asJson({codUsuarioReto, codReto: data.reto.codReto, data: snapshot})
                );
                Alert.alert('¡Listo!', `Formulario enviado ✅\n+${r.xpGanada} XP, +${r.coins} monedas`);
                markModalClosed();
                router.back();
            } catch (e: any) {
                Alert.alert('Ups', e?.message || 'No pudimos enviar el formulario');
            }
            return;
        }

        // Form genérico
        const schemaObj = (data?.metadataReto?.schema || {}) as Record<string, AnyField>;
        const falt = validateGeneric(schemaObj, formVals);
        if (falt.length > 0) {
            Alert.alert('Faltan campos', `Por favor completa:\n\n• ${falt.join('\n• ')}`);
            return;
        }
        const snapshot = {kind: 'genericForm', data: formVals};
        try {
            const r = await fetchJson(`/mis-retos/${codUsuarioReto}/form/enviar`,
                asJson({codUsuarioReto, codReto: data.reto.codReto, data: snapshot})
            );
            Alert.alert('¡Listo!', `Formulario enviado ✅\n+${r.xpGanada} XP, +${r.coins} monedas`);
            markModalClosed();
            router.back();
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos enviar el formulario');
        }
    };

    /** Quiz renderers (compat) */
    const setResp = (codPregunta: number, v: any) =>
        setRespuestas((s: any) => ({...s, [codPregunta]: v}));

    const renderABCD = (q: Pregunta) => (
        <View style={{marginTop: 12}}>
            {q.opciones?.map(op => {
                const sel: number[] = respuestas[q.codPregunta]?.abcd ?? [];
                const checked = sel.includes(op.codOpcion);
                return (
                    <Pressable key={op.codOpcion} onPress={() => {
                        const cur = new Set(sel);
                        if (cur.has(op.codOpcion)) cur.delete(op.codOpcion); else cur.add(op.codOpcion);
                        setResp(q.codPregunta, {abcd: Array.from(cur)});
                    }} style={{
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: checked ? colors.primary : colors.divider,
                        marginBottom: 8
                    }}>
                        <Text style={{color: colors.text}}>{op.texto}</Text>
                    </Pressable>
                );
            })}
        </View>
    );

    const renderRellenar = (q: Pregunta) => (
        <TextInput
            placeholder="Tu respuesta"
            placeholderTextColor={colors.mutedText}
            value={respuestas[q.codPregunta]?.rellenar ?? ''}
            onChangeText={(t) => setResp(q.codPregunta, {rellenar: t})}
            style={{
                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                padding: 10, color: colors.text, marginTop: 8
            }}
        />
    );

    const renderEmparejar = (_q: Pregunta) => (
        <Text style={[g.text.caption, {marginTop: 8}]}>
            Para emparejar usa el campo de texto (ej: 1-6,2-5,3-4). En producción puedes poner un UI drag&drop.
        </Text>
    );

    const responderYAvanzar = async () => {
        if (!data || !preguntaActual || !codUsuarioReto) return;
        const valor = respuestas[preguntaActual.codPregunta] ?? null;
        try {
            await fetchJson(`/mis-retos/${codUsuarioReto}/quiz/responder`,
                asJson({codUsuarioReto, codPregunta: preguntaActual.codPregunta, valor, tiempoSeg: null})
            );
            if (idx + 1 < (data.quiz?.preguntas?.length ?? 0)) setIdx(idx + 1);
            else Alert.alert('Listo', 'Has respondido todas las preguntas. Pulsa Finalizar para cerrar.');
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos guardar tu respuesta');
        }
    };

    const finalizar = async () => {
        if (!codUsuarioReto) return;
        try {
            const r = await fetchJson<any>(`/mis-retos/${codUsuarioReto}/finalizar`, asJson({codUsuarioReto}));
            Alert.alert('Reto completado', `+${r.xpGanada} XP, +${r.coins} monedas`);
            markModalClosed();
            router.back();
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos finalizar');
        }
    };

    /** Render header del checklist */
    const renderChecklistHeader = () => {
        const schema = data?.metadataReto?.schema ?? {};
        const header = schema.header ?? {};
        const entries = Object.entries(header) as [string, any][];

        return (
            <View style={{marginTop: 8}}>
                <Text style={[g.text.h2]}>Encabezado</Text>
                {entries.map(([k, def]) => {
                    const isFecha = k === 'fecha';
                    const isHoraIni = k === 'hora-inicio';
                    const isHoraFin = k === 'hora-final';
                    const disabled = isFecha || isHoraIni || isHoraFin;

                    return (
                        <View key={k} style={{marginTop: 10}}>
                            <Text style={g.text.bodyStrong}>
                                {def.label ?? k}{def.required ? ' *' : ''}
                            </Text>
                            <TextInput
                                editable={!disabled}
                                placeholder={isHoraFin ? '(se asignará al enviar)' : (def.label ?? k)}
                                placeholderTextColor={colors.mutedText}
                                value={headerVals[k] ?? ''}
                                onChangeText={(t) => setHeaderVals(s => ({...s, [k]: t}))}
                                style={{
                                    borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                    padding: 10, color: colors.text, marginTop: 8,
                                    backgroundColor: disabled ? colors.mutedBg : 'transparent'
                                }}
                            />
                            {isHoraFin && (
                                <Text style={[g.text.caption, {marginTop: 4, color: colors.mutedText}]}>
                                    La hora final se asignará al enviar.
                                </Text>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    /** Render por GRUPOS de checklist */
    const renderChecklistItems = () => {
        const schema = data?.metadataReto?.schema ?? {};
        const defsAll: ItemDef[] = (schema.items ?? []).slice().sort((a: ItemDef, b: ItemDef) => a.n - b.n);

        // Agrupar por grupo
        const grupos = defsAll.reduce<Record<string, ItemDef[]>>((acc, it) => {
            acc[it.grupo] = acc[it.grupo] || [];
            acc[it.grupo].push(it);
            return acc;
        }, {});

        const setItem = (n: number, patch: Partial<ItemValor>) => {
            setItemsVals(prev => {
                const found = prev.find(it => it.n === n);
                if (!found) return [...prev, {
                    n,
                    selector: patch.selector as any ?? 'brm',
                    valor: patch.valor ?? null,
                    observacion: patch.observacion ?? ''
                }];
                return prev.map(it => it.n === n ? ({...it, ...patch}) : it);
            });
        };

        const SectionHeaderRow = () => (
            <View style={{flexDirection: 'row', gap: 6, marginTop: 10}}>
                <View style={{width: 46}}><Text style={[g.text.caption, {fontWeight: '700'}]}>Item</Text></View>
                <View style={{flex: 2.2}}><Text style={[g.text.caption, {fontWeight: '700'}]}>Seleccione</Text></View>
                <View style={{flex: 1.8}}><Text style={[g.text.caption, {fontWeight: '700'}]}>Observación</Text></View>
            </View>
        );

        const unitLabel = (sel: ItemDef['selector']) =>
            sel === 'volts' ? 'Volts' : sel === 'ohms' ? 'Ohmios' : '';

        return (
            <View style={{marginTop: 18}}>
                {Object.entries(grupos).map(([nombreGrupo, defs]) => (
                    <View key={nombreGrupo} style={{marginBottom: 12}}>
                        <Text style={styles.sectionTitle}>{nombreGrupo}</Text>
                        <SectionHeaderRow/>
                        <View style={styles.hSep}/>

                        {defs.map((def, idx) => {
                            const fallback: ItemValor = {
                                n: def.n,
                                selector: def.selector,
                                valor: null,
                                observacion: ''
                            };
                            const val = itemsVals.find(x => x.n === def.n) ?? fallback;
                            const zebra = (idx % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;
                            return (
                                <View key={def.n} style={[{borderRadius: 10, padding: 8, marginBottom: 6}, zebra]}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                        {/* Item # */}
                                        <View style={{width: 46}}>
                                            <View style={styles.cellBadge}>
                                                <Text style={[g.text.caption, {fontWeight: '700'}]}>{def.n}</Text>
                                            </View>
                                        </View>

                                        {/* Selector */}
                                        <View style={{flex: 2.2}}>
                                            {def.selector === 'brm' && (
                                                <BRMSeg
                                                    value={(val.valor as any) ?? null}
                                                    onChange={(v) => setItem(def.n, {valor: v})}
                                                    colors={colors}
                                                />
                                            )}
                                            {def.selector === 'sino' && (
                                                <SiNoToggle
                                                    value={(val.valor as any) ?? null}
                                                    onChange={(v) => setItem(def.n, {valor: v})}
                                                    colors={colors}
                                                />
                                            )}
                                            {(def.selector === 'volts' || def.selector === 'ohms') && (
                                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                                    <Text style={g.text.body}>{unitLabel(def.selector)}</Text>
                                                    <TextInput
                                                        keyboardType="numeric"
                                                        value={val.valor != null ? String(val.valor) : ''}
                                                        onChangeText={(t) => setItem(def.n, {valor: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                                        placeholder="____"
                                                        placeholderTextColor={colors.mutedText}
                                                        style={{
                                                            minWidth: 90,
                                                            borderWidth: 1,
                                                            borderColor: colors.divider,
                                                            borderRadius: 8,
                                                            paddingVertical: 6,
                                                            paddingHorizontal: 10,
                                                            color: colors.text
                                                        }}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        {/* Observación */}
                                        <View style={{flex: 1.8}}>
                                            <TextInput
                                                placeholder="Observación…"
                                                placeholderTextColor={colors.mutedText}
                                                value={val.observacion ?? ''}
                                                onChangeText={(t) => setItem(def.n, {observacion: t})}
                                                style={{
                                                    borderWidth: 1, borderColor: colors.divider, borderRadius: 8,
                                                    paddingVertical: 6, paddingHorizontal: 8, color: colors.text
                                                }}
                                            />
                                        </View>
                                    </View>

                                    {/* Texto del ítem */}
                                    <View style={{marginTop: 6, paddingLeft: 46}}>
                                        <Text style={g.text.body}>{def.texto}{def.required ? ' *' : ''}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>
        );
    };

    /** Render genérico de formularios (objeto, arrays y campos primitivos) */
    const renderFormField = (
        k: string,
        def: AnyField,
        value: any,
        onChange: (patch: any) => void
    ) => {
        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            const label = (def as any).label || humanTitle(k);
            const required = !!(def as any).required;

            if (t === 'array') {
                const arrVal: any[] = Array.isArray(value) ? value : [];
                const itemDef = (def as ArrayField).item || {};
                const addRow = () => {
                    const emptyRow = initGenericValues(itemDef as any);
                    onChange([...(arrVal || []), emptyRow]);
                };
                const removeRow = (idx: number) => {
                    const next = [...arrVal];
                    next.splice(idx, 1);
                    onChange(next);
                };
                return (
                    <View key={k} style={{marginTop: 18}}>
                        <Text style={[g.text.h3]}>{label}{required ? ' *' : ''}</Text>
                        {(arrVal || []).map((row, idx) => (
                            <View key={idx} style={{
                                marginTop: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: colors.divider,
                                borderRadius: 10
                            }}>
                                <Text style={[g.text.caption, {marginBottom: 6}]}>#{idx + 1}</Text>
                                {Object.entries(itemDef).map(([sk, sdef]) => (
                                    <View key={sk} style={{marginTop: 8}}>
                                        {renderFormField(sk, sdef as any, row?.[sk], (valPatch) => {
                                            const next = [...arrVal];
                                            next[idx] = {...next[idx], [sk]: valPatch};
                                            onChange(next);
                                        })}
                                    </View>
                                ))}
                                <Pressable onPress={() => removeRow(idx)} style={{
                                    marginTop: 10,
                                    alignSelf: 'flex-start',
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 999,
                                    backgroundColor: '#fdecea',
                                    borderWidth: 1,
                                    borderColor: '#f5c6cb'
                                }}>
                                    <Text style={{color: '#842029', fontWeight: '700'}}>Eliminar</Text>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={addRow} style={{
                            marginTop: 10,
                            alignSelf: 'flex-start',
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 999,
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.divider
                        }}>
                            <Text style={g.text.bodyStrong}>Agregar</Text>
                        </Pressable>
                    </View>
                );
            }

            // Campos primitivos
            return (
                <View key={k} style={{marginTop: 10}}>
                    <Text style={g.text.bodyStrong}>{label}{required ? ' *' : ''}</Text>
                    {t === 'textarea' ? (
                        <TextInput
                            multiline
                            placeholder={label}
                            placeholderTextColor={colors.mutedText}
                            value={value ?? ''}
                            onChangeText={(t) => onChange(t)}
                            style={{
                                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8, minHeight: 100, textAlignVertical: 'top'
                            }}
                        />
                    ) : t === 'number' ? (
                        <TextInput
                            keyboardType="numeric"
                            placeholder={label}
                            placeholderTextColor={colors.mutedText}
                            value={value != null ? String(value) : ''}
                            onChangeText={(t) => onChange(t.replace(',', '.').replace(/[^\d.]/g, ''))}
                            style={{
                                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8
                            }}
                        />
                    ) : t === 'select' ? (
                        <TextInput
                            placeholder={(def as PrimitiveField).options?.join(' | ') || label}
                            placeholderTextColor={colors.mutedText}
                            value={value ?? ''}
                            onChangeText={(t) => onChange(t)}
                            style={{
                                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8
                            }}
                        />
                    ) : t === 'file' ? (
                        <TextInput
                            placeholder={(def as PrimitiveField).accept ? `Archivo (${(def as PrimitiveField).accept?.join(', ')})` : label}
                            placeholderTextColor={colors.mutedText}
                            value={value ?? ''}
                            onChangeText={(t) => onChange(t)}
                            style={{
                                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8
                            }}
                        />
                    ) : (
                        <TextInput
                            placeholder={label}
                            placeholderTextColor={colors.mutedText}
                            value={value ?? ''}
                            onChangeText={(t) => onChange(t)}
                            style={{
                                borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8
                            }}
                        />
                    )}
                </View>
            );
        }

        // Grupo/objeto (sub-sección)
        const groupObj = def as Record<string, AnyField>;
        return (
            <View key={k} style={{marginTop: 18}}>
                <Text style={[g.text.h2]}>{humanTitle(k)}</Text>
                {Object.entries(groupObj).map(([sk, sdef]) => (
                    <View key={sk}>
                        {renderFormField(sk, sdef as any, value?.[sk], (newVal) => {
                            setFormVals((prev: any) => ({
                                ...prev,
                                [k]: {...(prev?.[k] || {}), [sk]: newVal}
                            }));
                        })}
                    </View>
                ))}
            </View>
        );
    };

    const renderGenericForm = () => {
        const schemaObj = (data?.metadataReto?.schema || {}) as Record<string, AnyField>;
        if (!schemaObj || Object.keys(schemaObj).length === 0) {
            return <Text style={[g.text.caption, {marginTop: 12}]}>Este reto usa un esquema genérico sin campos.</Text>;
        }
        return (
            <View style={{marginTop: 8}}>
                {Object.entries(schemaObj).map(([k, def]) => (
                    <View key={k}>
                        {renderFormField(k, def, formVals?.[k], (newVal: any) => {
                            setFormVals((prev: any) => ({...prev, [k]: newVal}));
                        })}
                    </View>
                ))}
            </View>
        );
    };

    /** Layout principal */
    const isChecklist = isGroupedChecklist(data?.metadataReto);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.headerRow}>
                <Pressable onPress={() => {
                    markModalClosed();
                    router.back();
                }} style={styles.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text}/>
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary}/>
                    <Text style={[g.text.caption, {marginTop: 10}]}>Cargando reto…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[g.text.body, g.text.danger, {textAlign: 'center', marginBottom: 12}]}>{error}</Text>
                    <Pressable onPress={() => router.back()}
                               style={{padding: 10, backgroundColor: colors.mutedBg, borderRadius: 10}}>
                        <Text style={g.text.body}>OK</Text>
                    </Pressable>
                </View>
            ) : !data ? (
                <View style={styles.center}>
                    <Text style={g.text.body}>No encontramos el reto. Un labubu curioso se lo llevó 🐾</Text>
                </View>
            ) : !resolviendo ? (
                <ScrollView style={{paddingHorizontal: 16}}>
                    <Text style={[g.text.h1, {marginTop: 20}]}>{data.reto.nombreReto}</Text>
                    <Text style={[g.text.body, g.text.secondary, {
                        marginTop: 8,
                        fontSize: 16
                    }]}>{data.reto.descripcionReto}</Text>

                    <View style={{marginTop: 12}}>
                        <Text style={g.text.body}>
                            <Text
                                style={g.text.bodyStrong}>Tipo: </Text>{(data.tipoReto ?? 'form').toUpperCase()} ·{' '}
                            <Text style={g.text.bodyStrong}>Tiempo
                                estimado:</Text> {Math.round((data.reto.tiempoEstimadoSegReto ?? 0) / 60)} min
                        </Text>
                    </View>

                    <View style={[styles.pill, {
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.divider
                    }]}>
                        <Text style={g.text.caption}>
                            Ventana: {ur?.fechaObjetivo ? s10(ur.fechaObjetivo) : `${s10(ur?.ventanaInicio)}  →  ${s10(ur?.ventanaFin)}`}
                        </Text>
                    </View>

                    <View style={[
                        styles.pill,
                        {
                            backgroundColor: estadoVisible === 'Disponible' ? '#e8f5e9' : estadoVisible === 'Aún no disponible' ? '#fff4e5' : estadoVisible === 'Vencido' ? '#fdecea' : colors.card,
                            borderWidth: 1,
                            borderColor: estadoVisible === 'Disponible' ? '#a5d6a7' : estadoVisible === 'Aún no disponible' ? '#ffd8a8' : estadoVisible === 'Vencido' ? '#f5c6cb' : colors.divider
                        }
                    ]}>
                        <Text
                            style={{color: estadoVisible === 'Disponible' ? '#1b5e20' : estadoVisible === 'Aún no disponible' ? '#8a4b08' : estadoVisible === 'Vencido' ? '#842029' : colors.text}}>
                            Estado del reto (hoy): {estadoVisible}
                        </Text>
                    </View>

                    {ur && !esHoy && (
                        <Text style={[g.text.caption, {marginTop: 10}]}>
                            Este reto corresponde a {diaModal}. No se puede resolver fuera de su día.
                        </Text>
                    )}

                    {puedeResolver && (
                        <Pressable
                            style={{
                                marginTop: 18,
                                paddingVertical: 14,
                                paddingHorizontal: 28,
                                backgroundColor: isDark ? colors.primary : '#001780',
                                borderRadius: 999,
                                alignSelf: 'center'
                            }}
                            onPress={empezar}
                        >
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Resolver</Text>
                        </Pressable>
                    )}
                </ScrollView>
            ) : (
                <View style={{flex: 1, paddingHorizontal: 16, paddingBottom: 24}}>

                    <View style={{marginHorizontal: -16, backgroundColor: colors.cardTint, alignItems: 'center',}}>
                        <Text style={[g.text.h2, {paddingVertical: 20, paddingHorizontal: 16, textAlign: "center"},]}>
                            Resolución de {data?.reto?.nombreReto}
                        </Text>
                    </View>

                    {/* Checklist agrupado (Torre Grúa / Elevador) */}
                    {isChecklist ? (
                        <ScrollView>
                            {renderChecklistHeader()}
                            {renderChecklistItems()}
                            <Pressable
                                onPress={enviarFormulario}
                                disabled={!checklistOK}
                                style={{
                                    marginTop: 18, paddingVertical: 14, paddingHorizontal: 28,
                                    backgroundColor: checklistOK ? colors.primary : colors.divider,
                                    borderRadius: 999, alignSelf: 'center', opacity: checklistOK ? 1 : 0.6
                                }}
                            >
                                <Text style={[g.text.smallStrong, {color: checklistOK ? '#fff' : colors.mutedText}]}>
                                    {checklistOK ? 'Enviar formulario' : 'Completa los campos obligatorios'}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    ) : (data.tipoReto === 'form' || data.tipoReto === 'checklist') ? (
                        // 🔧 FIX: envolver el form genérico en ScrollView para permitir scroll y agregar filas
                        <ScrollView>
                            {renderGenericForm()}
                            <Pressable
                                onPress={enviarFormulario}
                                disabled={!formOK}
                                style={{
                                    marginTop: 18, marginBottom: 40,
                                    paddingVertical: 14, paddingHorizontal: 28,
                                    backgroundColor: formOK ? colors.primary : colors.divider,
                                    borderRadius: 999, alignSelf: 'center', opacity: formOK ? 1 : 0.6
                                }}
                            >
                                <Text style={[g.text.smallStrong, {color: formOK ? '#fff' : colors.mutedText}]}>
                                    {formOK ? 'Enviar formulario' : 'Completa los campos obligatorios'}
                                </Text>
                            </Pressable>
                        </ScrollView>
                    ) : data.tipoReto === 'quiz' && preguntaActual ? (
                        <ScrollView>
                            <Text style={[g.text.h3, {marginTop: 10}]}>Pregunta {preguntaActual.numero}</Text>
                            <Text style={[g.text.body, {marginTop: 6}]}>{preguntaActual.enunciado}</Text>

                            {preguntaActual.tipo === 'abcd' && renderABCD(preguntaActual)}
                            {preguntaActual.tipo === 'rellenar' && renderRellenar(preguntaActual)}
                            {preguntaActual.tipo === 'emparejar' && renderEmparejar(preguntaActual)}
                            {preguntaActual.tipo === 'reporte' && (
                                <Text style={[g.text.caption, {marginTop: 8}]}>
                                    Este tipo requiere upload de archivo; conecta tu picker y manda metadata al backend.
                                </Text>
                            )}

                            <Pressable onPress={responderYAvanzar}
                                       style={{
                                           marginTop: 18,
                                           paddingVertical: 14,
                                           paddingHorizontal: 28,
                                           backgroundColor: colors.primary,
                                           borderRadius: 999,
                                           alignSelf: 'center'
                                       }}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {idx + 1 < (data.quiz?.preguntas?.length ?? 0) ? 'Guardar y siguiente' : 'Guardar última'}
                                </Text>
                            </Pressable>

                            <Pressable onPress={finalizar}
                                       style={{
                                           marginTop: 14,
                                           paddingVertical: 14,
                                           paddingHorizontal: 28,
                                           backgroundColor: '#198754',
                                           borderRadius: 999,
                                           alignSelf: 'center'
                                       }}>
                                <Text style={{color: '#fff', fontWeight: '700'}}>Finalizar</Text>
                            </Pressable>
                        </ScrollView>
                    ) : null}
                </View>
            )}
        </SafeAreaView>
    );
}
