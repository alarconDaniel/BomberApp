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

/** Definiciones para checklists agrupados */
type ColumnDef = {
    key: string;           // p.ej. 'valor' | 'estado' | 'observacion' | 'buenas' | 'malas'
    label?: string;        // p.ej. 'Seleccione', 'CANT'
    selectorType?: 'auto' | 'brm' | 'sino' | 'volts' | 'ohms' | 'brmna' | 'ac' | 'qty';
    type?: string;         // compat
};

type ItemDef = {
    n: number;
    grupo: string;
    texto: string;
    selector?: 'brm' | 'sino' | 'volts' | 'ohms' | 'brmna' | 'qty';
    required?: boolean;
    estado?: boolean;
    codigo?: string;
};

type ItemValor = {
    n: number;
    valor?: string | number | null;
    estado?: 'A' | 'C' | null;
    observacion?: string;
    __selectorAuto?: ItemDef['selector'];
    [key: string]: any; // permite 'buenas', 'malas', etc.
};

/** Form genérico */
type PrimitiveField = {
    type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'file';
    label?: string;
    required?: boolean;
    options?: string[];
    accept?: string[];
};
type ArrayField = {
    type: 'array';
    label?: string;
    item: Record<string, PrimitiveField>;
    required?: boolean;
};
type AnyField = PrimitiveField | ArrayField | Record<string, any>;

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
        Number.isFinite(+x.n) && !!x.grupo && !!x.texto
    );
};

/** Lee columnas (con defaults) */
const getColumns = (meta: any): ColumnDef[] => {
    const cols: ColumnDef[] = Array.isArray(meta?.schema?.columns)
        ? meta.schema.columns
        : [
            {key: 'n', label: 'Item'},
            {key: 'valor', label: 'Seleccione', selectorType: 'auto'},
            {key: 'observacion', label: 'Observación'}
        ];
    const hasN = cols.some(c => c.key === 'n');
    const hasObs = cols.some(c => c.key === 'observacion');
    const out: ColumnDef[] = [];
    if (!hasN) out.push({key: 'n', label: 'Item'});
    for (const c of cols) out.push(c);
    if (!hasObs) out.push({key: 'observacion', label: 'Observación'});
    return out;
};

const setAutoSeedForKey = (k: string, t: PrimitiveField['type'] | 'array') => {
    const key = k.toLowerCase();
    if (t === 'date' || key.includes('fecha')) return todayYMD();
    if (key.includes('hora')) return nowHHmm();
    return '';
};

const initGenericValues = (schemaObj: Record<string, AnyField>) => {
    const out: any = {};
    for (const [k, def] of Object.entries(schemaObj || {})) {
        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            if (t === 'array') out[k] = [];
            else out[k] = setAutoSeedForKey(k, t as any);
        } else if (def && typeof def === 'object') {
            out[k] = initGenericValues(def as any);
        }
    }
    return out;
};

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
                    const itemDef = (def as ArrayField).item || {};
                    (val || []).forEach((row: any, idx: number) => {
                        const subFalt = validateGeneric(itemDef as any, row, [...trail, `#${idx + 1}`]);
                        falt.push(...subFalt);
                    });
                }
            } else {
                const isFinalSeal = k.toLowerCase().includes('final');
                const v = (val ?? '').toString().trim();
                if (req && !v && !isFinalSeal) falt.push(trail.join(' > '));
            }
        } else if (def && typeof def === 'object') {
            const subFalt = validateGeneric(def as any, val, trail);
            falt.push(...subFalt);
        }
    }
    return falt;
};

/** ─────────────────────────────────────────────────
 *  UI atómico para selectores
 *  ───────────────────────────────────────────────── */
