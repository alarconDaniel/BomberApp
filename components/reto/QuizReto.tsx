// components/reto/QuizReto.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, ScrollView, Pressable, TextInput, Alert, SafeAreaView
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { Pregunta, asJson } from './utils';

type PowerupKey = '50/50' | 'extra_time' | 'x2' | 'phoenix';
type RespuestasMap = Record<number, any>;

const _toInt = (x: any) => Number(x) || 0;
const _pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

const _parseISODur = (raw: string): number | null => {
    const m = /^P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)$/i.exec((raw || '').trim());
    if (!m) return null;
    const h = _toInt(m[2]), mn = _toInt(m[3]), s = _toInt(m[4]);
    return h * 3600 + mn * 60 + s;
};
const _parseOffsetPieces = (s: string): number | null => {
    const re = /^(\+)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i;
    const m = re.exec((s || '').replace(/\s+/g, '').toLowerCase());
    if (!m) return null;
    const h = _toInt(m[2]), mn = _toInt(m[3]), sec = _toInt(m[4]);
    if (h === 0 && mn === 0 && sec === 0) return null;
    return h * 3600 + mn * 60 + sec;
};
const _parsePlainNumber = (s: string): number | null => {
    const t = (s || '').trim().toLowerCase();
    if (/^\+?\d+$/.test(t)) return _toInt(t.replace('+', ''));
    const mS = /^(\+)?(\d+)\s*s(ec|eg|egundos)?$/.exec(t);
    if (mS) return _toInt(mS[2]);
    const mM = /^(\+)?(\d+)\s*m(in|inutos)?$/.exec(t);
    if (mM) return _toInt(mM[2]) * 60;
    const mH = /^(\+)?(\d+)\s*h(oras?)?$/.exec(t);
    if (mH) return _toInt(mH[2]) * 3600;
    return null;
};

type ExtraTimeSpec = { seconds: number; format: 'offset' | 'until'; label: string; hastaHHmm?: string };
const parseExtraTimeSpec = (raw: any): ExtraTimeSpec => {
    const fallback: ExtraTimeSpec = { seconds: 15, format: 'offset', label: '+15s' };
    if (raw == null) return fallback;
    if (typeof raw === 'number' && isFinite(raw) && raw > 0) {
        const s = Math.floor(raw);
        return { seconds: s, format: 'offset', label: `+${s}s` };
    }
    if (typeof raw !== 'string') return fallback;
    const s = raw.trim();

    if (/^P(T.*)$/i.test(s)) {
        const secs = _parseISODur(s);
        if (secs && secs > 0) {
            const lbl = secs % 60 === 0 ? `+${Math.floor(secs / 60)}m` : `+${secs}s`;
            return { seconds: secs, format: 'offset', label: lbl };
        }
    }
    const mm = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (mm) {
        const hh = _toInt(mm[1]), m = _toInt(mm[2]);
        if (hh >= 0 && hh <= 23 && m >= 0 && m <= 59) {
            const now = new Date();
            const target = new Date(now);
            target.setHours(hh, m, 0, 0);
            const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
            return { seconds: diff, format: 'until', label: `→ ${_pad2(hh)}:${_pad2(m)}`, hastaHHmm: `${_pad2(hh)}:${_pad2(m)}` };
        }
    }
    const mms = /^(\d{1,3}):(\d{2})$/.exec(s);
    if (mms) {
        const mn = _toInt(mms[1]), sec = _toInt(mms[2]);
        if (sec <= 59) {
            const secs = mn * 60 + sec;
            return { seconds: secs, format: 'offset', label: `+${mn}m${sec ? sec + 's' : ''}` };
        }
    }
    const pieces = _parseOffsetPieces(s);
    if (pieces && pieces > 0) {
        const lbl = pieces % 60 === 0 ? `+${Math.floor(pieces / 60)}m` : `+${pieces}s`;
        return { seconds: pieces, format: 'offset', label: lbl };
    }
    const plain = _parsePlainNumber(s);
    if (plain && plain > 0) {
        const lbl = plain % 60 === 0 ? `+${Math.floor(plain / 60)}m` : `+${plain}s`;
        return { seconds: plain, format: 'offset', label: lbl };
    }
    return fallback;
};

