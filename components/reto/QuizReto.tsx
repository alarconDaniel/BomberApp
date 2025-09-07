// components/reto/QuizReto.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, SafeAreaView } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { Pregunta, asJson } from './utils';

/** ─────────────────────────────────────────────────
 *  Tipos y helpers locales (self-contained)
 *  ───────────────────────────────────────────────── */
type PowerupKey = '50-50' | 'extra_time' | 'streak_shield' | 'x2' | 'phoenix';
type RespuestasMap = Record<number, any>;

const _toInt = (x: any) => Number(x) || 0;
const _pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Parseadores de tiempo extra (offsets tipo "15s", "1m30s", "PT45S", "mm:ss", "HH:mm") */
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
    // En modular no recibimos metadataReto; por compat, usamos 15s por defecto.
    const fallback: ExtraTimeSpec = { seconds: 15, format: 'offset', label: '+15s' };
    if (raw == null) return fallback;
    if (typeof raw === 'number' && isFinite(raw) && raw > 0) {
        const s = Math.floor(raw);
        return { seconds: s, format: 'offset', label: `+${s}s` };
    }
    if (typeof raw !== 'string') return fallback;
    const s = raw.trim();

    // ISO
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
            const now = new Date();
            const target = new Date(now);
            target.setHours(hh, m, 0, 0);
            const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
            return { seconds: diff, format: 'until', label: `→ ${_pad2(hh)}:${_pad2(m)}`, hastaHHmm: `${_pad2(hh)}:${_pad2(m)}` };
        }
    }
    // mm:ss
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
    if (n.includes('50 50') || n.includes('5050') || n.includes('fifty')) return '50-50';
    if (
        n.includes('extra tiempo') || n.includes('mas tiempo') || n.includes('+15') || n.includes('15s') ||
        n.includes('extra time') || n.includes('pocion') || n.includes('poción') || n.includes('potion')
    ) return 'extra_time';
    if (n.includes('x2') || n.includes('doble') || n.includes('double') || n.includes('boost')) return 'x2';
    if (n.includes('racha') || n.includes('shield') || n.includes('protector') || n.includes('escudo')) return 'streak_shield';
    if (n.includes('phoenix') || n.includes('fenix') || n.includes('fénix') || n.includes('ave fenix') || n.includes('ave fénix')) return 'phoenix';
    return null;
};

const mapInventoryToPowerups = (items: any[] | undefined | null): Record<PowerupKey, number> => {
    const acc: Record<PowerupKey, number> = { '50-50': 0, extra_time: 0, streak_shield: 0, x2: 0, phoenix: 0 };
    for (const it of items || []) {
        const qty = Number((it as any)?.cantidad ?? 0) || 0;
        const name = (it as any)?.item?.nombre as string | undefined;
        const key = resolvePowerupKey(name);
        if (key) acc[key] += qty;
    }
    return acc;
};

const serverTipoFromKey = (k: PowerupKey) => {
    switch (k) {
        case '50-50': return '50-50';
        case 'extra_time': return 'mas_tiempo';
        case 'streak_shield': return 'protector_racha';
        case 'x2': return 'double';
        case 'phoenix': return 'ave_fenix';
        default: return k as string;
    }
};
const serverTipoCandidates = (k: PowerupKey): string[] => {
    const main = serverTipoFromKey(k);
    const alts: Record<PowerupKey, string[]> = {
        '50-50': ['50-50', 'fifty_fifty', 'fifty', '5050'],
        extra_time: ['mas_tiempo', 'extra_time', 'extraTime', 'tiempo_extra'],
        streak_shield: ['protector_racha', 'streak_shield', 'shield', 'escudo'],
        x2: ['double', 'x2', 'double_points'],
        phoenix: ['ave_fenix', 'phoenix', 'fenix', 'fénix'],
    };
    const arr = alts[k] || [main];
    return Array.from(new Set([main, ...arr]));
};