function BRMSeg({
                    value, onChange, disabled, colors, error
                }: {
    value?: 'B' | 'R' | 'M' | null,
    onChange: (v: 'B' | 'R' | 'M') => void,
    disabled?: boolean,
    colors: any,
    error?: boolean
}) {
    const opts: ('B' | 'R' | 'M')[] = ['B', 'R', 'M'];
    return (
        <View style={{
            flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center',
            borderWidth: error ? 1 : 0, borderColor: error ? '#dc3545' : 'transparent', borderRadius: 10, padding: error ? 4 : 0
        }}>
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
                        <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700' }}>{k}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

function BRMNASeg({
                      value, onChange, disabled, colors, error
                  }: {
    value?: 'B' | 'R' | 'M' | 'NA' | null,
    onChange: (v: 'B' | 'R' | 'M' | 'NA') => void,
    disabled?: boolean,
    colors: any,
    error?: boolean
}) {
    const opts: ('B' | 'R' | 'M' | 'NA')[] = ['B', 'R', 'M', 'NA'];
    return (
        <View
            style={{
                flexDirection: 'row',
                gap: 6,
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                alignSelf: 'center',
                minWidth: 140,
                borderWidth: error ? 1 : 0, borderColor: error ? '#dc3545' : 'transparent', borderRadius: 10, padding: error ? 4 : 0
            }}
        >
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
                        value, onChange, disabled, colors, error
                    }: {
    value?: 'SI' | 'NO' | null,
    onChange: (v: 'SI' | 'NO') => void,
    disabled?: boolean,
    colors: any,
    error?: boolean
}) {
    return (
        <View style={{
            flexDirection: 'row', gap: 6,
            justifyContent: 'center', alignItems: 'center', alignSelf: 'center',
            borderWidth: error ? 1 : 0, borderColor: error ? '#dc3545' : 'transparent', borderRadius: 10, padding: error ? 4 : 0
        }}>
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

/** NUEVO: Estado A/C vertical (A arriba, C abajo) */
function ACToggle({
                      value, onChange, disabled, colors, error
                  }: {
    value?: 'A' | 'C' | null,
    onChange: (v: 'A' | 'C') => void,
    disabled?: boolean,
    colors: any,
    error?: boolean
}) {
    return (
        <View style={{
            flexDirection: 'column', gap: 6,
            borderWidth: error ? 1 : 0, borderColor: error ? '#dc3545' : 'transparent', borderRadius: 10, padding: error ? 4 : 0
        }}>
            {(['A', 'C'] as const).map(k => {
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
                            borderWidth: 1, borderColor: active ? colors.primary : colors.divider,
                            alignItems: 'center'
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
        sectionHeader: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
        sectionBar: { height: 6, borderRadius: 999, backgroundColor: colors.mutedBg, marginLeft: 10, flex: 1 },
        sectionTitle: {marginVertical: 14, fontSize: 18, fontWeight: '700', color: colors.text},
        pill: {marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999},
        obsInput: {
            borderWidth: 1, borderColor: colors.divider, borderRadius: 8,
            paddingVertical: 6, paddingHorizontal: 8, color: colors.text
        }
    }), [colors, isDark]);

    const danger = '#dc3545';

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
    const [columns, setColumns] = useState<ColumnDef[]>([]); // global fallback

    // errores visibles al intentar enviar
    const [showChecklistErrors, setShowChecklistErrors] = useState(false);
    const [showFormErrors, setShowFormErrors] = useState(false);

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
            const checklist = isGroupedChecklist(meta);
            const cols = getColumns(meta);

            setData({
                reto,
                tipoReto,
                quiz: api.quiz,
                form: api.form ?? meta?.schema,
                metadataReto: meta
            });
            setColumns(cols);

            if (checklist) {
                const header = meta?.schema?.header ?? {};
                const items: ItemDef[] = (meta?.schema?.items ?? [])
                    .slice()
                    .sort((a: ItemDef, b: ItemDef) => a.n - b.n);

                const hv: Record<string, string> = {};
                Object.entries(header).forEach(([k, def]: any) => {
                    if (def && typeof def === 'object' && 'type' in def) {
                        const t = (def as any).type;
                        hv[k] = setAutoSeedForKey(k, t);
                    } else {
                        hv[k] = '';
                    }
                });
                for (const k of Object.keys(hv)) {
                    if (k.toLowerCase().includes('final')) hv[k] = '';
                }

                setHeaderVals(hv);
                const initVals: ItemValor[] = items.map((it: ItemDef) => ({
                    n: it.n, valor: null, estado: null, observacion: '', __selectorAuto: it.selector
                }));
                setItemsVals(initVals);

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

    useEffect(() => { cargarReto(); }, [id]);
    useEffect(() => { cargarUR(); }, [id, urParam, fechaParam]);

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

    /** Helpers de validación para checklist con errores detallados */
    const metaColsByGroup = (data?.metadataReto?.schema?.columnsByGroup) || {};
    const getColsForGroup = (groupName: string): ColumnDef[] => {
        const cg = metaColsByGroup?.[groupName];
        if (Array.isArray(cg) && cg.length) return cg;
        return columns;
    };
    const isNumericSelector = (sel?: ColumnDef['selectorType']) =>
        sel === 'volts' || sel === 'ohms' || sel === 'qty';

    const validarChecklistDetallado = () => {
        const schema = data?.metadataReto?.schema ?? {};
        const header = schema.header ?? {};
        const items: ItemDef[] = (schema.items ?? []);
        const falt: string[] = [];
        const errorKeys = new Set<string>();

        // Header
        Object.entries(header).forEach(([k, def]: any) => {
            const req = !!def?.required;
            const v = (headerVals[k] ?? '').toString().trim();
            const isFinalSeal = k.toLowerCase().includes('final');
            if (req && !v && !isFinalSeal) {
                falt.push(`Header: ${def?.label ?? humanTitle(k)}`);
                errorKeys.add(`header:${k}`);
            }
        });

        // Items
        const byN = new Map<number, ItemValor>();
        itemsVals.forEach(it => byN.set(it.n, it));

        for (const def of items) {
            const v = byN.get(def.n);
            const colsForGroup: ColumnDef[] = getColsForGroup(def.grupo);
            const hasValorCol = colsForGroup.some(c => c.key === 'valor');
            const hasEstadoCol = colsForGroup.some(c => c.key === 'estado');
            const customQtyCols = colsForGroup.filter(c =>
                c.key !== 'n' && c.key !== 'valor' && c.key !== 'estado' && c.key !== 'observacion' && c.selectorType === 'qty'
            );

            if (def.required) {
                const label = `${def.n}. ${def.grupo} – ${def.texto}`;
                if (!v) {
                    falt.push(label);
                    errorKeys.add(`item:${def.n}:row`);
                    continue;
                }
                if (hasValorCol) {
                    const col = colsForGroup.find(c => c.key === 'valor');
                    const expected: ColumnDef['selectorType'] =
                        (col?.selectorType || 'auto') === 'auto' ? (def.selector || 'brm') : col?.selectorType!;
                    const valStr = (v.valor ?? '').toString().toUpperCase();
                    if (isNumericSelector(expected)) {
                        const num = Number(v.valor);
                        if (!isFinite(num)) {
                            falt.push(`${label} (${col?.label || 'Valor'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    } else if (expected === 'brm' && !['B','R','M'].includes(valStr)) {
                        falt.push(label);
                        errorKeys.add(`item:${def.n}:valor`);
                    } else if (expected === 'brmna' && !['B','R','M','NA'].includes(valStr)) {
                        falt.push(label);
                        errorKeys.add(`item:${def.n}:valor`);
                    } else if (expected === 'sino' && !['SI','NO'].includes(valStr)) {
                        falt.push(label);
                        errorKeys.add(`item:${def.n}:valor`);
                    }
                }

                if (hasEstadoCol || def.estado === true) {
                    if (!v.estado || !['A','C'].includes(v.estado)) {
                        falt.push(`${label} (Estado A/C)`);
                        errorKeys.add(`item:${def.n}:estado`);
                    }
                }

                // Si alguna columna qty custom es requerida en el futuro (no en este reto)
                customQtyCols.forEach(c => {
                    const raw = v?.[c.key];
                    if ((raw ?? '') !== '' && isNaN(Number(raw))) {
                        falt.push(`${label} (${c.label || c.key})`);
                        errorKeys.add(`item:${def.n}:${c.key}`);
                    }
                });
            }
        }

        return { ok: falt.length === 0, faltantes: falt, errorKeys };
    };

    const checklistOK = useMemo(() => {
        const { ok } = validarChecklistDetallado();
        return ok;
    }, [headerVals, itemsVals, data?.metadataReto, columns]);

    const [formOK, setFormOK] = useState<boolean>(true);

    useEffect(() => {
        const checklist = isGroupedChecklist(data?.metadataReto);
        if (!data || checklist) return;
        const schemaObj = (data?.metadataReto?.schema || {}) as Record<string, AnyField>;
        const falt = validateGeneric(schemaObj, formVals);
        setFormOK(falt.length === 0);
    }, [data?.metadataReto, formVals]);

    /** Envío */
    const enviarFormulario = async () => {
        if (!data || !codUsuarioReto) return;
        const checklist = isGroupedChecklist(data?.metadataReto);

        if (checklist) {
            const {ok, faltantes} = validarChecklistDetallado();
            if (!ok) {
                setShowChecklistErrors(true);
                Alert.alert('Faltan campos', `Por favor completa:\n\n• ${faltantes.join('\n• ')}`);
                return;
            }
            const headerSealed: Record<string, string> = {...headerVals};
            Object.keys(headerSealed).forEach(k => {
                if (k.toLowerCase().includes('final')) headerSealed[k] = nowHHmm();
            });

            const snapshot = {
                kind: 'groupedChecklist',
                header: headerSealed,
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

        const schemaObj = (data?.metadataReto?.schema || {}) as Record<string, AnyField>;
        const falt = validateGeneric(schemaObj, formVals);
        if (falt.length > 0) {
            setShowFormErrors(true);
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

    /** Quiz (compat) */
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
            const extra = r.nuevaRacha ? `\n🔥 Racha: ${r.nuevaRacha} día${r.nuevaRacha === 1 ? '' : 's'}` : '';
            Alert.alert('Reto completado', `+${r.xpGanada} XP, +${r.coins} monedas${extra}`);
            markModalClosed();
            router.back();
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos finalizar');
        }
    };

    /** Encabezado checklist */
    const renderChecklistHeader = () => {
        const schema = data?.metadataReto?.schema ?? {};
        const header = schema.header ?? {};
        const entries = Object.entries(header) as [string, any][];

        // errores de header
        const headerErrors = new Set<string>();
        if (showChecklistErrors) {
            entries.forEach(([k, def]) => {
                const isFinalSeal = k.toLowerCase().includes('final');
                const req = !!def?.required;
                const v = (headerVals[k] ?? '').toString().trim();
                if (req && !v && !isFinalSeal) headerErrors.add(k);
            });
        }

        return (
            <View style={{marginTop: 8}}>
                <Text style={[g.text.h2]}>Encabezado</Text>
                {entries.map(([k, def]) => {
                    const kLower = k.toLowerCase();
                    const isFechaAuto = kLower.includes('fecha');
                    const isHoraAuto = kLower.includes('hora');
                    const isFinalSeal = kLower.includes('final');
                    const disabled = isFechaAuto || isHoraAuto || isFinalSeal;
                    const isErr = headerErrors.has(k);

                    return (
                        <View key={k} style={{marginTop: 10}}>
                            <Text style={g.text.bodyStrong}>
                                {def.label ?? humanTitle(k)}{def.required ? ' *' : ''}
                            </Text>
                            <TextInput
                                editable={!disabled}
                                placeholder={isFinalSeal ? '(se asignará al enviar)' : (def.label ?? humanTitle(k))}
                                placeholderTextColor={colors.mutedText}
                                value={headerVals[k] ?? ''}
                                onChangeText={(t) => setHeaderVals(s => ({...s, [k]: t}))}
                                style={{
                                    borderWidth: 1,
                                    borderColor: isErr ? danger : colors.divider,
                                    borderRadius: 10,
                                    padding: 10, color: colors.text, marginTop: 8,
                                    backgroundColor: disabled ? colors.mutedBg : 'transparent'
                                }}
                            />
                            {isFinalSeal && (
                                <Text style={[g.text.caption, {marginTop: 4, color: colors.mutedText}]}>
                                    Este campo se sellará automáticamente al enviar.
                                </Text>
                            )}
                            {isErr && (
                                <Text style={[g.text.caption, {marginTop: 4, color: danger}]}>
                                    Campo obligatorio.
                                </Text>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    /** Ítems checklist por grupos con columnsByGroup */
    const renderChecklistItems = () => {
        const schema = (data?.metadataReto?.schema ?? {});
        const defsAll: ItemDef[] = (schema.items ?? []).slice().sort((a: ItemDef, b: ItemDef) => a.n - b.n);

        const grupos = defsAll.reduce<Record<string, ItemDef[]>>((acc, it) => {
            acc[it.grupo] = acc[it.grupo] || [];
            acc[it.grupo].push(it);
            return acc;
        }, {});

        const setItem = (n: number, patch: Partial<ItemValor>) => {
            setItemsVals(prev => {
                const idx = prev.findIndex(it => it.n === n);
                if (idx === -1) return [...prev, {n, ...patch} as ItemValor];
                const next = [...prev];
                next[idx] = {...next[idx], ...patch};
                return next;
            });
        };

        const unitLabel = (sel?: ColumnDef['selectorType']) =>
            sel === 'volts' ? 'Volts' : sel === 'ohms' ? 'Ohmios' : '';

        const SectionHeaderRow = ({cols}:{cols: ColumnDef[]}) => {
            const hasValor = cols.some(c => c.key === 'valor');
            const hasEstado = cols.some(c => c.key === 'estado');
            const extraQty = cols.filter(c =>
                c.selectorType === 'qty' && c.key !== 'valor' && c.key !== 'observacion'
            );
            return (
                <View style={{flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center'}}>
                    <View style={{width: 46}}>
                        <Text style={[g.text.caption, {fontWeight: '700'}]}>#</Text>
                    </View>
                    {hasValor && (
                        <View style={{flex: 2}}>
                            <Text style={[g.text.caption, {fontWeight: '700'}]}>
                                {cols.find(c => c.key === 'valor')?.label ?? 'Seleccione'}
                            </Text>
                        </View>
                    )}
                    {extraQty.map((c) => (
                        <View key={c.key} style={{width: 90, alignItems: 'center'}}>
                            <Text style={[g.text.caption, {fontWeight: '700'}]}>{c.label ?? c.key}</Text>
                        </View>
                    ))}
                    {hasEstado && (
                        <View style={{width: 56}}>
                            <Text style={[g.text.caption, {fontWeight: '700'}]}>
                                {cols.find(c => c.key === 'estado')?.label ?? 'Estado'}
                            </Text>
                        </View>
                    )}
                </View>
            );
        };

        // errores por item
        const errorSet = new Set<string>();
        if (showChecklistErrors) {
            const det = validarChecklistDetallado();
            det.errorKeys.forEach(k => errorSet.add(k));
        }

        return (
            <View style={{marginTop: 18}}>
                {Object.entries(grupos).map(([nombreGrupo, defs]) => {
                    const cols = getColsForGroup(nombreGrupo);
                    const hasValor = cols.some(c => c.key === 'valor');
                    const hasEstado = cols.some(c => c.key === 'estado');
                    const showObs = cols.some(c => c.key === 'observacion');
                    const extraQty = cols.filter(c =>
                        c.selectorType === 'qty' && c.key !== 'valor' && c.key !== 'observacion'
                    );

                    const valorSelectorFor = (def: ItemDef): ColumnDef['selectorType'] => {
                        const col = cols.find(c => c.key === 'valor');
                        const st = col?.selectorType || 'auto';
                        if (st === 'auto') return (def.selector as any) || 'brm';
                        return st;
                    };

                    return (
                        <View key={nombreGrupo} style={{marginBottom: 12}}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{nombreGrupo}</Text>
                                <View style={styles.sectionBar}/>
                            </View>

                            <SectionHeaderRow cols={cols}/>
                            <View style={styles.hSep}/>

                            {defs.map((def, idxRow) => {
                                const fallback: ItemValor = {
                                    n: def.n, valor: null, estado: null, observacion: '', __selectorAuto: def.selector
                                };
                                const val = itemsVals.find(x => x.n === def.n) ?? fallback;
                                const zebra = (idxRow % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;
                                const selType = valorSelectorFor(def);

                                const errValor = errorSet.has(`item:${def.n}:valor`);
                                const errEstado = errorSet.has(`item:${def.n}:estado`);

                                return (
                                    <View key={def.n} style={[{borderRadius: 10, padding: 10, marginBottom: 10}, zebra]}>
                                        {/* Texto del ítem */}
                                        <View style={{marginVertical: 6}}>
                                            <Text style={g.text.body}>{def.texto}{def.required ? ' *' : ''}</Text>
                                        </View>

                                        {/* Fila: # | Valor | extras qty | Estado */}
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                            {/* # */}
                                            <View style={{width: 46}}>
                                                <View style={styles.cellBadge}>
                                                    <Text style={[g.text.caption, {fontWeight: '700'}]}>{def.n}</Text>
                                                </View>
                                            </View>

                                            {/* Valor (si existe) */}
                                            {hasValor && (
                                                <View style={{flex: 2}}>
                                                    {selType === 'brm' && (
                                                        <BRMSeg
                                                            value={(val.valor as any) ?? null}
                                                            onChange={(v) => setItem(def.n, {valor: v})}
                                                            colors={colors}
                                                            error={errValor}
                                                        />
                                                    )}
                                                    {selType === 'brmna' && (
                                                        <BRMNASeg
                                                            value={(val.valor as any) ?? null}
                                                            onChange={(v) => setItem(def.n, {valor: v})}
                                                            colors={colors}
                                                            error={errValor}
                                                        />
                                                    )}
                                                    {selType === 'sino' && (
                                                        <SiNoToggle
                                                            value={(val.valor as any) ?? null}
                                                            onChange={(v) => setItem(def.n, {valor: v})}
                                                            colors={colors}
                                                            error={errValor}
                                                        />
                                                    )}
                                                    {isNumericSelector(selType) && (
                                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center'}}>
                                                            {!!unitLabel(selType) && <Text style={g.text.body}>{unitLabel(selType)}</Text>}
                                                            <TextInput
                                                                keyboardType="numeric"
                                                                value={val.valor != null ? String(val.valor) : ''}
                                                                onChangeText={(t) => setItem(def.n, {valor: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                                                placeholder={selType === 'qty' ? '0' : '____'}
                                                                placeholderTextColor={colors.mutedText}
                                                                style={{
                                                                    minWidth: 90,
                                                                    borderWidth: 1,
                                                                    borderColor: errValor ? danger : colors.divider,
                                                                    borderRadius: 8,
                                                                    paddingVertical: 6,
                                                                    paddingHorizontal: 10,
                                                                    color: colors.text,
                                                                    textAlign: 'center'
                                                                }}
                                                            />
                                                        </View>
                                                    )}
                                                </View>
                                            )}

                                            {/* Extra qty columns */}
                                            {extraQty.map((c) => {
                                                const key = c.key;
                                                const raw = (val as any)?.[key];
                                                const isErr = errorSet.has(`item:${def.n}:${key}`);
                                                return (
                                                    <View key={key} style={{width: 90}}>
                                                        <TextInput
                                                            keyboardType="numeric"
                                                            value={raw != null ? String(raw) : ''}
                                                            onChangeText={(t) => setItem(def.n, {[key]: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                                            placeholder="0"
                                                            placeholderTextColor={colors.mutedText}
                                                            style={{
                                                                borderWidth: 1,
                                                                borderColor: isErr ? danger : colors.divider,
                                                                borderRadius: 8,
                                                                paddingVertical: 6,
                                                                paddingHorizontal: 10,
                                                                color: colors.text,
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                    </View>
                                                );
                                            })}

                                            {/* Estado (vertical) si aplica */}
                                            {hasEstado && (
                                                <View style={{width: 56, alignItems: 'center'}}>
                                                    <ACToggle
                                                        value={val.estado ?? null}
                                                        onChange={(v) => setItem(def.n, {estado: v})}
                                                        colors={colors}
                                                        error={errEstado}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        {/* Observación si la define el grupo */}
                                        {showObs && (
                                            <View style={{marginTop: 8}}>
                                                <Text style={g.text.bodyStrong}>
                                                    {cols.find(c => c.key === 'observacion')?.label ?? 'Observación'}
                                                </Text>
                                                <TextInput
                                                    placeholder="Observación…"
                                                    placeholderTextColor={colors.mutedText}
                                                    value={val.observacion ?? ''}
                                                    onChangeText={(t) => setItem(def.n, {observacion: t})}
                                                    style={styles.obsInput}
                                                />
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}
            </View>
        );
    };

    /** Form genérico */
    const renderFormField = (
        k: string,
        def: AnyField,
        value: any,
        onChange: (patch: any) => void
    ) => {
        if (!def || typeof def !== 'object') return null;

        const isMissing = (d: any, v: any) => {
            if (!showFormErrors) return false;
            const t = d?.type;
            const req = !!d?.required;
            if (!req) return false;
            if (t === 'array') return !Array.isArray(v) || v.length === 0;
            const s = (v ?? '').toString().trim();
            return !s;
        };

        if ('type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            const label = (def as any).label || humanTitle(k);
            const required = !!(def as any).required;
            const err = isMissing(def, value);

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

            // primitivos
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
                                borderWidth: 1, borderColor: err ? danger : colors.divider, borderRadius: 10,
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
                                borderWidth: 1, borderColor: err ? danger : colors.divider, borderRadius: 10,
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
                                borderWidth: 1, borderColor: err ? danger : colors.divider, borderRadius: 10,
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
                                borderWidth: 1, borderColor: err ? danger : colors.divider, borderRadius: 10,
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
                                borderWidth: 1, borderColor: err ? danger : colors.divider, borderRadius: 10,
                                padding: 10, color: colors.text, marginTop: 8
                            }}
                        />
                    )}
                    {err && <Text style={[g.text.caption, {color: danger, marginTop: 4}]}>Campo obligatorio.</Text>}
                </View>
            );
        }

        if (Array.isArray(def)) return null;

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
    const checklist = isGroupedChecklist(data?.metadataReto);

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
                    <Text style={[g.text.body, g.text.secondary, {marginTop: 8, fontSize: 16}]}>
                        {data.reto.descripcionReto}
                    </Text>

                    <View style={{marginTop: 12}}>
                        <Text style={g.text.body}>
                            <Text style={g.text.bodyStrong}>Tipo: </Text>{(data.tipoReto ?? 'form').toUpperCase()} ·{' '}
                            <Text style={g.text.bodyStrong}>Tiempo estimado:</Text> {Math.round((data.reto.tiempoEstimadoSegReto ?? 0) / 60)} min
                        </Text>
                    </View>

                    <View style={[styles.pill, {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider}]}>
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
                        <Text style={{color: estadoVisible === 'Disponible' ? '#1b5e20' : estadoVisible === 'Aún no disponible' ? '#8a4b08' : estadoVisible === 'Vencido' ? '#842029' : colors.text}}>
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
                                marginTop: 18, paddingVertical: 14, paddingHorizontal: 28,
                                backgroundColor: isDark ? colors.primary : '#001780',
                                borderRadius: 999, alignSelf: 'center'
                            }}
                            onPress={empezar}
                        >
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Resolver</Text>
                        </Pressable>
                    )}
                </ScrollView>
            ) : (
                <View style={{flex: 1, paddingHorizontal: 16, paddingBottom: 24}}>
                    <View style={{marginHorizontal: -16, backgroundColor: colors.cardTint, alignItems: 'center'}}>
                        <Text style={[g.text.h2, {paddingVertical: 20, paddingHorizontal: 16, textAlign: "center"}]}>
                            Resolución de {data?.reto?.nombreReto}
                        </Text>
                    </View>

                    {checklist ? (
                        <ScrollView>
                            {renderChecklistHeader()}
                            {renderChecklistItems()}

                            {/* Botón SIEMPRE presionable: muestra errores si falta info */}
                            <Pressable
                                onPress={enviarFormulario}
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
                        <ScrollView>
                            {renderGenericForm()}
                            <Pressable
                                onPress={() => {
                                    if (!formOK) setShowFormErrors(true);
                                    enviarFormulario();
                                }}
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