const _norm = (s: string) =>
    (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const resolvePowerupKey = (name?: string): PowerupKey | null => {
    const n = _norm(name || '');
    if (!n) return null;
    if (n.includes('50 50') || n.includes('5050') || n.includes('fifty')) return '50/50';
    if (n.includes('x2') || n.includes('doble') || n.includes('double') || n.includes('boost')) return 'x2';
    if (n.includes('phoenix') || n.includes('fenix') || n.includes('fénix') || n.includes('ave fenix') || n.includes('ave fénix')) return 'phoenix';
    if (n.includes('extra') || n.includes('tiempo') || n.includes('15s') || n.includes('+15')) return 'extra_time';
    return null;
};

const mapInventoryToPowerups = (items: any[] | undefined | null): Record<PowerupKey, number> => {
    const acc: Record<PowerupKey, number> = { '50/50': 0, extra_time: 0, x2: 0, phoenix: 0 };
    for (const it of items || []) {
        const qty = Number((it as any)?.cantidad ?? 0) || 0;
        some: {
            const name = (it as any)?.item?.nombre as string | undefined;
            const key = resolvePowerupKey(name);
            if (key) acc[key] += qty;
        }
    }
    return acc;
};

const serverTipoFromKey = (k: PowerupKey) => {
    switch (k) {
        case '50/50': return '50/50';
        case 'extra_time': return 'mas_tiempo';
        case 'x2': return 'double';
        case 'phoenix': return 'ave_fenix';
        default: return k as string;
    }
};

/** ===========================
 *  Emparejar — helpers
 *  =========================== */
type MatchItem = { id: number; label: string };
type MatchData = { A: MatchItem[]; B: MatchItem[] };
type Pair = { a: number; b: number };
const keyAB = (a: number, b: number) => `${a}-${b}`;

function extractMatchData(p: any): MatchData | null {
    const cand1 = p?.emparejar;
    const cand2 = p?.items;
    const cand3 = p;

    const getArr = (obj: any, key: string): MatchItem[] | null => {
        const raw = obj?.[key];
        if (!Array.isArray(raw)) return null;
        return raw
            .map((r: any) => {
                const id = Number(r?.codItem ?? r?.id ?? r?.cod_item ?? r?.codigo ?? NaN);
                const label = (r?.contenido ?? r?.texto ?? r?.label ?? r?.nombre ?? '').toString();
                return Number.isFinite(id) && label ? { id, label } : null;
            })
            .filter(Boolean) as MatchItem[];
    };

    if (cand1 && getArr(cand1, 'A') && getArr(cand1, 'B')) {
        return { A: getArr(cand1, 'A')!, B: getArr(cand1, 'B')! };
    }
    if (cand2 && getArr(cand2, 'A') && getArr(cand2, 'B')) {
        return { A: getArr(cand2, 'A')!, B: getArr(cand2, 'B')! };
    }
    const itemsA = getArr(cand3, 'itemsA') || getArr(cand3, 'a') || null;
    const itemsB = getArr(cand3, 'itemsB') || getArr(cand3, 'b') || null;
    if (itemsA && itemsB) return { A: itemsA, B: itemsB };

    return null;
}

/** ===========================
 *  Componente principal
 *  =========================== */
export default function QuizReto({
                                     codUsuarioReto,
                                     preguntas,
                                     fetchJson,
                                     onFinish,
                                 }: {
    codUsuarioReto: number;
    preguntas: Pregunta[];
    fetchJson: <T = any>(url: string, init?: any) => Promise<T>;
    onFinish: (res?: { xp: number; coins: number; nuevaRacha?: number | null }) => void;
}) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    const total = preguntas.length;
    const [idx, setIdx] = useState(0);
    const [tiempo, setTiempo] = useState<number>(30);
    const [ocultas, setOcultas] = useState<number[]>([]);
    const [respuestas, setRespuestas] = useState<RespuestasMap>({});
    const [usedPowerupForQuestion, setUsedPowerupForQuestion] = useState<PowerupKey | null>(null);

    // emparejar: pares y selección A
    const [pairsByQ, setPairsByQ] = useState<Record<number, Pair[]>>({});
    const [selectedAByQ, setSelectedAByQ] = useState<Record<number, number | null>>({});
    const selectedARef = useRef<Record<number, number | null>>({});

    // emparejar: veredicto por pregunta tras validar
    const [verdictByQ, setVerdictByQ] = useState<Record<number, { checked: boolean; correct: Set<string>; wrong: Set<string> }>>({});

    // x2 solo una vez por quiz
    const [x2UsadoEnQuiz, setX2UsadoEnQuiz] = useState(false);

    // feedback (solo para abcd/rellenar)
    const [fbVisible, setFbVisible] = useState(false);
    const [fbOk, setFbOk] = useState<boolean | null>(null);
    const [fbMsg, setFbMsg] = useState<string>('');
    const [fbTimer, setFbTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (fbTimer) clearTimeout(fbTimer); }, [fbTimer]);

    const [okCount, setOkCount] = useState(0);
    const [badCount, setBadCount] = useState(0);
    const [sumTiempoSeg, setSumTiempoSeg] = useState(0);

    const finishingRef = useRef(false);
    const usingPowerupRef = useRef(false);

    // inventario
    const [inv, setInv] = useState<Record<PowerupKey, number>>({
        '50/50': 0, extra_time: 0, x2: 0, phoenix: 0,
    });

    // ⏱ control del timer: ref + pausa
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerPausedRef = useRef(false);
    const pauseTimer = () => {
        timerPausedRef.current = true;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    // Colores consistentes para feedback
    const successBG = '#dcfce7';
    const successBorder = '#16a34a';
    const successText = '#065f46';

    const errorBG = '#fee2e2';
    const errorBorder = '#ef4444';
    const errorText = '#7f1d1d';

    const baseCardBG = (isDark ? colors.card : '#fff');

    const cargarComodinesDesdeInventario = async () => {
        try {
            const resp: any = await fetchJson('/item-inventario/listar');
            const arr = Array.isArray((resp as any)?.items) ? (resp as any).items : [];
            const norm = mapInventoryToPowerups(arr);
            setInv(norm);
        } catch { }
    };
    useEffect(() => { cargarComodinesDesdeInventario().catch(() => { }); }, []);

    const preguntaActual = preguntas[idx];
    const tiempoPorPregunta = useMemo<number>(() => {
        return Math.max(1, Number(preguntaActual?.tiempoMax ?? 30) || 30);
    }, [preguntaActual?.tiempoMax]);

    useEffect(() => {
        if (!preguntaActual) return;

        setTiempo(tiempoPorPregunta);
        setOcultas([]);
        setUsedPowerupForQuestion(null);

        // reset emparejar selection/veredicto al cambiar de pregunta
        selectedARef.current[preguntaActual.codPregunta] = null;
        setSelectedAByQ(prev => ({ ...prev, [preguntaActual.codPregunta]: null }));
        setVerdictByQ(prev => ({
            ...prev,
            [preguntaActual.codPregunta]:
            prev[preguntaActual.codPregunta] ?? { checked: false, correct: new Set(), wrong: new Set() }
        }));

        // al entrar a una pregunta, reanudamos timer
        timerPausedRef.current = false;
        if (timerRef.current) { clearInterval(timerRef.current); }
        timerRef.current = setInterval(() => {
            if (timerPausedRef.current) return;
            setTiempo(t => {
                if (t <= 1) {
                    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                    if (!finishingRef.current) {
                        finishingRef.current = true;
                        responderYAvanzar({ autoPorTiempo: true })
                            .catch(() => { })
                            .finally(() => { finishingRef.current = false; });
                    }
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    }, [idx, preguntaActual?.codPregunta, tiempoPorPregunta]);

    const setResp = (codPregunta: number, v: any) =>
        setRespuestas(prev => ({ ...prev, [codPregunta]: v }));

    const extraTimeCfg = parseExtraTimeSpec('15s');

    const usarComodin = async (
        key: PowerupKey,
        opts?: { sobrePreguntaId?: number; payload?: any }
    ): Promise<boolean> => {
        if (usingPowerupRef.current) return false;
        usingPowerupRef.current = true;
        try {
            if (usedPowerupForQuestion && key !== 'x2') {
                Alert.alert('Comodines', 'Solo puedes usar 1 comodín por pregunta.');
                return false;
            }
            if ((inv[key] ?? 0) <= 0) {
                Alert.alert('Comodines', 'No tienes este comodín disponible.');
                return false;
            }
            if (key === 'x2' && x2UsadoEnQuiz) {
                Alert.alert('x2', 'Ya usaste x2 en este quiz.');
                return false;
            }

            // Descuento optimista
            setInv(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) - 1) }));
            if (key !== 'x2') setUsedPowerupForQuestion(key);

            const urId = codUsuarioReto || null;
            const codPregunta = opts?.sobrePreguntaId ?? preguntaActual?.codPregunta;
            if (!urId) return true;

            const body: any = { codUsuarioReto: urId, codPregunta, tipo: serverTipoFromKey(key) };
            if (key === 'extra_time') {
                const seconds = Math.max(1, Math.floor(Number(opts?.payload?.seconds ?? 15) || 0));
                const hasta = typeof opts?.payload?.hastaHHmm === 'string' ? opts?.payload?.hastaHHmm : undefined;
                body.segundos = seconds; if (hasta) body.hasta = hasta;
            }

            try {
                await fetchJson(`/mis-retos/${urId}/comodines/usar`, asJson(body));
                await cargarComodinesDesdeInventario().catch(() => { });
                if (key === 'x2') setX2UsadoEnQuiz(true);
                return true;
            } catch (e: any) {
                setInv(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
                if (key !== 'x2') setUsedPowerupForQuestion(null);
                Alert.alert('Comodines', e?.message || 'No se pudo usar el comodín.');
                return false;
            }
        } finally {
            usingPowerupRef.current = false;
        }
    };

    const reintentarConPhoenix = async () => {
        if (!preguntaActual) return;
        const ok = await usarComodin('phoenix', { sobrePreguntaId: preguntaActual.codPregunta });
        if (!ok) return;
        setFbVisible(false);
        setFbOk(null);
        setFbMsg('');
    };

    /** ===========================
     *  Validar y avanzar
     *  =========================== */
    const validarEmparejar = async () => {
        if (!preguntaActual) return;
        pauseTimer(); // ⏱ pausa el cronómetro al validar emparejar

        const list = pairsByQ[preguntaActual.codPregunta] ?? [];
        if (list.length === 0) {
            Alert.alert('Emparejar', 'Crea al menos una pareja A→B.');
            return;
        }

        const valor = { emparejar: list.map(p => [p.a, p.b]) };

        const limite = Number(preguntaActual.tiempoMax ?? tiempoPorPregunta ?? 30);
        const tiempoRest = Math.max(0, Number(tiempo ?? 0));
        const tiempoSeg = Math.max(0, Math.floor(limite - tiempoRest));

        try {
            const r: any = await fetchJson(
                `/mis-retos/${codUsuarioReto}/quiz/responder`,
                asJson({
                    codUsuarioReto,
                    codPregunta: preguntaActual.codPregunta,
                    valor,
                    tiempoSeg,
                })
            );

            const toBool = (v: any) =>
                (typeof v === 'boolean') ? v :
                    (v === 1) ? true :
                        (v === 0) ? false : null;

            const fueCorrecta: boolean | null = toBool(r?.esCorrecta) ?? toBool(r?.correcta);

            // calcular veredicto por pares
            const enviadosKeys = new Set(list.map(p => keyAB(p.a, p.b)));
            const correctSetFromServer: Set<string> = new Set(
                Array.isArray(r?.paresCorrectos)
                    ? (r.paresCorrectos as any[]).map((x: any) => keyAB(Number(x?.a ?? x[0]), Number(x?.b ?? x[1])))
                    : []
            );

            const correct: Set<string> = new Set();
            const wrong: Set<string> = new Set();

            if (correctSetFromServer.size > 0) {
                enviadosKeys.forEach(k => { if (correctSetFromServer.has(k)) correct.add(k); else wrong.add(k); });
            } else if (fueCorrecta !== null) {
                enviadosKeys.forEach(k => { (fueCorrecta ? correct : wrong).add(k); });
            }

            setVerdictByQ(prev => ({
                ...prev,
                [preguntaActual.codPregunta]: { checked: true, correct, wrong }
            }));

            if (typeof r?.explicacion === 'string' && r.explicacion.trim()) setFbMsg(r.explicacion);
            else setFbMsg('');

            // acumular stats
            const fueOK = (fueCorrecta === true);
            if (fueOK) setOkCount(p => p + 1); else setBadCount(p => p + 1);
            setSumTiempoSeg(p => p + tiempoSeg);
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos validar tu respuesta');
        }
    };

    const responderYAvanzar = async ({ autoPorTiempo = false }: { autoPorTiempo?: boolean } = {}) => {
        if (!preguntaActual) return;

        // si es emparejar y NO viene por autoPorTiempo, usamos flujo especial
        if (preguntaActual.tipo === 'emparejar' && !autoPorTiempo) {
            pauseTimer(); // ⏱ pausa al validar manual
            await validarEmparejar();
            return; // NO avanzar aquí
        }

        if (!autoPorTiempo) pauseTimer(); // ⏱ pausa para ABCD / rellenar

        let valor: any = null;
        if (autoPorTiempo) {
            valor = preguntaActual.tipo === 'abcd'
                ? { abcd: [] }
                : preguntaActual.tipo === 'rellenar'
                    ? { rellenar: '' }
                    : preguntaActual.tipo === 'emparejar'
                        ? { emparejar: [] }
                        : {};
        } else {
            const v = respuestas[preguntaActual.codPregunta];
            if (preguntaActual.tipo === 'abcd') {
                const cod = Number((v as any)?.abcd ?? v ?? NaN);
                if (!Number.isFinite(cod)) {
                    Alert.alert('Selecciona una opción');
                    return;
                }
                valor = { abcd: [cod] };
            } else if (preguntaActual.tipo === 'rellenar') {
                const txt = (typeof v === 'string' ? v : (v?.rellenar ?? '')).toString().trim();
                if (!txt) {
                    Alert.alert('Escribe tu respuesta');
                    return;
                }
                valor = { rellenar: txt };
            } else {
                valor = v ?? {};
            }
        }

        const limite = Number(preguntaActual.tiempoMax ?? tiempoPorPregunta ?? 30);
        const tiempoRest = Math.max(0, Number(tiempo ?? 0));
        const tiempoSeg = Math.max(0, Math.floor(limite - tiempoRest));

        try {
            const r: any = await fetchJson(
                `/mis-retos/${codUsuarioReto}/quiz/responder`,
                asJson({
                    codUsuarioReto,
                    codPregunta: preguntaActual.codPregunta,
                    valor,
                    tiempoSeg,
                })
            );

            const toBool = (v: any) =>
                (typeof v === 'boolean') ? v :
                    (v === 1) ? true :
                        (v === 0) ? false : null;

            const fueCorrecta: boolean | null = toBool(r?.esCorrecta) ?? toBool(r?.correcta);

            if (typeof r?.explicacion === 'string' && r.explicacion.trim()) setFbMsg(r.explicacion);
            else setFbMsg('');

            const fueOK = (fueCorrecta === true);
            const phoenixDisponible = (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion;

            if (fueOK) {
                setOkCount(p => p + 1);
                setSumTiempoSeg(p => p + tiempoSeg);
            } else {
                if (!phoenixDisponible) {
                    setBadCount(p => p + 1);
                    setSumTiempoSeg(p => p + tiempoSeg);
                }
            }

            // para abcd/rellenar mostramos overlay breve y avanzamos
            if (fueCorrecta !== null) {
                if (fbTimer) clearTimeout(fbTimer);
                setFbOk(fueCorrecta);
                setFbVisible(true);

                const esUltima = (idx + 1) >= total;
                const avanzar = async () => {
                    if (!esUltima) {
                        setIdx(p => p + 1);
                        setOcultas([]);
                    } else {
                        await finalizar();
                    }
                };

                if (!fueOK && phoenixDisponible) {
                    // permite usar phoenix, luego usuario avanza manual desde overlay si lo deseas
                } else {
                    const delay = 1000;
                    const t = setTimeout(async () => {
                        setFbVisible(false);
                        await avanzar();
                    }, delay);
                    setFbTimer(t);
                }
            }
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos guardar tu respuesta');
        }
    };

    /** ===========================
     *  Finalizar → resumen
     *  =========================== */
    const [summary, setSummary] = useState<{ visible: boolean; tiempoTotal: number; ok: number; bad: number; xp: number; coins: number; nuevaRacha?: number | null; }>({
        visible: false, tiempoTotal: 0, ok: 0, bad: 0, xp: 0, coins: 0, nuevaRacha: null
    });

    const finalizar = async () => {
        pauseTimer(); // por si acaso queda activo
        try {
            const r: any = await fetchJson(`/mis-retos/${codUsuarioReto}/finalizar`, asJson({ codUsuarioReto }));
            setSummary({
                visible: true,
                tiempoTotal: sumTiempoSeg,
                ok: okCount,
                bad: badCount,
                xp: Number(r?.xpGanada ?? 0),
                coins: Number(r?.coins ?? 0),
                nuevaRacha: (typeof r?.nuevaRacha === 'number') ? r.nuevaRacha : null,
            });
        } catch {
            setSummary({
                visible: true,
                tiempoTotal: sumTiempoSeg,
                ok: okCount,
                bad: badCount,
                xp: 0,
                coins: 0,
                nuevaRacha: null,
            });
        }
    };

    const progresoPct = total > 0 ? Math.round((idx / total) * 100) : 0;

    const QuizHeader = () => (
        <View style={{ marginTop: 10 }}>
            <View style={{ height: 8, backgroundColor: colors.divider, borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ width: `${progresoPct}%`, height: 8, backgroundColor: colors.primary }} />
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={g.text.bodyStrong}>⏱ {tiempo}s</Text>
                <Text style={g.text.bodyStrong}>{idx + 1}/{total}</Text>
            </View>
        </View>
    );

    // ===== Barra de comodines =====
    const PowerButton = ({
                             label,
                             enabled,
                             qty,
                             onPress,
                         }: { label: string; enabled: boolean; qty: number; onPress: () => void }) => (
        <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{
                position: 'absolute', top: -8,
                backgroundColor: enabled ? colors.primary : colors.mutedBg,
                borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
                borderWidth: 2, borderColor: colors.bg, zIndex: 5
            }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>x{qty}</Text>
            </View>

            <Pressable
                disabled={!enabled}
                onPress={onPress}
                style={{
                    width: '100%',
                    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                    backgroundColor: enabled ? colors.primary : colors.divider,
                }}
            >
                <Text style={[g.text.smallStrong, { color: '#fff' }]}>{label}</Text>
            </Pressable>
        </View>
    );

    const ComodinesBar = () => {
        if (!preguntaActual || summary.visible) return null;
        const qty5050 = inv['50/50'] ?? 0;
        const qtyExtra = inv.extra_time ?? 0;
        const qtyX2 = inv.x2 ?? 0;

        const fiftyEnabled = qty5050 > 0 && preguntaActual?.tipo === 'abcd' && !usedPowerupForQuestion;
        const extraEnabled = qtyExtra > 0 && !usedPowerupForQuestion;
        const x2Enabled = qtyX2 > 0 && !x2UsadoEnQuiz;

        return (
            <View
                style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
                    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.divider,
                    zIndex: 1000, elevation: 12
                }}
            >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <PowerButton
                        label="50/50"
                        qty={qty5050}
                        enabled={fiftyEnabled}
                        onPress={async () => {
                            if (!preguntaActual?.opciones?.length) return;
                            const ok = await usarComodin('50/50', { sobrePreguntaId: preguntaActual.codPregunta });
                            if (!ok) return;

                            const ops = preguntaActual.opciones!;
                            const correcta = ops.find(o => Number(o.correcta) === 1);
                            const incorrectas = ops.filter(o => Number(o.correcta) !== 1);
                            if (!correcta || incorrectas.length < 2) {
                                Alert.alert('50/50', 'No se puede aplicar (no hay suficientes opciones incorrectas).');
                                return;
                            }
                            const shuffled = [...incorrectas].sort(() => Math.random() - 0.5);
                            const ocultar = shuffled.slice(0, 2).map(x => x.codOpcion);
                            setOcultas(ocultar);
                            setUsedPowerupForQuestion('50/50');
                        }}
                    />

                    <PowerButton
                        label={extraTimeCfg.label ?? '+15s'}
                        qty={qtyExtra}
                        enabled={extraEnabled}
                        onPress={async () => {
                            const cfgNow = parseExtraTimeSpec(extraTimeCfg.label || '15s');
                            const payload = { seconds: cfgNow.seconds, format: cfgNow.format, hastaHHmm: cfgNow.hastaHHmm };
                            const ok = await usarComodin('extra_time', { payload, sobrePreguntaId: preguntaActual.codPregunta });
                            if (!ok) return;
                            setTiempo(t => Math.max(0, t) + Math.max(1, Math.floor(cfgNow.seconds || 0)));
                            setUsedPowerupForQuestion('extra_time');
                        }}
                    />

                    <PowerButton
                        label="x2"
                        qty={qtyX2}
                        enabled={x2Enabled}
                        onPress={async () => {
                            const ok = await usarComodin('x2', { sobrePreguntaId: preguntaActual.codPregunta });
                            if (!ok) return;
                            setX2UsadoEnQuiz(true);
                        }}
                    />
                </View>
            </View>
        );
    };

    /** ===========================
     *  UI feedback (solo abcd/rellenar)
     *  =========================== */
    const AnswerScreen = (): React.ReactNode => {
        if (!fbVisible || fbOk === null || (preguntaActual?.tipo === 'emparejar')) return null;
        const ok = !!fbOk;

        const phoenixHabilitado = (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion && !ok;

        return (
            <View
                style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    backgroundColor: ok ? 'rgba(16,185,129,0.90)' : 'rgba(239,68,68,0.90)',
                    alignItems: 'center', justifyContent: 'center', padding: 24,
                    zIndex: 1500, elevation: 20
                }}
            >
                <View style={{
                    backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 22,
                    alignItems: 'center', width: '86%', maxWidth: 460, borderWidth: 2, borderColor: ok ? successBorder : errorBorder
                }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: ok ? successText : errorText }}>
                        {ok ? '¡Correcto!' : 'Incorrecto'}
                    </Text>
                    {!!fbMsg && (
                        <Text style={{ marginTop: 10, fontSize: 16, textAlign: 'center', color: '#111827' }}>
                            {fbMsg}
                        </Text>
                    )}

                    <View style={{ flexDirection: 'column', gap: 10, marginTop: 18, width: '100%' }}>
                        {!ok && (
                            <>
                                {phoenixHabilitado && (
                                    <Pressable onPress={reintentarConPhoenix}
                                               style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' }}>
                                        <Text style={{ color: '#fff', fontWeight: '800' }}>Reintentar (Ave Fénix)</Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const FeedbackToast = (): React.ReactNode => {
        if (!fbVisible || (preguntaActual?.tipo === 'emparejar')) return null;
        return (
            <View
                style={{
                    position: 'absolute',
                    left: 16, right: 16, bottom: 24,
                    paddingVertical: 12, paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: fbOk ? successBG : errorBG,
                    borderWidth: 1,
                    borderColor: fbOk ? successBorder : errorBorder,
                    alignItems: 'center',
                    zIndex: 1400, elevation: 16
                }}
            >
                <Text style={{ color: fbOk ? successText : errorText, fontWeight: '700' }}>
                    {fbOk ? '✔ Correcto' : '✖ Incorrecto'}
                </Text>
                {!!fbMsg && (
                    <Text style={{ marginTop: 4, color: fbOk ? successText : errorText }}>
                        {fbMsg}
                    </Text>
                )}
            </View>
        );
    };

    /** ===========================
     *  Resumen
     *  =========================== */
    const SummaryScreen = (): React.ReactNode => {
        if (!summary.visible) return null;
        const textColor = isDark ? '#E5E7EB' : '#111827';
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? colors.bg : '#fff' }}>
                <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
                    <View style={{ alignSelf: 'center', width: '92%', maxWidth: 520 }}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: '#c62828', marginBottom: 18 }}>Resumen</Text>
                        <View style={{ gap: 8 }}>
                            <Text style={[g.text.body, { color: textColor }]}><Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>Tiempo</Text> : {summary.tiempoTotal} seg</Text>
                            <Text style={[g.text.body, { color: textColor }]}><Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>Respuestas correctas</Text> : {summary.ok}</Text>
                            <Text style={[g.text.body, { color: textColor }]}><Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>Respuestas incorrectas</Text> : {summary.bad}</Text>
                            <Text style={[g.text.body, { color: textColor }]}><Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>Monedas ganadas</Text> : ${summary.coins}</Text>
                            <Text style={[g.text.body, { color: textColor }]}><Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>XP</Text> : {summary.xp}</Text>
                            {typeof summary.nuevaRacha === 'number' && (
                                <Text style={[g.text.body, { color: textColor }]}>
                                    <Text style={[g.text.bodyStrong, { fontStyle: 'italic', color: textColor }]}>Racha</Text> : {summary.nuevaRacha} día{summary.nuevaRacha === 1 ? '' : 's'}
                                </Text>
                            )}
                        </View>

                        <Pressable
                            onPress={() => { onFinish({ xp: summary.xp, coins: summary.coins, nuevaRacha: summary.nuevaRacha }); }}
                            style={{ marginTop: 24, alignSelf: 'center', backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 }}
                        >
                            <Text style={[g.text.smallStrong, { color: '#ffffff' }]}>Continuar</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    };

    /** ===========================
     *  EmparejarBoard — sin scroll en columnas
     *  =========================== */
    const EmparejarBoard = ({ qid, data }: { qid: number; data: MatchData }) => {
        const selectedA = selectedAByQ[qid] ?? null;
        const pairs = pairsByQ[qid] ?? [];
        const verdict = verdictByQ[qid] ?? { checked: false, correct: new Set<string>(), wrong: new Set<string>() };

        const setPair = (a: number, b: number) => {
            if (verdict.checked) return; // no editar después de validar
            setPairsByQ(prev => {
                const list = [...(prev[qid] ?? [])]
                    .filter(p => p.a !== a && p.b !== b);
                list.push({ a, b });
                return { ...prev, [qid]: list };
            });
            selectedARef.current[qid] = null;
            setSelectedAByQ(prev => ({ ...prev, [qid]: null }));
        };

        const onPickA = (id: number) => {
            if (verdict.checked) return;
            selectedARef.current[qid] = (selectedARef.current[qid] === id ? null : id);
            setSelectedAByQ(prev => ({ ...prev, [qid]: selectedARef.current[qid] }));
        };

        const onPickB = (id: number) => {
            if (verdict.checked) return;
            const aSel = selectedARef.current[qid] ?? null;
            if (aSel == null) return;
            setPair(aSel, id);
        };

        const removePair = (a: number, b: number) => {
            if (verdict.checked) return;
            setPairsByQ(prev => ({ ...prev, [qid]: (prev[qid] ?? []).filter(p => !(p.a === a && p.b === b)) }));
        };

        const usedA = new Set((pairsByQ[qid] ?? []).map(p => p.a));
        const usedB = new Set((pairsByQ[qid] ?? []).map(p => p.b));

        const tileBase = {
            paddingVertical: 12,
            paddingHorizontal: 10,
            borderRadius: 12,
            borderWidth: 1,
            marginVertical: 6,
        } as const;

        // color para B según veredicto
        const colorForB = (bId: number) => {
            if (!verdict.checked) return { borderColor: colors.divider, bg: baseCardBG, text: colors.text };
            const pair = (pairsByQ[qid] ?? []).find(p => p.b === bId);
            if (!pair) return { borderColor: colors.divider, bg: baseCardBG, text: colors.text };
            const k = keyAB(pair.a, pair.b);
            if (verdict.correct.has(k)) return { borderColor: successBorder, bg: successBG, text: successText };
            if (verdict.wrong.has(k)) return { borderColor: errorBorder, bg: errorBG, text: errorText };
            return { borderColor: colors.divider, bg: baseCardBG, text: colors.text };
        };

        return (
            <View style={{ marginTop: 12 }}>
                <Text style={[g.text.smallStrong, { marginBottom: 8 }]}>Emparejar</Text>

                <View style={{ flexDirection: 'row', gap: 16 }}>
                    {/* Columna A sin Scroll interno */}
                    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.divider, borderRadius: 12, overflow: 'hidden' }}>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.cardTint }}>
                            <Text style={g.text.caption}>Columna A</Text>
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                            {data.A.map(item => {
                                const selected = selectedA === item.id;
                                const paired = usedA.has(item.id);
                                return (
                                    <Pressable
                                        key={`A-${item.id}`}
                                        onPress={() => onPickA(item.id)}
                                        disabled={verdict.checked}
                                        style={[
                                            tileBase,
                                            {
                                                borderColor: selected ? colors.primary : colors.divider,
                                                backgroundColor: selected ? (isDark ? '#0b1022' : '#fff7ed') : baseCardBG,
                                                opacity: paired && !selected ? 0.9 : 1,
                                            }
                                        ]}
                                    >
                                        <Text style={[g.text.body, { color: colors.text }]}>{item.label}</Text>
                                        {paired && !selected && (
                                            <Text style={[g.text.caption, { marginTop: 4, color: colors.mutedText }]}>Emparejado</Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* Columna B sin Scroll interno */}
                    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.divider, borderRadius: 12, overflow: 'hidden' }}>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.cardTint }}>
                            <Text style={g.text.caption}>Columna B</Text>
                        </View>
                        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                            {data.B.map(item => {
                                const selectedAExists = selectedA != null;
                                const bAlreadyUsed = usedB.has(item.id);
                                const canPick = selectedAExists && !verdict.checked;
                                const col = colorForB(item.id);
                                return (
                                    <Pressable
                                        key={`B-${item.id}`}
                                        onPress={() => { if (canPick) onPickB(item.id); }}
                                        disabled={!canPick}
                                        style={[
                                            tileBase,
                                            {
                                                borderColor: col.borderColor,
                                                backgroundColor: col.bg,
                                                opacity: canPick ? 1 : (verdict.checked ? 1 : 0.7)
                                            }
                                        ]}
                                    >
                                        <Text style={[g.text.body, { color: col.text }]}>{item.label}</Text>
                                        {bAlreadyUsed && !verdict.checked && (
                                            <Text style={[g.text.caption, { marginTop: 4, color: colors.mutedText }]}>Emparejado</Text>
                                        )}
                                        {!canPick && !verdict.checked && (
                                            <Text style={[g.text.caption, { marginTop: 4, color: colors.mutedText }]}>Selecciona un A ↑</Text>
                                        )}
                                        {verdict.checked && bAlreadyUsed && (
                                            <Text style={[g.text.caption, { marginTop: 4, color: col.text }]}>
                                                {(() => {
                                                    const pair = (pairsByQ[qid] ?? []).find(p => p.b === item.id);
                                                    if (!pair) return '';
                                                    const k = keyAB(pair.a, pair.b);
                                                    return verdict.correct.has(k) ? '✔ Correcto' : verdict.wrong.has(k) ? '✖ Incorrecto' : '';
                                                })()}
                                            </Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Pares actuales */}
                <View style={{ marginTop: 12, borderWidth: 1, borderColor: colors.divider, borderRadius: 12 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: colors.cardTint }}>
                        <Text style={g.text.caption}>Pares seleccionados</Text>
                    </View>
                    <View style={{ padding: 10, gap: 8 }}>
                        {(pairs.length === 0) ? (
                            <Text style={g.text.caption}>Aún no agregas pares.</Text>
                        ) : pairs.map((p, i) => {
                            const aLabel = data.A.find(x => x.id === p.a)?.label ?? p.a;
                            const bLabel = data.B.find(x => x.id === p.b)?.label ?? p.b;
                            const k = keyAB(p.a, p.b);
                            const checked = verdict.checked;
                            const isC = checked && verdict.correct.has(k);
                            const isW = checked && verdict.wrong.has(k);

                            const containerBorder = isC ? successBorder : isW ? errorBorder : colors.divider;
                            const containerBG = isC ? successBG : isW ? errorBG : baseCardBG;
                            const containerText = isC ? successText : isW ? errorText : colors.text;

                            return (
                                <View
                                    key={`${p.a}-${p.b}-${i}`}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'flex-start', // importante para que el botón no estire la altura
                                        gap: 10,
                                        padding: 8,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: containerBorder,
                                        backgroundColor: containerBG
                                    }}
                                >
                                    <Text
                                        style={[g.text.body, { color: containerText, flex: 1, flexWrap: 'wrap', flexShrink: 1 }]} // wrap para que no se salga
                                    >
                                        • {aLabel}  →  {bLabel}
                                    </Text>

                                    {!checked && (
                                        <Pressable
                                            onPress={() => removePair(p.a, p.b)}
                                            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.mutedBg, alignSelf: 'flex-start' }}
                                        >
                                            <Text style={{ color: colors.text, fontWeight: '700' }}>Quitar</Text>
                                        </Pressable>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Acciones */}
                {!verdict.checked ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <Pressable
                            onPress={() => {
                                setPairsByQ(prev => ({ ...prev, [qid]: [] }));
                                selectedARef.current[qid] = null;
                                setSelectedAByQ(prev => ({ ...prev, [qid]: null }));
                            }}
                            style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.mutedBg }}
                        >
                            <Text style={{ color: colors.text, fontWeight: '700' }}>Limpiar</Text>
                        </Pressable>

                        <Pressable
                            onPress={validarEmparejar}
                            style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.primary }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '800' }}>Validar</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <Pressable
                            onPress={async () => {
                                const esUltima = (idx + 1) >= total;
                                if (!esUltima) setIdx(p => p + 1);
                                else await finalizar();
                            }}
                            style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: (idx + 1 < total) ? '#f59e0b' : '#f97316' }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '800' }}>
                                {(idx + 1 < total) ? 'Siguiente' : 'Finalizar'}
                            </Text>
                        </Pressable>
                    </View>
                )}

                {!!fbMsg && verdict.checked && (
                    <Text style={[g.text.caption, { marginTop: 8, color: colors.mutedText }]}>{fbMsg}</Text>
                )}
            </View>
        );
    };

    /** ===========================
     *  Render principal (único return → evita errores de hooks)
     *  =========================== */
    const matchData = useMemo(() => {
        if (preguntaActual?.tipo !== 'emparejar') return null;
        return extractMatchData(preguntaActual);
    }, [preguntaActual]);

    return (
        <View style={{ flex: 1 }}>
            {/* Resumen */}
            {SummaryScreen()}

            {/* Contenido principal (se oculta si summary.visible) */}
            {!summary.visible && (
                <>
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {!preguntaActual ? (
                            <Text style={g.text.body}>No hay preguntas. Un labubu travieso se las llevó 🐾</Text>
                        ) : (
                            <>
                                <View style={{ marginTop: 10 }}>
                                    <QuizHeader />
                                </View>

                                <Text style={[g.text.h3, { marginTop: 10 }]}>Pregunta {preguntaActual.numero}</Text>
                                <Text style={[g.text.body, { marginTop: 6 }]}>{preguntaActual.enunciado}</Text>

                                {preguntaActual.tipo === 'abcd' && (
                                    <View style={{ marginTop: 12 }}>
                                        {(preguntaActual.opciones || [])
                                            .filter((o: any) => !ocultas.includes(o.codOpcion))
                                            .map((op: any) => {
                                                const active =
                                                    (respuestas[preguntaActual.codPregunta]?.abcd ?? respuestas[preguntaActual.codPregunta]) === op.codOpcion;
                                                return (
                                                    <Pressable
                                                        key={op.codOpcion}
                                                        onPress={() => setResp(preguntaActual.codPregunta, { abcd: active ? null : op.codOpcion })}
                                                        style={{
                                                            marginBottom: 8,
                                                            padding: 12,
                                                            borderRadius: 10,
                                                            borderWidth: 1,
                                                            borderColor: active ? colors.primary : colors.divider,
                                                            backgroundColor: active ? (isDark ? '#0b1022' : '#fff7ed') : 'transparent',
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.text }}>{op.texto}</Text>
                                                    </Pressable>
                                                );
                                            })}
                                    </View>
                                )}

                                {preguntaActual.tipo === 'rellenar' && (
                                    <TextInput
                                        placeholder="Tu respuesta"
                                        placeholderTextColor={colors.mutedText}
                                        value={respuestas[preguntaActual.codPregunta]?.rellenar ?? ''}
                                        onChangeText={(t) => setResp(preguntaActual.codPregunta, { rellenar: t })}
                                        onSubmitEditing={() => responderYAvanzar()}
                                        returnKeyType="send"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        style={{
                                            borderWidth: 1, borderColor: colors.divider, borderRadius: 10,
                                            padding: 10, color: colors.text, marginTop: 8,
                                        }}
                                    />
                                )}

                                {preguntaActual.tipo === 'emparejar' && matchData && (
                                    <EmparejarBoard qid={preguntaActual.codPregunta} data={matchData} />
                                )}
                                {preguntaActual.tipo === 'emparejar' && !matchData && (
                                    <Text style={[g.text.caption, { marginTop: 8 }]}>
                                        No se pudo cargar la configuración de emparejar (faltan columnas A/B).
                                    </Text>
                                )}

                                {preguntaActual.tipo === 'reporte' && (
                                    <Text style={g.text.caption}>Este tipo requiere upload de archivo; conecta tu picker y manda metadata al backend.</Text>
                                )}

                                {(preguntaActual.tipo === 'abcd' || preguntaActual.tipo === 'rellenar' || preguntaActual.tipo === 'reporte') && (
                                    <Pressable
                                        onPress={() => responderYAvanzar()}
                                        style={{
                                            marginTop: 18,
                                            paddingVertical: 14,
                                            paddingHorizontal: 28,
                                            backgroundColor: (idx + 1 < total) ? '#facc15' : '#f97316',
                                            borderRadius: 999,
                                            alignSelf: 'center',
                                        }}
                                    >
                                        <Text style={{
                                            fontWeight: '800',
                                            color: (idx + 1 < total) ? '#1f2937' : '#ffffff'
                                        }}>
                                            {(idx + 1 < total) ? 'Siguiente' : 'Finalizar'}
                                        </Text>
                                    </Pressable>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Overlays y barra */}
                    {AnswerScreen()}
                    {FeedbackToast()}
                    <ComodinesBar />
                </>
            )}
        </View>
    );
}
