// app/(modals)/reto/[id].tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import { ItemInventario, InventarioResponse } from '../../../models/ItemInventario';


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
    codUsuario?: number | null;

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

/** ─────────────────────────────────────────────────
 *  Time power-up: parsing de formatos y offsets
 *  Soporta: "15s", "1m30s", "2m", "PT45S", "mm:ss", "HH:mm"
 *  ───────────────────────────────────────────────── */
const _toInt = (x: any) => Number(x) || 0;
const _pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const _parseISODur = (raw: string): number | null => {
    const m = /^P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/i.exec((raw||'').trim());
    if (!m) return null;
    const h = _toInt(m[2]), mn = _toInt(m[3]), s = _toInt(m[4]);
    return h * 3600 + mn * 60 + s;
};

const _parseOffsetPieces = (s: string): number | null => {
    const re = /^(\+)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;
    const m = re.exec((s||'').replace(/\s+/g, '').toLowerCase());
    if (!m) return null;
    const h = _toInt(m[2]), mn = _toInt(m[3]), sec = _toInt(m[4]);
    if (h === 0 && mn === 0 && sec === 0) return null;
    return h * 3600 + mn * 60 + sec;
};

const _parsePlainNumber = (s: string): number | null => {
    const t = (s||'').trim().toLowerCase();
    if (/^\+?\d+$/.test(t)) return _toInt(t.replace('+',''));
    const mS = /^(\+)?(\d+)\s*s(ec|eg|egundos)?$/.exec(t);
    if (mS) return _toInt(mS[2]);
    const mM = /^(\+)?(\d+)\s*m(in|inutos)?$/.exec(t);
    if (mM) return _toInt(mM[2]) * 60;
    const mH = /^(\+)?(\d+)\s*h(oras?)?$/.exec(t);
    if (mH) return _toInt(mH[2]) * 3600;
    return null;
};

type ExtraTimeSpec = { seconds: number; format: 'offset'|'until'; label: string; hastaHHmm?: string };

const parseExtraTimeSpec = (raw: any): ExtraTimeSpec => {
    const now = dayjs();
    const fallback: ExtraTimeSpec = { seconds: 15, format: 'offset', label: '+15s' };
    if (raw == null) return fallback;

    if (typeof raw === 'number' && isFinite(raw) && raw > 0) {
        const s = Math.floor(raw);
        return { seconds: s, format: 'offset', label: `+${s}s` };
    }
    if (typeof raw !== 'string') return fallback;
    const s = raw.trim();

    // ISO: PT#H#M#S
    if (/^P(T.*)$/i.test(s)) {
        const secs = _parseISODur(s);
        if (secs && secs > 0) {
            const lbl = secs % 60 === 0 ? `+${Math.floor(secs / 60)}m` : `+${secs}s`;
            return { seconds: secs, format: 'offset', label: lbl };
        }
    }
    // HH:mm (hoy)
    const mm = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (mm) {
        const hh = _toInt(mm[1]), m = _toInt(mm[2]);
        if (hh >= 0 && hh <= 23 && m >= 0 && m <= 59) {
            const target = now.hour(hh).minute(m).second(0);
            const diff = target.diff(now, 'second');
            const secs = Math.max(0, diff);
            return { seconds: secs, format: 'until', label: `→ ${_pad2(hh)}:${_pad2(m)}`, hastaHHmm: `${_pad2(hh)}:${_pad2(m)}` };
        }
    }
    // mm:ss (offset)
    const mms = /^(\d{1,3}):(\d{2})$/.exec(s);
    if (mms) {
        const mn = _toInt(mms[1]), sec = _toInt(mms[2]);
        if (sec <= 59) {
            const secs = mn * 60 + sec;
            return { seconds: secs, format: 'offset', label: `+${mn}m${sec ? sec + 's' : ''}` };
        }
    }
    // 1m30s / 2m / 90s / +30s
    const pieces = _parseOffsetPieces(s);
    if (pieces && pieces > 0) {
        const lbl = pieces % 60 === 0 ? `+${Math.floor(pieces / 60)}m` : `+${pieces}s`;
        return { seconds: pieces, format: 'offset', label: lbl };
    }
    // “15” / “2m” / “1h”
    const plain = _parsePlainNumber(s);
    if (plain && plain > 0) {
        const lbl = plain % 60 === 0 ? `+${Math.floor(plain / 60)}m` : `+${plain}s`;
        return { seconds: plain, format: 'offset', label: lbl };
    }
    return fallback;
};

/** Lee la config del comodín de tiempo desde metadata con varios alias. */
const getExtraTimeConfig = (meta: any): ExtraTimeSpec => {
    const m = meta ?? {};
    const px = (m?.powerups || m?.comodines || {}) as any;
    const raw =
        px?.extra_time?.offset ??
        px?.extraTime?.offset ??
        m?.extra_time ??
        m?.extraTime ??
        m?.tiempoExtra ??
        m?.tiempoExtraSeg ??
        '15s';
    return parseExtraTimeSpec(raw);
};

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

type PowerupKey = '50-50' | 'extra_time' | 'streak_shield' | 'x2' | 'phoenix';

// Normaliza un objeto { "50-50": 1, extra_time: 2, ... }
const normalizePowerups = (bag: any): Record<PowerupKey, number> => {
    const num = (v: any) => Number(v) || 0;
    return {
        '50-50':       num(bag?.['50-50'] ?? bag?.fifty_fifty ?? bag?.fiftyFifty ?? bag?.fifty),
        extra_time:    num(bag?.extra_time ?? bag?.extraTime ?? bag?.mas_tiempo ?? bag?.masTiempo),
        streak_shield: num(bag?.streak_shield ?? bag?.streakShield ?? bag?.protector_racha ?? bag?.protectorRacha),
        x2:            num(bag?.x2 ?? bag?.double ?? bag?.double_points),
        phoenix:       num(bag?.phoenix ?? bag?.ave_fenix ?? bag?.fenix ?? bag?.['fénix']),
    };
};

