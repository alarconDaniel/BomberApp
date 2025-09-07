// components/reto/QuizReto.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, SafeAreaView } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { Pregunta, asJson } from './utils';

type PowerupKey = '50-50' | 'extra_time' | 'streak_shield' | 'x2' | 'phoenix';

// Define un tipo para el map de respuestas por codPregunta.
// Usa unknown si quieres máxima flexibilidad (luego parseas según tipo de pregunta).
type RespuestasMap = Record<number, unknown>;

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
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const [idx, setIdx] = useState(0);
    const [tiempo, setTiempo] = useState(30);

    // <-- AQUÍ EL FIX IMPORTANTE
    const [respuestas, setRespuestas] = useState<RespuestasMap>({});

    const [inv, setInv] = useState<Record<PowerupKey, number>>({
        '50-50': 1,
        extra_time: 1,
        streak_shield: 1,
        x2: 1,
        phoenix: 1,
    });
    const [usedPowerupForQuestion, setUsedPowerupForQuestion] = useState<PowerupKey | null>(null);
    const [ocultas, setOcultas] = useState<number[]>([]);
    const [summary, setSummary] = useState<{
        visible: boolean;
        ok: number;
        bad: number;
        tiempo: number;
        xp: number;
        coins: number;
    }>({
        visible: false,
        ok: 0,
        bad: 0,
        tiempo: 0,
        xp: 0,
        coins: 0,
    });
    const [okCount, setOkCount] = useState(0);
    const [badCount, setBadCount] = useState(0);
    const [sumTiempo, setSumTiempo] = useState(0);

    const preguntaActual = preguntas[idx];
    const total = preguntas.length;

    // temporizador
    useEffect(() => {
        if (!preguntaActual || summary.visible) return;
        setTiempo(preguntaActual.tiempoMax ?? 30);
        setOcultas([]);
        const intId = setInterval(() => {
            setTiempo((t) => {
                if (t <= 1) {
                    clearInterval(intId);
                    responderYAvanzar({ auto: true });
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(intId);
    }, [idx, preguntaActual, summary.visible]); // añadí summary.visible para coherencia

    // Este setter ya no dispara TS7006 porque 'prev' se infiere como RespuestasMap
    const setResp = (codPregunta: number, v: unknown) =>
        setRespuestas((prev) => ({ ...prev, [codPregunta]: v }));

    const responderYAvanzar = async ({ auto = false }: { auto?: boolean } = {}) => {
        if (!preguntaActual) return;

        let valor: unknown = null;

        if (preguntaActual.tipo === 'abcd') {
            const sel = respuestas[preguntaActual.codPregunta] as number | undefined;
            if (!sel && !auto) {
                Alert.alert('Selecciona una opción');
                return;
            }
            valor = { abcd: sel ? [sel] : [] };
        } else if (preguntaActual.tipo === 'rellenar') {
            const txt = (respuestas[preguntaActual.codPregunta] ?? '').toString().trim();
            if (!txt && !auto) {
                Alert.alert('Escribe tu respuesta');
                return;
            }
            valor = { rellenar: txt };
        } else {
            valor = respuestas[preguntaActual.codPregunta] ?? {};
        }

        const tiempoSeg = (preguntaActual.tiempoMax ?? 30) - tiempo;

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

            const esOk: boolean = r?.esCorrecta ?? r?.correcta ?? false;
            if (esOk) setOkCount((p) => p + 1);
            else setBadCount((p) => p + 1);
            setSumTiempo((p) => p + tiempoSeg);

            if (idx + 1 < total) setIdx((p) => p + 1);
            else finalizar();
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos guardar tu respuesta');
        }
    };

    const finalizar = async () => {
        try {
            const r: any = await fetchJson(
                `/mis-retos/${codUsuarioReto}/finalizar`,
                asJson({ codUsuarioReto })
            );
            setSummary({
                visible: true,
                ok: okCount,
                bad: badCount,
                tiempo: sumTiempo,
                xp: r?.xpGanada ?? 0,
                coins: r?.coins ?? 0,
            });
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No pudimos finalizar');
        }
    };

    // UI
    if (summary.visible) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={[g.text.h2, { marginBottom: 20 }]}>Resumen</Text>
                <Text style={g.text.body}>✔ Correctas: {summary.ok}</Text>
                <Text style={g.text.body}>✖ Incorrectas: {summary.bad}</Text>
                <Text style={g.text.body}>⏱ Tiempo total: {summary.tiempo}s</Text>
                <Text style={g.text.body}>🪙 Monedas: {summary.coins}</Text>
                <Text style={g.text.body}>⭐ XP: {summary.xp}</Text>
                <Pressable
                    onPress={onFinish}
                    style={{ marginTop: 20, backgroundColor: '#22c55e', padding: 14, borderRadius: 999 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Continuar</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <ScrollView style={{ padding: 16 }}>
            {!preguntaActual ? (
                <Text style={g.text.body}>No hay preguntas.</Text>
            ) : (
                <>
                    <View style={{ marginTop: 10 }}>
                        <View style={{ height: 8, backgroundColor: colors.divider, borderRadius: 999 }}>
                            <View
                                style={{
                                    width: `${Math.round((idx / total) * 100)}%`,
                                    height: 8,
                                    backgroundColor: colors.primary,
                                }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                            <Text style={g.text.bodyStrong}>⏱ {tiempo}s</Text>
                            <Text style={g.text.bodyStrong}>
                                {idx + 1}/{total}
                            </Text>
                        </View>
                    </View>

                    <Text style={[g.text.h3, { marginTop: 10 }]}>Pregunta {preguntaActual.numero}</Text>
                    <Text style={[g.text.body, { marginTop: 6 }]}>{preguntaActual.enunciado}</Text>

                    {preguntaActual.tipo === 'abcd' && (
                        <View style={{ marginTop: 12 }}>
                            {(preguntaActual.opciones || [])
                                .filter((o) => !ocultas.includes(o.codOpcion))
                                .map((op) => {
                                    const active = respuestas[preguntaActual.codPregunta] === op.codOpcion;
                                    return (
                                        <Pressable
                                            key={op.codOpcion}
                                            onPress={() => setResp(preguntaActual.codPregunta, op.codOpcion)}
                                            style={{
                                                marginTop: 6,
                                                padding: 12,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: active ? colors.primary : colors.divider,
                                                backgroundColor: active ? colors.primary : 'transparent',
                                            }}
                                        >
                                            <Text style={{ color: active ? '#fff' : colors.text }}>{op.texto}</Text>
                                        </Pressable>
                                    );
                                })}
                        </View>
                    )}

                    {preguntaActual.tipo === 'rellenar' && (
                        <TextInput
                            placeholder="Escribe tu respuesta…"
                            placeholderTextColor={colors.mutedText}
                            value={(respuestas[preguntaActual.codPregunta] as string) ?? ''}
                            onChangeText={(t) => setResp(preguntaActual.codPregunta, t)}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.divider,
                                borderRadius: 10,
                                padding: 10,
                                color: colors.text,
                                marginTop: 8,
                            }}
                        />
                    )}

                    {preguntaActual.tipo === 'emparejar' && (
                        <Text style={g.text.caption}>Este tipo requiere UI especial (drag & drop).</Text>
                    )}

                    {preguntaActual.tipo === 'reporte' && (
                        <Text style={g.text.caption}>Este tipo requiere upload de archivo.</Text>
                    )}

                    <Pressable
                        onPress={() => responderYAvanzar()}
                        style={{
                            marginTop: 18,
                            paddingVertical: 14,
                            paddingHorizontal: 28,
                            backgroundColor: colors.primary,
                            borderRadius: 999,
                            alignSelf: 'center',
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '700' }}>
                            {idx + 1 < total ? 'Guardar y siguiente' : 'Finalizar'}
                        </Text>
                    </Pressable>
                </>
            )}
        </ScrollView>
    );
}