/** Normaliza para comparar respuestas de 'rellenar' */
const normalizeAnswer = (s: string) =>
    (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');

/** Acepta respuesta correcta de 'rellenar' desde opciones correctas o respuesta_correcta */
const esRellenarCorrecto = (q: Pregunta & any, respuestaUsuario: string): boolean => {
    if (!q || q.tipo !== 'rellenar') return false;
    const candidatos: string[] = [];
    if (Array.isArray(q.opciones)) {
        for (const o of q.opciones) if (Number(o?.correcta) === 1 && typeof o?.texto === 'string') candidatos.push(o.texto);
    }
    const rawRC: unknown = q.respuesta_correcta ?? q.respuestaCorrecta ?? q.correcta;
    if (typeof rawRC === 'string' && rawRC.trim()) {
        rawRC.split(/[|,]/).forEach(v => { const t = v.trim(); if (t) candidatos.push(t); });
    }
    if (candidatos.length === 0) return false;
    const ru = normalizeAnswer(respuestaUsuario || '');
    if (!ru) return false;
    return candidatos.some(txt => normalizeAnswer(txt) === ru);
};

/** ─────────────────────────────────────────────────
 *  Componente principal
 *  ───────────────────────────────────────────────── */
export default function QuizReto({
                                     codUsuarioReto,
                                     preguntas,
                                     fetchJson,
                                     onFinish,
                                 }: {
    codUsuarioReto: number;
    preguntas: Pregunta[];
    fetchJson: <T = any>(url: string, init?: any) => Promise<T>;
    onFinish: () => void;
}) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    const total = preguntas.length;
    const [idx, setIdx] = useState(0);
    const [tiempo, setTiempo] = useState<number>(30);
    const [ocultas, setOcultas] = useState<number[]>([]);
    const [respuestas, setRespuestas] = useState<RespuestasMap>({});
    const [usedPowerupForQuestion, setUsedPowerupForQuestion] = useState<PowerupKey | null>(null);

    // Feedback UI
    const [fbVisible, setFbVisible] = useState(false);
    const [fbOk, setFbOk] = useState<boolean | null>(null);
    const [fbMsg, setFbMsg] = useState<string>('');
    const [fbTimer, setFbTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (fbTimer) clearTimeout(fbTimer); }, [fbTimer]);

    // Métricas
    const [okCount, setOkCount] = useState(0);
    const [badCount, setBadCount] = useState(0);
    const [sumTiempoSeg, setSumTiempoSeg] = useState(0);
    const [answeredCorrect, setAnsweredCorrect] = useState<Record<number, boolean>>({});
    const [x2AppliedTo, setX2AppliedTo] = useState<Set<number>>(new Set());

    const finishingRef = useRef(false);
    const usingPowerupRef = useRef(false);
    const powerupApiMissingRef = useRef(false);
    const advanceRef = useRef<null | (() => Promise<void>)>(null);
    const usedPowerupServerTypeRef = useRef<Record<number, string | undefined>>({});

    // Inventario de comodines
    const [inv, setInv] = useState<Record<PowerupKey, number>>({
        '50-50': 0, extra_time: 0, streak_shield: 0, x2: 0, phoenix: 0
    });

    // Carga inventario real y lo mapea → comodines
    const cargarComodinesDesdeInventario = async () => {
        try {
            const resp: any = await fetchJson('/item-inventario/listar');
            const arr = Array.isArray((resp as any)?.items) ? (resp as any).items : [];
            const norm = mapInventoryToPowerups(arr);
            setInv(norm);
        } catch {
            // Silencioso; mantenemos estado como esté
        }
    };

    useEffect(() => { cargarComodinesDesdeInventario().catch(() => {}); }, []);

    const preguntaActual = preguntas[idx];

    /** Tiempo por pregunta: pregunta.tiempoMax > 0 ? ese : 30 (sin metadata en modular) */
    const tiempoPorPregunta = useMemo<number>(() => {
        return Math.max(1, Number(preguntaActual?.tiempoMax ?? 30) || 30);
    }, [preguntaActual?.tiempoMax]);

    /** Temporizador de la pregunta */
    useEffect(() => {
        if (!preguntaActual) return;
        setTiempo(tiempoPorPregunta);
        setOcultas([]);
        setUsedPowerupForQuestion(null);

        const idInt = setInterval(() => {
            setTiempo(t => {
                if (t <= 1) {
                    clearInterval(idInt);
                    if (!finishingRef.current) {
                        finishingRef.current = true;
                        responderYAvanzar({ autoPorTiempo: true })
                            .catch(() => {})
                            .finally(() => { finishingRef.current = false; });
                    }
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(idInt);
    }, [idx, preguntaActual?.codPregunta, tiempoPorPregunta]);

    const setResp = (codPregunta: number, v: any) =>
        setRespuestas(prev => ({ ...prev, [codPregunta]: v }));

    /** Extra time config (en modular usamos 15s por defecto; si necesitas otra cosa, pasa por metadata y ajústalo aquí) */
    const extraTimeCfg = parseExtraTimeSpec('15s');

    /** Registrar uso de comodín en backend, probando alias de tipo */
    const tryUsePowerupOnServer = async (key: PowerupKey, urId: number, codPregunta?: number): Promise<string> => {
        const candidates = serverTipoCandidates(key);
        for (const tipo of candidates) {
            try {
                const bodyBase: any = { codUsuarioReto: urId, codPregunta, tipo };
                await fetchJson(`/mis-retos/${urId}/comodines/usar`, asJson(bodyBase));
                return tipo;
            } catch { /* prueba siguiente */ }
        }
        throw new Error('No se pudo registrar el uso del comodín en el servidor');
    };

    /** Usa un comodín con manejo de UI/stock local y registro en servidor cuando sea posible */
    const usarComodin = async (
        key: PowerupKey,
        opts?: { sobrePreguntaId?: number; payload?: any }
    ): Promise<boolean> => {
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

            // Descuento optimista
            setInv(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) - 1) }));
            setUsedPowerupForQuestion(key);

            const urId = codUsuarioReto || null;
            const codPregunta = opts?.sobrePreguntaId ?? preguntaActual?.codPregunta;

            if (!urId || !codPregunta) return true;
            if (powerupApiMissingRef.current) return true;

            let body: any = { codUsuarioReto: urId, codPregunta, tipo: serverTipoFromKey(key) };
            if (key === 'extra_time') {
                const seconds = Math.max(1, Math.floor(Number(opts?.payload?.seconds ?? 15) || 0));
                const hasta = typeof opts?.payload?.hastaHHmm === 'string' ? opts?.payload?.hastaHHmm : undefined;
                body = { ...body, segundos: seconds, ...(hasta ? { hasta } : {}) };
            }

            try {
                await fetchJson(`/mis-retos/${urId}/comodines/usar`, asJson(body));
                await cargarComodinesDesdeInventario().catch(() => {});
                usedPowerupServerTypeRef.current[codPregunta] = body.tipo;
                return true;
            } catch (e: any) {
                const msg = String(e?.message || '');
                const is404 = e?.status === 404 || /404/.test(msg) || /Cannot POST/i.test(msg);
                if (is404) {
                    powerupApiMissingRef.current = true; // evita reintentos
                    return true; // mantenemos uso local
                }
                // Rollback en otros errores
                setInv(prev => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
                setUsedPowerupForQuestion(null);
                Alert.alert('Comodines', e?.message || 'No se pudo usar el comodín.');
                return false;
            }
        } finally {
            usingPowerupRef.current = false;
        }
    };

    /** Responder y avanzar (auto por tiempo o manual) */
    const responderYAvanzar = async ({ autoPorTiempo = false }: { autoPorTiempo?: boolean } = {}) => {
        if (!preguntaActual) return;

        // Construir valor
        let valor: any = null;
        if (autoPorTiempo) {
            valor = preguntaActual.tipo === 'abcd'
                ? { abcd: [] }
                : preguntaActual.tipo === 'rellenar'
                    ? { rellenar: '' }
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

        // Tiempo consumido
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

            // Feedback inmediato si viene del back
            let fueCorrecta: boolean | null = null;
            if (r && typeof r === 'object') {
                if (typeof r.esCorrecta === 'boolean') fueCorrecta = r.esCorrecta;
                else if (typeof r.correcta === 'boolean') fueCorrecta = r.correcta;
                if (typeof r.explicacion === 'string' && r.explicacion.trim()) setFbMsg(r.explicacion);
                else setFbMsg('');
            }

            // Inferencia local si no vino del back
            if (fueCorrecta === null && preguntaActual.tipo === 'abcd' && !autoPorTiempo) {
                const sel = (respuestas[preguntaActual.codPregunta]?.abcd) ?? respuestas[preguntaActual.codPregunta];
                const op = (preguntaActual.opciones ?? []).find(o => o.codOpcion === sel);
                if (op && typeof op.correcta === 'number') fueCorrecta = op.correcta === 1;
            }
            if (fueCorrecta === null && preguntaActual.tipo === 'rellenar' && !autoPorTiempo) {
                const txt = String(
                    (typeof respuestas[preguntaActual.codPregunta] === 'string'
                        ? respuestas[preguntaActual.codPregunta]
                        : respuestas[preguntaActual.codPregunta]?.rellenar) ?? ''
                );
                fueCorrecta = esRellenarCorrecto(preguntaActual as any, txt);
            }

            setAnsweredCorrect(prev => ({ ...prev, [preguntaActual.codPregunta]: !!fueCorrecta }));

            // Acumular métricas
            const fueOK = (fueCorrecta === true);
            setSumTiempoSeg(p => p + tiempoSeg);
            if (fueOK) setOkCount(p => p + 1); else setBadCount(p => p + 1);

            const totalQ = total;
            const esUltima = (idx + 1) >= totalQ;

            const avanzar = async () => {
                if (!esUltima) {
                    setIdx(p => p + 1);
                    setOcultas([]);
                } else {
                    await finalizar({ ok: okCount + (fueOK ? 1 : 0), bad: badCount + (fueOK ? 0 : 1), tiempo: sumTiempoSeg + tiempoSeg });
                }
            };

            // Overlay de feedback y control de avance (Ave Fénix detiene para reintentar)
            const phoenixDisponible = (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion;

            if (fueCorrecta !== null) {
                if (fbTimer) clearTimeout(fbTimer);
                setFbOk(fueCorrecta);
                setFbVisible(true);

                if (!fueOK && phoenixDisponible) {
                    // Guardar "continuar" para cuando el usuario no reintente
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

    /** Finalizar: mostramos resumen local; si el back da XP/coins, lo respetamos; si no, fallback 0s */
    const [summary, setSummary] = useState<{ visible: boolean; tiempoTotal: number; ok: number; bad: number; xp: number; coins: number; }>({
        visible: false, tiempoTotal: 0, ok: 0, bad: 0, xp: 0, coins: 0
    });

    const finalizar = async (totals?: { ok?: number; bad?: number; tiempo?: number }) => {
        const ok = totals?.ok ?? okCount;
        const bad = totals?.bad ?? badCount;
        const tiempo = totals?.tiempo ?? sumTiempoSeg;

        try {
            const r: any = await fetchJson(`/mis-retos/${codUsuarioReto}/finalizar`, asJson({ codUsuarioReto }));
            setSummary({
                visible: true,
                tiempoTotal: tiempo,
                ok,
                bad,
                xp: Number(r?.xpGanada ?? 0),
                coins: Number(r?.coins ?? 0),
            });
        } catch {
            // Fallback: mostramos resumen aunque el finalizar falle (consistencia con monolítico)
            setSummary({
                visible: true,
                tiempoTotal: tiempo,
                ok,
                bad,
                xp: 0,
                coins: 0,
            });
        }
    };

    /** Cabecera: progreso + timer */
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

    /** Barra de comodines (fija abajo) */
    const ComodinesBar = () => {
        if (!preguntaActual) return null;
        const fiftyEnabled = (inv['50-50'] ?? 0) > 0 && preguntaActual?.tipo === 'abcd' && !usedPowerupForQuestion;
        const extraEnabled = (inv.extra_time ?? 0) > 0 && !usedPowerupForQuestion;
        const x2Enabled = (inv.x2 ?? 0) > 0 && !usedPowerupForQuestion;
        const shieldEnabled = (inv.streak_shield ?? 0) > 0 && !usedPowerupForQuestion && idx > 0;

        return (
            <View style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16,
                backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.divider,
                height: 70
            }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {/* 50-50 */}
                    <Pressable
                        disabled={!fiftyEnabled}
                        onPress={async () => {
                            if (!preguntaActual?.opciones?.length) return;
                            if (!(await usarComodin('50-50', { sobrePreguntaId: preguntaActual?.codPregunta }))) return;

                            const ops = preguntaActual.opciones!;
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
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: fiftyEnabled ? colors.primary : colors.divider }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>50-50</Text>
                    </Pressable>

                    {/* Extra tiempo */}
                    <Pressable
                        disabled={!extraEnabled}
                        onPress={async () => {
                            // Recalcula seconds en el momento (por si algún día cambias la fuente)
                            const cfgNow = parseExtraTimeSpec(extraTimeCfg.label || '15s');
                            const payload = { seconds: cfgNow.seconds, format: cfgNow.format, hastaHHmm: cfgNow.hastaHHmm };
                            const ok = await usarComodin('extra_time', { payload, sobrePreguntaId: preguntaActual?.codPregunta });
                            if (!ok) return;
                            setTiempo(t => Math.max(0, t) + Math.max(1, Math.floor(cfgNow.seconds || 0)));
                        }}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: extraEnabled ? colors.primary : colors.divider }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>{extraTimeCfg?.label ?? '+15s'}</Text>
                    </Pressable>

                    {/* x2 */}
                    <Pressable
                        disabled={!x2Enabled}
                        onPress={async () => {
                            if (!(await usarComodin('x2', { sobrePreguntaId: preguntaActual?.codPregunta }))) return;
                            setX2AppliedTo(prev => {
                                const next = new Set(prev);
                                next.add(preguntaActual.codPregunta);
                                return next;
                            });
                        }}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: x2Enabled ? colors.primary : colors.divider }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>x2</Text>
                    </Pressable>

                    {/* Protector de racha */}
                    <Pressable
                        disabled={!shieldEnabled}
                        onPress={async () => {
                            const prevIdx = idx - 1;
                            const prevQ = preguntas?.[prevIdx];
                            if (!prevQ) return;

                            if (answeredCorrect[prevQ.codPregunta] !== false) {
                                Alert.alert('Protector de racha', 'No tienes una respuesta anterior incorrecta que proteger.');
                                return;
                            }
                            const ok = await usarComodin('streak_shield', { sobrePreguntaId: prevQ.codPregunta });
                            if (!ok) return;

                            setBadCount(p => Math.max(0, p - 1));
                            setOkCount(p => p + 1);
                            setAnsweredCorrect(prev => ({ ...prev, [prevQ.codPregunta]: true }));
                        }}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: shieldEnabled ? colors.primary : colors.divider }}
                    >
                        <Text style={[g.text.smallStrong, { color: '#fff' }]}>Racha</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    /** Overlay grande Correcto/Incorrecto con Ave Fénix */
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
                    backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 22,
                    alignItems: 'center', width: '86%', maxWidth: 460, borderWidth: 2, borderColor: ok ? '#10b981' : '#ef4444'
                }}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: ok ? '#065f46' : '#7f1d1d' }}>
                        {ok ? '¡Correcto!' : 'Incorrecto'}
                    </Text>
                    {!!fbMsg && (
                        <Text style={{ marginTop: 10, fontSize: 16, textAlign: 'center', color: '#111827' }}>
                            {fbMsg}
                        </Text>
                    )}

                    {!ok && (inv.phoenix ?? 0) > 0 && !usedPowerupForQuestion && (
                        <View style={{ marginTop: 16, width: '100%', gap: 10 }}>
                            <Pressable
                                onPress={async () => {
                                    if (!(await usarComodin('phoenix', { sobrePreguntaId: preguntaActual?.codPregunta }))) return;

                                    if (fbTimer) clearTimeout(fbTimer);
                                    // Descontar la mala recién contada
                                    setBadCount(p => Math.max(0, p - 1));

                                    if (preguntaActual) {
                                        // Limpia la respuesta guardada para esta pregunta
                                        setRespuestas(prevResp => {
                                            const next = { ...prevResp };
                                            delete next[preguntaActual.codPregunta];
                                            return next;
                                        });
                                        // Limpia registro de correcto/incorrecto para esta pregunta
                                        setAnsweredCorrect(prevMap => {
                                            const next = { ...prevMap };
                                            delete next[preguntaActual.codPregunta];
                                            return next;
                                        });
                                    }

                                    // Reset de timer y ocultas
                                    setTiempo(tiempoPorPregunta);
                                    setOcultas([]);
                                    setFbVisible(false);
                                }}
                                style={{ backgroundColor: '#1d4ed8', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '800' }}>Reintentar (Ave Fénix)</Text>
                            </Pressable>

                            <Pressable
                                onPress={async () => {
                                    const f = advanceRef.current;
                                    setFbVisible(false);
                                    if (f) await f();
                                }}
                                style={{ backgroundColor: '#6b7280', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Continuar</Text>
                            </Pressable>
                        </View>
                    )}

                    {(ok || !(inv.phoenix ?? 0) || usedPowerupForQuestion) && (
                        <Text style={{ marginTop: 14, color: '#374151' }}>Avanzando…</Text>
                    )}
                </View>
            </View>
        );
    };

    /** Toast inferior breve */
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

    /** Summary screen FULL dentro del mismo componente */
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
                        </View>

                        <Pressable
                            onPress={() => { onFinish(); }}
                            style={{ marginTop: 24, alignSelf: 'center', backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 }}
                        >
                            <Text style={[g.text.smallStrong, { color: '#ffffff' }]}>Continuar</Text>
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        );
    };

    /** UI principal */
    if (summary.visible) {
        return <>{SummaryScreen()}</>;
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={{ padding: 16, paddingBottom: 96, marginBottom: 90 }}>
                {!preguntaActual ? (
                    <Text style={g.text.body}>No hay preguntas. Un labubu travieso se las llevó 🐾</Text>
                ) : (
                    <>
                        <QuizHeader />
                        <Text style={[g.text.h3, { marginTop: 10 }]}>Pregunta {preguntaActual.numero}</Text>
                        <Text style={[g.text.body, { marginTop: 6 }]}>{preguntaActual.enunciado}</Text>

                        {preguntaActual.tipo === 'abcd' && (
                            <View style={{ marginTop: 12 }}>
                                {(preguntaActual.opciones || [])
                                    .filter((o) => !ocultas.includes(o.codOpcion))
                                    .map((op) => {
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

                        {preguntaActual.tipo === 'emparejar' && (
                            <Text style={g.text.caption}>
                                Para emparejar usa un campo de texto (ej: 1-6,2-5,3-4). Aquí puedes integrar un UI drag&drop.
                            </Text>
                        )}

                        {preguntaActual.tipo === 'reporte' && (
                            <Text style={g.text.caption}>Este tipo requiere upload de archivo; conecta tu picker y manda metadata al backend.</Text>
                        )}

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
                    </>
                )}
            </ScrollView>

            {/* Overlays */}
            <AnswerScreen />
            <FeedbackToast />
            <ComodinesBar />
        </View>
    );
}