// Limpia texto para matching flexible
const _norm = (s: string) =>
    (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// Adivina qué comodín es a partir del nombre del ítem de inventario
const resolvePowerupKey = (name?: string): PowerupKey | null => {
    const n = _norm(name || '');
    if (!n) return null;

    // 50-50
    if (n.includes('50 50') || n.includes('5050') || n.includes('fifty')) return '50-50';

    // Extra tiempo (+15s / más tiempo / extra time / pocion)
    if (
        n.includes('extra tiempo') || n.includes('mas tiempo') || n.includes('mas  tiempo') ||
        n.includes('+15') || n.includes('15s') || n.includes('extra time') ||
        n.includes('pocion') || n.includes('poción') || n.includes('potion')
    ) return 'extra_time';

    // x2 / doble / boost
    if (n.includes('x2') || n.includes('doble') || n.includes('double') || n.includes('boost') || n.includes('booster'))
        return 'x2';

    // Protector de racha / escudo / shield
    if (n.includes('racha') || n.includes('shield') || n.includes('protector') || n.includes('escudo'))
        return 'streak_shield';

    // Ave Fénix / Phoenix
    if (n.includes('phoenix') || n.includes('fenix') || n.includes('fénix') || n.includes('ave fenix') || n.includes('ave fénix'))
        return 'phoenix';

    return null;
};

// Convierte items de inventario → objeto de comodines
const mapInventoryToPowerups = (items: ItemInventario[] | undefined | null): Record<PowerupKey, number> => {
    const acc: Record<PowerupKey, number> = { '50-50': 0, extra_time: 0, streak_shield: 0, x2: 0, phoenix: 0 };
    for (const it of items || []) {
        const qty = Number((it as any)?.cantidad ?? 0) || 0;
        const name = (it as any)?.item?.nombre as string | undefined;
        const key = resolvePowerupKey(name);
        if (key) acc[key] += qty;
    }
    return acc;
};


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
    const [idx, setIdx] = useState(0); // ← FALTA
    const [inv, setInv] = useState<Record<PowerupKey, number>>({
        '50-50': 0, extra_time: 0, streak_shield: 0, x2: 0, phoenix: 0
    });
    const [usedPowerupForQuestion, setUsedPowerupForQuestion] = useState<PowerupKey | null>(null);
    const [x2AppliedTo, setX2AppliedTo] = useState<Set<number>>(new Set());
    const [answeredCorrect, setAnsweredCorrect] = useState<Record<number, boolean>>({});
    const advanceRef = useRef<null | (() => Promise<void>)>(null);

    const [respuestas, setRespuestas] = useState<any>({});
    const preguntaActual = data?.quiz?.preguntas?.[idx];

    // ─── Quiz metrics (para pantalla de resumen) ───────────────────
    const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
    const [sumTiempoSeg, setSumTiempoSeg] = useState(0); // suma de tiempo por pregunta (tiempoSeg)
    const [okCount, setOkCount] = useState(0);
    const [badCount, setBadCount] = useState(0);

// Resumen final (UI)
    const [summary, setSummary] = useState<{
        visible: boolean; tiempoTotal: number; ok: number; bad: number; xp: number; coins: number;
    }>({ visible: false, tiempoTotal: 0, ok: 0, bad: 0, xp: 0, coins: 0 });


    /** ─── Quiz: temporizador y comodines ────────────────────────── */
    const [tiempo, setTiempo] = useState<number>(0);
    const [ocultas, setOcultas] = useState<number[]>([]); // ids de opciones ocultas por 50-50



    /** ─── Quiz helpers (rellenar) ─────────────────────────────────── */
    /** Normaliza texto: trim, lower, quita tildes, colapsa espacios */
    const normalizeAnswer = (s: string) =>
        s
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');

    /**
     * Para 'rellenar': acepta respuestas desde:
     *  - q.opciones[].texto con correcta=1   (modelo previo)
     *  - q.respuesta_correcta / q.respuestaCorrecta (modelo BD)
     *  - Soporta múltiples variantes separadas por | o , en respuesta_correcta
     */
    const esRellenarCorrecto = (q: Pregunta & any, respuestaUsuario: string): boolean => {
        if (!q || q.tipo !== 'rellenar') return false;

        const candidatos: string[] = [];

        // 1) Vía opciones correctas (si existen)
        if (Array.isArray(q.opciones)) {
            for (const o of q.opciones) {
                if (Number(o?.correcta) === 1 && typeof o?.texto === 'string') {
                    candidatos.push(o.texto);
                }
            }
        }

        // 2) Vía respuesta_correcta / respuestaCorrecta (según BD / API)
        const rawRC: unknown = q.respuesta_correcta ?? q.respuestaCorrecta ?? q.correcta;
        if (typeof rawRC === 'string' && rawRC.trim()) {
            // Permite "manos|mano" o "limpia, aseada" como variantes
            rawRC.split(/[|,]/).forEach(v => {
                const t = v.trim();
                if (t) candidatos.push(t);
            });
        }

        if (candidatos.length === 0) return false;

        const ru = normalizeAnswer(respuestaUsuario || '');
        if (!ru) return false;

        return candidatos.some(txt => normalizeAnswer(txt) === ru);
    };



// tiempo por pregunta: metadata del reto > tiempoMax de la pregunta > 30
    const tiempoPorPregunta = useMemo<number>(() => {
        const meta = (data?.metadataReto ?? (data as any)?.reto?.metadataReto ?? {}) as any;
        const tMeta = Number(meta?.tiempoPorPreguntaSeg);
        return Number.isFinite(tMeta) && tMeta > 0
            ? tMeta
            : (preguntaActual?.tiempoMax ?? 30);
    }, [data?.metadataReto, (data as any)?.reto?.metadataReto, preguntaActual?.tiempoMax]);

// progreso visual
    const totalPreg = data?.quiz?.preguntas?.length ?? 0;
    const progresoPct = totalPreg > 0 ? Math.round((idx / totalPreg) * 100) : 0;

// Evitar doble finalización por tiempo agotado
    const finishingRef = useRef(false);


// Evita reintentos si el endpoint de comodines no existe (cachea el 404 en esta sesión del modal)
    const powerupApiMissingRef = useRef<boolean>(false);

// Evita reentradas mientras se usa un comodín (doble tap)
    const usingPowerupRef = useRef<boolean>(false);


    // checklist state
    const [headerVals, setHeaderVals] = useState<Record<string, string>>({});
    const [itemsVals, setItemsVals] = useState<ItemValor[]>([]);

    // generic form state
    const [formVals, setFormVals] = useState<any>({});

    /** ─── Feedback de respuesta ─────────────────────────────────── */
    const [fbVisible, setFbVisible] = useState(false);
    const [fbOk, setFbOk] = useState<boolean | null>(null);
    const [fbMsg, setFbMsg] = useState<string>('');
    const [fbTimer, setFbTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (fbTimer) clearTimeout(fbTimer);
        };
    }, [fbTimer]);

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
                    ventanaFin: row.ventanaFin,
                    // 👇 NUEVO (intenta varios alias comunes)
                    codUsuario: Number(row.codUsuario ?? row.cod_usuario ?? row.userId ?? row.usuarioId ?? NaN) || null,
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

    /** ─── Timer de la pregunta actual ───────────────────────────── */
    useEffect(() => {
        if (!resolviendo || !preguntaActual) return;
        if (summary.visible) return; // 🟢 agrega esta línea

        setTiempo(tiempoPorPregunta);
        setOcultas([]); // al cambiar de pregunta mostramos todas

        const idInt = setInterval(() => {
            setTiempo((t) => {
                if (t <= 1) {
                    clearInterval(idInt);

                    if (!finishingRef.current) {
                        finishingRef.current = true;
                        Alert.alert('Tiempo agotado', 'La prueba ha finalizado por tiempo.');
                        finalizar({ ok: okCount, bad: badCount, tiempo: sumTiempoSeg })
                            .catch(() => {})
                            .finally(() => { finishingRef.current = false; });
                    }

                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(idInt);
    }, [resolviendo, idx, preguntaActual?.codPregunta, tiempoPorPregunta]);


    useEffect(() => {
        setUsedPowerupForQuestion(null);
        setOcultas([]);
    }, [idx, preguntaActual?.codPregunta]);



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

    // Config del comodín de tiempo según metadata (formato/offset dinámico)
    const extraTimeCfg = useMemo(() => {
        const meta = (data?.metadataReto ?? (data as any)?.reto?.metadataReto ?? {}) as any;
        return getExtraTimeConfig(meta);
    }, [data?.metadataReto, (data as any)?.reto?.metadataReto]);



    const puedeResolver = useMemo(() => {
        if (!ur) return false;
        if (!esHoy) return false;
        const isDisponible = estadoVisible === 'Disponible';
        const estadoOk = ur.estado === 'asignado' || ur.estado === 'en_progreso';
        return isDisponible && estadoOk;
    }, [ur, esHoy, estadoVisible]);


    // Usa un snapshot (p. ej. la respuesta de /mis-retos/abrir)
    const cargarComodinesDisponibles = async (source?: any): Promise<boolean> => {
        const bag = source?.comodines ?? source?.inventario ?? source?.powerups ?? source?.inventory ?? null;
        if (bag && typeof bag === 'object') {
            setInv(normalizePowerups(bag));
            return true;
        }
        return false;
    };

    // Fallback/refresh: trae inventario real y lo mapea a comodines
    const cargarComodinesDesdeInventario = async (): Promise<void> => {
        try {
            const resp = await fetchJson<InventarioResponse>('/item-inventario/listar');
            const arr = Array.isArray((resp as any)?.items) ? (resp as any).items as ItemInventario[] : [];
            const norm = mapInventoryToPowerups(arr);
            setInv(norm);
        } catch {
            // Si falla, dejamos el state como está (evita 404s y ruido de UI)
        }
    };


    const serverTipoFromKey = (k: PowerupKey) => {
        switch (k) {
            case '50-50':         return '50-50';
            case 'extra_time':    return 'mas_tiempo';
            case 'streak_shield': return 'protector_racha';
            case 'x2':            return 'double';
            case 'phoenix':       return 'ave_fenix';
            default:              return k as string;
        }
    };

// Para backends que aceptan alias distintos, probamos varios hasta que uno pase.
    const serverTipoCandidates = (k: PowerupKey): string[] => {
        const main = serverTipoFromKey(k);
        const alts: Record<PowerupKey, string[]> = {
            '50-50':       ['50-50', 'fifty_fifty', 'fifty', '5050'],
            extra_time:    ['mas_tiempo', 'extra_time', 'extraTime', 'tiempo_extra'],
            streak_shield: ['protector_racha', 'streak_shield', 'shield', 'escudo'],
            x2:            ['double', 'x2', 'double_points'],
            phoenix:       ['ave_fenix', 'phoenix', 'fenix', 'fénix'],
        };
        const arr = alts[k] || [main];
        return Array.from(new Set([main, ...arr]));
    };


// Guarda por pregunta el string EXACTO que aceptó el backend
    const usedPowerupServerTypeRef = useRef<Record<number, string | undefined>>({});

// Intenta registrar el uso en backend probando sinónimos hasta que uno funcione
    const tryUsePowerupOnServer = async (
        key: PowerupKey,
        urId: number,
        codPregunta?: number
    ): Promise<string> => {
        const candidates = serverTipoCandidates(key);
        for (const tipo of candidates) {
            try {
                await fetchJson(
                    `/mis-retos/${urId}/comodines/usar`,
                    asJson({ codUsuarioReto: urId, codPregunta, tipo })
                );
                return tipo; // este es el que aceptó backend
            } catch {
                // pruebo siguiente alias
            }
        }
        throw new Error('No se pudo registrar el uso del comodín en el servidor');
    };



    const usarComodin = async (
        key: PowerupKey,
        opts?: { sobrePreguntaId?: number; payload?: any }
    ): Promise<boolean> => {
        // Evita doble tap / reentradas
        if (usingPowerupRef.current) return false;
        usingPowerupRef.current = true;

        try {
            if (usedPowerupForQuestion) {
                Alert.alert('Comodines', 'Solo puedes usar 1 comodín por pregunta.');
                return false;
            }
            if ((inv[key] ?? 0) <= 0) {
                Alert.alert('Comodines', 'No tienes este comodín disponible.');
                return false;
            }

            // Descuento optimista + marca de uso para esta pregunta
            setInv(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) - 1) }));
            setUsedPowerupForQuestion(key);

            const urId = Number(codUsuarioReto ?? ur?.codUsuarioReto ?? NaN) || null;
            const codPregunta = opts?.sobrePreguntaId ?? preguntaActual?.codPregunta;

            // Sin UR/Pregunta: consumo local (UI) y listo
            if (!urId || !codPregunta) return true;

            // Si ya sabemos que el endpoint no existe, no volvemos a postear (modo local)
            if (powerupApiMissingRef.current) {
                return true;
            }

            const tipo = serverTipoFromKey(key);
            let body: any = { codUsuarioReto: urId, codPregunta, tipo };

            if (key === 'extra_time') {
                const seconds = Math.max(1, Math.floor(Number(opts?.payload?.seconds ?? 15) || 0));
                const hasta = typeof opts?.payload?.hastaHHmm === 'string' ? opts?.payload?.hastaHHmm : undefined;
                // Payload canónico para back
                body = { ...body, segundos: seconds, ...(hasta ? { hasta } : {}) };
            }

            try {
                await fetchJson(`/mis-retos/${urId}/comodines/usar`, asJson(body));
                // Opcional: resync de inventario real
                await cargarComodinesDesdeInventario().catch(() => {});
                return true;
            } catch (e: any) {
                const msg = String(e?.message || '');
                const is404 = e?.status === 404 || /404/.test(msg) || /Cannot POST/i.test(msg);
                if (is404) {
                    // Cachea el 404 para no volver a “golpear” este endpoint en esta sesión del modal
                    powerupApiMissingRef.current = true;
                    // Sin rollback: mantenemos el uso local del comodín
                    return true;
                }

                // Otros errores: rollback y aviso
                setInv(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
                setUsedPowerupForQuestion(null);
                Alert.alert('Comodines', e?.message || 'No se pudo usar el comodín.');
                return false;
            }
        } finally {
            usingPowerupRef.current = false;
        }
    };




    /** Acciones base */
    const empezar = async () => {
        if (!data) return;
        if (!puedeResolver) {
            Alert.alert('No disponible', 'Este reto no es resoluble ahora (no corresponde a hoy o está fuera de su ventana).');
            return;
        }

        try {
            const r = await fetchJson<any>(`/mis-retos/abrir`, asJson({ codReto: Number(id) }));
            const urId = r?.codUsuarioReto ?? r?.cod_usuario_reto ?? r?.id ?? ur?.codUsuarioReto ?? null;
            if (!urId) throw new Error('No se obtuvo codUsuarioReto al abrir la sesión');

            setCodUsuarioReto(urId);

// 1) Intento con snapshot del "abrir"
            const updatedFromOpen = await cargarComodinesDisponibles(r);

// 2) Si el open NO trajo inventario/compatibles, cargo desde /item-inventario/listar
            if (!updatedFromOpen) {
                await cargarComodinesDesdeInventario();
            }

// ...resto sin cambios:
            setQuizStartedAt(Date.now());
            setSumTiempoSeg(0);
            setOkCount(0);
            setBadCount(0);
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




    const renderABCD = (q: Pregunta) => {
        const sel: number | null = respuestas[q.codPregunta]?.abcd ?? null;
        const setSel = (cod: number) => {
            setResp(q.codPregunta, { abcd: sel === cod ? null : cod });
        };



        const opcionesVisibles = (q.opciones ?? []).filter(o => !ocultas.includes(o.codOpcion));
        if (q.tipo === 'abcd' && opcionesVisibles.length === 0) {
            return <Text style={[g.text.caption, { marginTop: 8 }]}>Sin opciones disponibles.</Text>;
        }

        return (
            <View style={{ marginTop: 12 }}>
                {opcionesVisibles.map(op => {
                    const checked = sel === op.codOpcion;
                    return (
                        <Pressable
                            key={op.codOpcion}
                            onPress={() => setSel(op.codOpcion)}
                            style={{
                                padding: 12,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: checked ? colors.primary : colors.divider,
                                backgroundColor: checked ? (isDark ? '#0b1022' : '#fff7ed') : 'transparent',
                                marginBottom: 8
                            }}>
                            <Text style={{ color: colors.text }}>{op.texto}</Text>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    const renderRellenar: (q: Pregunta) => React.ReactNode = (q) => (
        <TextInput
            placeholder="Tu respuesta"
            placeholderTextColor={colors.mutedText}
            value={respuestas[q.codPregunta]?.rellenar ?? ''}
            onChangeText={(t) => setResp(q.codPregunta, { rellenar: t })}
            onSubmitEditing={() => onQuizPrimaryPress()}  // enter = responder y avanzar
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
            style={{
                borderWidth: 1,
                borderColor: colors.divider,
                borderRadius: 10,
                padding: 10,
                color: colors.text,
                marginTop: 8,
            }}
        />
    );


    /** ─── Pantalla/Overlay de resultado ───────────────────────────── */
    const AnswerScreen = (): React.ReactNode => {
        if (!fbVisible || fbOk === null) return null;
        const ok = !!fbOk;

        return (
            <View style={{
                position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                backgroundColor: ok ? 'rgba(16,185,129,0.90)' : 'rgba(239,68,68,0.90)',
                alignItems: 'center', justifyContent: 'center', padding: 24
            }}>
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    paddingVertical: 28,
                    paddingHorizontal: 22,
                    alignItems: 'center',
                    width: '86%',
                    maxWidth: 460,
                    borderWidth: 2,
                    borderColor: ok ? '#10b981' : '#ef4444'
                }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: ok ? '#065f46' : '#7f1d1d' }}>
                        {ok ? '¡Correcto!' : 'Incorrecto'}
                    </Text>
                    {!!fbMsg && (
                        <Text style={{ marginTop: 10, fontSize: 16, textAlign: 'center', color: '#111827' }}>
                            {fbMsg}
                        </Text>
                    )}

                    {/* Botones especiales cuando es incorrecto */}
                    {!ok && (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion && (
                        <View style={{ marginTop: 16, width: '100%', gap: 10 }}>
                            <Pressable
                                onPress={async () => {
                                    if (!(await usarComodin('phoenix'))) return;

                                    if (fbTimer) clearTimeout(fbTimer);
                                    // Descontar la mala recién contada
                                    setBadCount(p => Math.max(0, p - 1));

                                    if (preguntaActual) {
                                        // Limpia la respuesta guardada para esta pregunta
                                        setRespuestas((prevResp: any) => {
                                            const next = { ...prevResp };
                                            delete next[preguntaActual.codPregunta];
                                            return next;
                                        });

                                        // Limpia el registro de correcto/incorrecto para esta pregunta
                                        setAnsweredCorrect((prevMap: Record<number, boolean>) => {
                                            const next = { ...prevMap };
                                            delete next[preguntaActual.codPregunta];
                                            return next;
                                        });
                                    }


                                    setTiempo(tiempoPorPregunta);
                                    setOcultas([]);
                                    setFbVisible(false);
                                }}
                                style={{
                                    backgroundColor: '#1d4ed8',
                                    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Reintentar (Ave Fénix)</Text>
                            </Pressable>

                            <Pressable
                                onPress={async () => {
                                    const f = advanceRef.current;
                                    setFbVisible(false);
                                    if (f) await f();
                                }}
                                style={{
                                    backgroundColor: '#6b7280',
                                    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Continuar</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Mensaje de avance automático cuando es correcto o no hay fénix */}
                    {(ok || !(inv.phoenix ?? 0) || usedPowerupForQuestion) && (
                        <Text style={{ marginTop: 14, color: '#374151' }}>Avanzando…</Text>
                    )}
                </View>
            </View>
        );
    };


    /** ─── Pantalla de Resumen final (FULL SCREEN dentro del mismo [id]) ── */
    const SummaryScreen = (): React.ReactNode => {
        if (!summary.visible) return null;

        const textColor = isDark ? '#E5E7EB' : '#111827'; // gris claro en dark / gris muy oscuro en light

        return (
            <View style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#fff' }}>
                <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
                    <View style={{ alignSelf: 'center', width: '92%', maxWidth: 520 }}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#c62828', marginBottom: 18 }}>
                            Resumen
                        </Text>

                        <View style={{ gap: 8 }}>
                            <Text style={[g.text.body, { color: textColor }]}>
                                <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>
                                    Tiempo
                                </Text> : {summary.tiempoTotal} seg
                            </Text>
                            <Text style={[g.text.body, { color: textColor }]}>
                                <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>
                                    Respuestas correctas
                                </Text> : {summary.ok}
                            </Text>
                            <Text style={[g.text.body, { color: textColor }]}>
                                <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>
                                    Respuestas incorrectas
                                </Text> : {summary.bad}
                            </Text>
                            <Text style={[g.text.body, { color: textColor }]}>
                                <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>
                                    Monedas ganadas
                                </Text> : ${summary.coins}
                            </Text>
                            <Text style={[g.text.body, { color: textColor }]}>
                                <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>
                                    XP
                                </Text> : {summary.xp}
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => {
                                setSummary(s => ({ ...s, visible: false }));
                                markModalClosed();
                                router.back();
                            }}
                            style={{
                                marginTop: 24, alignSelf: 'center',
                                backgroundColor: '#22c55e', // ✅ verde
                                paddingVertical: 14, paddingHorizontal: 28,
                                borderRadius: 999,
                                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4
                            }}
                        >
                            <Text style={[g.text.smallStrong, { color: '#ffffff' }]}>Continuar</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    };




    const renderEmparejar = (_q: Pregunta) => (
        <Text style={[g.text.caption, {marginTop: 8}]}>
            Para emparejar usa el campo de texto (ej: 1-6,2-5,3-4). En producción puedes poner un UI drag&drop.
        </Text>
    );

    /** ─── Cabecera del quiz: progreso + timer + contador ──────── */
    const QuizHeader = () => (
        <View style={{ marginTop: 10 }}>
            {/* Progreso */}
            <View style={{ height: 8, backgroundColor: colors.divider, borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${progresoPct}%`, height: 8, backgroundColor: colors.primary }} />
            </View>

            {/* Timer + contador */}
            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={g.text.bodyStrong}>⏱ {tiempo}s</Text>
                <Text style={g.text.bodyStrong}>{idx + 1}/{totalPreg}</Text>
            </View>
        </View>
    );

    /** ─── Barra inferior: comodines ───────────────────────────── */
    const ComodinesBar = () => {
        if (!resolviendo || !preguntaActual) return null;

        const fiftyEnabled = (inv['50-50'] ?? 0) > 0 && preguntaActual?.tipo === 'abcd' && !usedPowerupForQuestion;
        const extraEnabled = (inv.extra_time ?? 0) > 0 && !usedPowerupForQuestion;
        const x2Enabled    = (inv.x2 ?? 0) > 0 && !usedPowerupForQuestion;
        const shieldEnabled= (inv.streak_shield ?? 0) > 0 && !usedPowerupForQuestion && idx > 0;

        return (
            <View
                style={{
                    position: 'absolute',
                    left: 0, right: 0, bottom: 0,
                    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
                    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.divider,
                }}
            >
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {/* 50-50 */}
                    <Pressable
                        disabled={!fiftyEnabled}
                        onPress={async () => {
                            if (!preguntaActual?.opciones?.length) return;
                            if (!(await usarComodin('50-50'))) return;

                            const ops = preguntaActual.opciones;
                            const correcta = ops.find(o => Number(o.correcta) === 1);
                            const incorrectas = ops.filter(o => Number(o.correcta) !== 1);
                            if (!correcta || incorrectas.length < 2) {
                                Alert.alert('50-50', 'No se puede aplicar (no hay suficientes opciones incorrectas).');
                                return;
                            }
                            const shuffled = [...incorrectas].sort(() => Math.random() - 0.5);
                            const ocultar = shuffled.slice(0, 2).map(x => x.codOpcion);
                            setOcultas(ocultar);
                        }}
                        style={{
                            flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                            backgroundColor: fiftyEnabled ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>50-50</Text>
                    </Pressable>

                    {/* +15s */}
                    {/* Extra tiempo (dinámico; se recalcula al click) */}
                    <Pressable
                        disabled={!extraEnabled}
                        onPress={async () => {
                            // Recalcula segundos “ahora” (para soportar correctamente el caso “→ HH:mm”)
                            const metaNow = (data?.metadataReto ?? (data as any)?.reto?.metadataReto ?? {}) as any;
                            const cfgNow = getExtraTimeConfig(metaNow); // { seconds, format, label, hastaHHmm }

                            const payload = {
                                seconds: cfgNow.seconds,
                                format: cfgNow.format,
                                hastaHHmm: cfgNow.hastaHHmm,
                            };

                            const ok = await usarComodin('extra_time', { payload, sobrePreguntaId: preguntaActual?.codPregunta });
                            if (!ok) return;

                            // Aplica el delta local. Si venía “hasta HH:mm”, seconds ya es el diff calculado “ahora”.
                            setTiempo(t => Math.max(0, t) + Math.max(1, Math.floor(cfgNow.seconds || 0)));
                        }}
                        style={{
                            flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                            backgroundColor: extraEnabled ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>
                            {extraTimeCfg?.label ?? '+15s'}
                        </Text>
                    </Pressable>




                    {/* x2 */}
                    <Pressable
                        disabled={!x2Enabled}
                        onPress={async () => {
                            if (!(await usarComodin('x2'))) return;
                            setX2AppliedTo(prev => {
                                const next = new Set(prev);
                                next.add(preguntaActual.codPregunta);
                                return next;
                            });
                        }}
                        style={{
                            flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                            backgroundColor: x2Enabled ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>x2</Text>
                    </Pressable>

                    {/* Protector de racha */}
                    <Pressable
                        disabled={!shieldEnabled}
                        onPress={async () => {
                            const prevIdx = idx - 1;
                            const prevQ = data?.quiz?.preguntas?.[prevIdx];
                            if (!prevQ) return;

                            if (answeredCorrect[prevQ.codPregunta] !== false) {
                                Alert.alert('Protector de racha', 'No tienes una respuesta anterior incorrecta que proteger.');
                                return;
                            }
                            if (!(await usarComodin('streak_shield', { sobrePreguntaId: prevQ.codPregunta }))) return;

                            setBadCount(p => Math.max(0, p - 1));
                            setOkCount(p => p + 1);
                            setAnsweredCorrect(prev => ({ ...prev, [prevQ.codPregunta]: true }));
                        }}
                        style={{
                            flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                            backgroundColor: shieldEnabled ? colors.primary : colors.divider
                        }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>Racha</Text>
                    </Pressable>
                </View>
            </View>
        );
    };


    /** ─── Overlay de feedback (Correcto / Incorrecto) ──────────── */
    const FeedbackToast = (): React.ReactNode => {
        if (!fbVisible) return null;
        return (
            <View style={{
                position: 'absolute',
                left: 16, right: 16, bottom: 24,
                paddingVertical: 12, paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: fbOk ? '#d1fae5' : '#fee2e2',
                borderWidth: 1,
                borderColor: fbOk ? '#10b981' : '#ef4444',
                alignItems: 'center'
            }}>
                <Text style={{ color: fbOk ? '#065f46' : '#7f1d1d', fontWeight: '700' }}>
                    {fbOk ? '✔ Correcto' : '✖ Incorrecto'}
                </Text>
                {!!fbMsg && (
                    <Text style={{ marginTop: 4, color: fbOk ? '#065f46' : '#7f1d1d' }}>
                        {fbMsg}
                    </Text>
                )}
            </View>
        );
    };




    const responderYAvanzar = async (
        { skip = false, autoPorTiempo = false }: { skip?: boolean; autoPorTiempo?: boolean } = {}
    ) => {
        if (!data || !preguntaActual) return;
        const curUR = codUsuarioReto ?? ur?.codUsuarioReto;
        if (!curUR) { Alert.alert('Ups', 'Falta codUsuarioReto'); return; }

        // Construir valor_json compatible con backend/BD
        let valor: any = null;

        if (skip || autoPorTiempo) {
            valor = preguntaActual.tipo === 'abcd'
                ? { abcd: [] }
                : preguntaActual.tipo === 'rellenar'
                    ? { rellenar: '' }
                    : {};
        } else {
            const v = respuestas[preguntaActual.codPregunta];

            if (preguntaActual.tipo === 'abcd') {
                const cod = Number(v?.abcd ?? NaN);
                if (!Number.isFinite(cod)) {
                    Alert.alert('Selecciona una opción');
                    return;
                }
                valor = { abcd: [cod] };
            } else if (preguntaActual.tipo === 'rellenar') {
                const txt = (v?.rellenar ?? '').toString().trim();
                if (!txt) {
                    Alert.alert('Escribe tu respuesta');
                    return;
                }
                valor = { rellenar: txt };
            } else {
                valor = v ?? {};
            }
        }

        // Tiempo consumido: clamp a número entero no negativo
        const tiempoRestante = Math.max(0, Number(tiempo ?? 0));
        const limite = Number(preguntaActual.tiempoMax ?? tiempoPorPregunta ?? 30);
        const tiempoSeg = Math.max(0, Math.floor(limite - tiempoRestante));

        try {
            const r = await fetchJson(
                `/mis-retos/${curUR}/quiz/responder`,
                asJson({
                    codUsuarioReto: curUR,
                    codPregunta: preguntaActual.codPregunta,
                    valor,
                    tiempoSeg,
                })
            );


            // ── Feedback inmediato (si el back lo envía) ─────────────────
            let fueCorrecta: boolean | null = null;
            if (r && typeof r === 'object') {
                const k: any = r;
                if (typeof k.esCorrecta === 'boolean') fueCorrecta = k.esCorrecta;
                else if (typeof k.correcta === 'boolean') fueCorrecta = k.correcta;

                if (typeof k.explicacion === 'string' && k.explicacion.trim()) {
                    setFbMsg(k.explicacion);
                } else {
                    setFbMsg('');
                }
            }

            // Si no vino del back y la pregunta es ABCD, inferimos localmente
            if (fueCorrecta === null && preguntaActual.tipo === 'abcd' && !skip && !autoPorTiempo) {
                const sel = respuestas[preguntaActual.codPregunta]?.abcd;
                const op = (preguntaActual.opciones ?? []).find(o => o.codOpcion === sel);
                if (op && typeof op.correcta === 'number') {
                    fueCorrecta = op.correcta === 1;
                }
            }

            // Si no vino del back y la pregunta es RELLENAR, inferimos localmente
            if (fueCorrecta === null && preguntaActual.tipo === 'rellenar' && !skip && !autoPorTiempo) {
                const txt = String(respuestas[preguntaActual.codPregunta]?.rellenar ?? '');
                fueCorrecta = esRellenarCorrecto(preguntaActual as any, txt);
            }

            setAnsweredCorrect(prev => ({ ...prev, [preguntaActual.codPregunta]: !!fueCorrecta }));

// ── Acumular métricas LOCALES ─────────────────────────────────────
            const fueOK = (fueCorrecta === true); // null/false => incorrecta
            const nextTiempo = sumTiempoSeg + tiempoSeg;
            const nextOk = okCount + (fueOK ? 1 : 0);
            const nextBad = badCount + (fueOK ? 0 : 1);

// actualiza estado (pintará después)
            setSumTiempoSeg(p => p + tiempoSeg);
            if (fueOK) setOkCount(p => p + 1);
            else setBadCount(p => p + 1);

// ── Avance/finalización ───────────────────────────────────────────
            const total = data.quiz?.preguntas?.length ?? 0;
            const esUltima = (idx + 1) >= total;

            const avanzar = async () => {
                if (!esUltima) {
                    setIdx(prev => prev + 1);
                    setOcultas([]); // resetea 50-50
                } else {
                    await finalizar({ ok: nextOk, bad: nextBad, tiempo: nextTiempo });
                }
            };

// ✅ Usa la MISMA fueOK; calcula disponibilidad de Fénix aquí
            const phoenixDisponible = (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion;

            if (fueCorrecta !== null) {
                if (fbTimer) clearTimeout(fbTimer);
                setFbOk(fueCorrecta);
                setFbVisible(true);

                if (!fueOK && phoenixDisponible) {
                    // no avanzamos; guardamos el avance para "Continuar"
                    advanceRef.current = async () => {
                        setFbVisible(false);
                        await avanzar();
                    };
                } else {
                    const t = setTimeout(async () => {
                        setFbVisible(false);
                        await avanzar();
                    }, 1000);
                    setFbTimer(t);
                }
            } else {
                await avanzar();
            }


        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos guardar tu respuesta');
        }
    };



    const finalizar = async (totals?: { ok?: number; bad?: number; tiempo?: number }) => {
        const curUR = codUsuarioReto ?? ur?.codUsuarioReto;

        // 🔢 Cálculo de recompensas según metadata del reto
        const computeRewards = (ok: number, bad: number) => {
            const meta: any = (data?.metadataReto ?? (data as any)?.reto?.metadataReto ?? {}) as any;

            const xpOk  = Number(meta?.xpCorrecta ?? 0);
            const xpBad = Number(meta?.xpIncorrecta ?? 0);
            const cOk   = Number(meta?.monedasCorrecta ?? 0);
            const cBad  = Number(meta?.monedasIncorrecta ?? 0);

            // Correctas que además tenían x2 activado
            let x2CorrectCount = 0;
            x2AppliedTo.forEach(qid => {
                if (answeredCorrect[qid]) x2CorrectCount += 1;
            });

            // Base por pregunta
            const baseXP    = ok * xpOk + bad * xpBad;
            const baseCoins = ok * cOk  + bad * cBad;

            // Bonus x2: se agrega de nuevo el premio por cada correcta con x2
            const bonusXP    = x2CorrectCount * xpOk;
            const bonusCoins = x2CorrectCount * cOk;

            const gano = ok > 0; // regla: al menos una correcta
            return {
                xp:   gano ? (baseXP + bonusXP) : 0,
                coins:gano ? (baseCoins + bonusCoins) : 0,
            };
        };


        // 🟡 Fallback local (sin UR / sin backend): mostramos resumen del QUIZ
        if (!curUR) {
            if (data?.tipoReto === 'quiz') {
                const totalSeg = totals?.tiempo ?? sumTiempoSeg;
                const ok  = totals?.ok  ?? okCount;
                const bad = totals?.bad ?? badCount;

                const { xp, coins } = computeRewards(ok, bad);

                setSummary({
                    visible: true,
                    tiempoTotal: totalSeg,
                    ok,
                    bad,
                    xp,
                    coins,
                });
            }
            return;
        }

        // 🟢 Camino normal: cerramos en backend (sin depender de r.xpGanada/r.coins)
        try {
            await fetchJson<any>(
                `/mis-retos/${curUR}/finalizar`,
                asJson({ codUsuarioReto: curUR })
            );

            await cargarComodinesDesdeInventario().catch(() => {}); // opcional

            if (data?.tipoReto === 'quiz') {
                const totalSeg = totals?.tiempo ?? sumTiempoSeg;
                const ok  = totals?.ok  ?? okCount;
                const bad = totals?.bad ?? badCount;
                const { xp, coins } = computeRewards(ok, bad);
                setSummary({ visible: true, tiempoTotal: totalSeg, ok, bad, xp, coins });
                return;
            }

            Alert.alert('Reto completado', 'Tu formulario fue enviado.');
            markModalClosed();
            router.back();
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos finalizar');
        }
    };





    // Botón principal en quiz: ahora solo responde/avanza;
// finalizar se llama desde responderYAvanzar cuando corresponde.
    const onQuizPrimaryPress = async () => {
        await responderYAvanzar();
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

                        {defs.map((def, iDef) => {
                            const fallback: ItemValor = {
                                n: def.n,
                                selector: def.selector,
                                valor: null,
                                observacion: ''
                            };
                            const val = itemsVals.find(x => x.n === def.n) ?? fallback;
                            const zebra = (iDef % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;                            return (
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

// 🟢 Si el resumen está visible, mostramos SOLO la "pantalla" de resumen (full screen)
    if (summary.visible) {
        return (
            <SafeAreaView style={styles.safe}>
                <SummaryScreen />
            </SafeAreaView>
        );
    }

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

                            <QuizHeader />
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

                            <Pressable
                                onPress={onQuizPrimaryPress}
                                style={{
                                    marginTop: 18,
                                    paddingVertical: 14,
                                    paddingHorizontal: 28,
                                    backgroundColor: (idx + 1 < (data.quiz?.preguntas?.length ?? 0)) ? '#facc15' : '#f97316', // amarillo / naranja
                                    borderRadius: 999,
                                    alignSelf: 'center'
                                }}
                            >
                                <Text
                                    style={[
                                        g.text.smallStrong,
                                        {
                                            color: (idx + 1 < (data.quiz?.preguntas?.length ?? 0)) ? '#1f2937' : '#ffffff', // texto oscuro en amarillo, blanco en naranja
                                            fontWeight: '800'
                                        }
                                    ]}
                                >
                                    {(idx + 1 < (data.quiz?.preguntas?.length ?? 0)) ? 'Siguiente' : 'Finalizar'}
                                </Text>
                            </Pressable>


                        </ScrollView>
                    ) : null}

                    <AnswerScreen />

                    {/* 🔔 Aquí insertas el overlay de feedback */}
                    <FeedbackToast />
                    {/* Barra fija de comodines */}
                    <ComodinesBar />
                </View>
            )}
        </SafeAreaView>
    );
}
