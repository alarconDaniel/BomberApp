// app/(tabs)/homeRetos.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, Animated, Dimensions, Pressable, ActivityIndicator,
    Platform, UIManager, StyleSheet
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import HeaderOperario from '../../components/HeaderOperario';
import FadeWrapper from "../../components/FadeWrapper";
import { Reto } from '../../models/Reto';
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from '../../theme/ThemeProvider';
import {makeGlobalStyles} from "../../theme/GlobalStyles"; // <-- 🔵

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const NODE_SIZE = 84;
const STEP_Y = 120;
const AMPLITUDE = Math.min(120, SCREEN_W * 0.3);
const PERIOD_PX = 320;

const EXTRA_CURVE_TOP = 240;
const EXTRA_CURVE_BOTTOM = 240;

const POPOVER_W = 240;
const POPOVER_EST_H = 120;
const ARROW = 16;
const GAP_NODE_POPOVER = 10;

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(n, max)); }
function xOnS(yPx: number) { const centerX = SCREEN_W / 2; return centerX + AMPLITUDE * Math.sin((2 * Math.PI * yPx) / PERIOD_PX); }

function buildPolylinePointsExtended(totalHeight: number, extraTop: number, extraBottom: number) {
    const points: string[] = [];
    const step = 8;
    const totalLocal = totalHeight + extraTop + extraBottom;
    for (let yLocal = 0; yLocal <= totalLocal; yLocal += step) {
        const yWorld = yLocal - extraTop;
        const x = xOnS(yWorld);
        points.push(`${x},${yLocal}`);
    }
    return points.join(' ');
}

function formatTiempo(ms: number) {
    if (!ms || isNaN(ms)) return '0 min';
    const totalMin = Math.floor(ms / 60000);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
}

export default function HomeRetosScreen() {
    const { colors } = useTheme();                 // <-- 🔵
    const router = useRouter();
    const { fetchJson } = useAuth();

    const g = makeGlobalStyles(colors);

    const [retos, setRetos] = useState<Reto[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const popAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => { if (Platform.OS === 'android') { // @ts-ignore
        UIManager.setLayoutAnimationEnabledExperimental?.(true); }}, []);

    const listarRetos = async () => {
        try {
            setCargando(true); setError(null);
            const resultado = await fetchJson<any[]>('/mis-retos/listar');
            const mapeados: Reto[] = (resultado ?? []).map((item: any) => new Reto(
                item.codReto ?? item.cod ?? 0,
                item.nombreReto ?? item.nombre ?? 'Reto',
                item.descripcionReto ?? item.descripcion ?? '',
                item.tiempoEstimadoSegReto ?? item.tiempo ?? 0,
                item.fechaInicioReto ?? item.fechaInicio ?? '',
                item.fechaFinReto ?? item.fechaFin ?? '',
                item.completadoReto ?? item.completado ?? false,
            ));
            setRetos(mapeados);
        } catch (e: any) {
            setError(e?.message || 'Error cargando retos');
        } finally { setCargando(false); }
    };
    useEffect(() => { listarRetos(); }, []);

    const totalHeight = Math.max(SCREEN_H, (retos.length + 1) * STEP_Y);
    const polylinePoints = useMemo(
        () => buildPolylinePointsExtended(totalHeight, EXTRA_CURVE_TOP, EXTRA_CURVE_BOTTOM),
        [totalHeight]
    );

    const nodes = useMemo(() =>
        retos.map((r, idx) => {
            const y = 80 + idx * STEP_Y;
            const x = xOnS(y);
            return { reto: r, x, y, idx };
        }), [retos]);

    useEffect(() => {
        if (expandedId == null) {
            Animated.timing(popAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        } else {
            popAnim.setValue(0);
            Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
        }
    }, [expandedId]);

    const active = useMemo(() => (expandedId != null ? nodes.find(n => n.reto.codReto === expandedId) : null), [expandedId, nodes]);
    const openFor = (id: number) => setExpandedId(prev => (prev === id ? null : id));

    if (cargando) {
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text }}>Cargando retos…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: colors.bg }}>
                <Text style={{ marginBottom: 12, paddingHorizontal: 60, color: colors.text }}>Uy, se cayó esto: {error}</Text>
                <Pressable onPress={listarRetos} style={{ padding: 12, backgroundColor: colors.cardTint, borderRadius: 8, borderWidth: 1, borderColor: colors.divider }}>
                    <Text style={{ color: colors.text }}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={{ backgroundColor: colors.bg, flex: 1 }}>
                <HeaderOperario />

                <Animated.ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ height: totalHeight }}>
                        {/* Curva en S */}
                        <Svg
                            height={totalHeight + EXTRA_CURVE_TOP + EXTRA_CURVE_BOTTOM}
                            width={SCREEN_W}
                            style={{ position: 'absolute', top: -EXTRA_CURVE_TOP, left: 0 }}
                        >
                            <Polyline
                                points={polylinePoints}
                                fill="none"
                                stroke={colors.brandBlue}         // ⬅️ theme
                                strokeWidth={24}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.35}
                            />
                        </Svg>

                        {/* Nodos */}
                        {nodes.map(({ reto, x, y }) => {
                            const left = x - NODE_SIZE / 2;
                            const top = y - NODE_SIZE / 2;
                            const completed = reto.completadoReto;

                            return (
                                <Pressable
                                    key={reto.codReto}
                                    onPress={() => openFor(reto.codReto)}
                                    style={[
                                        {
                                            position: 'absolute',
                                            width: NODE_SIZE,
                                            height: NODE_SIZE,
                                            borderRadius: NODE_SIZE / 2,
                                            backgroundColor: colors.card,                 // ⬅
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#000',
                                            shadowOpacity: 0.12,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowRadius: 8,
                                            elevation: 4,
                                            borderWidth: 2,
                                            borderColor: colors.brandBlueBorder,          // ⬅
                                            left, top,
                                        },
                                    ]}
                                >
                                    <View
                                        style={{
                                            width: NODE_SIZE - 14,
                                            height: NODE_SIZE - 14,
                                            borderRadius: (NODE_SIZE - 14) / 2,
                                            backgroundColor: completed ? colors.successSoft : colors.brandBlueSoft, // ⬅
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FontAwesome5
                                            name={completed ? 'check' : 'flag'}
                                            size={24}
                                            color={completed ? colors.success : colors.primary} // ⬅
                                        />
                                    </View>
                                </Pressable>
                            );
                        })}

                        {/* Overlay para cerrar */}
                        {expandedId != null && (
                            <Pressable onPress={() => setExpandedId(null)} style={StyleSheet.absoluteFill} />
                        )}

                        {/* Popover */}
                        {active && (
                            <Animated.View
                                pointerEvents="box-none"
                                style={[
                                    { position: 'absolute', width: POPOVER_W, zIndex: 999, elevation: 20 },
                                    (() => {
                                        const isLast = active.idx === retos.length - 1;
                                        const preferDown = active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                        const openDown = preferDown && !isLast;
                                        const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                        const popTop = openDown ? active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER : active.y - GAP_NODE_POPOVER - POPOVER_EST_H;
                                        return { left: popLeft, top: popTop };
                                    })(),
                                    {
                                        opacity: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                                        transform: [
                                            { scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                                            { translateY: popAnim.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] }) },
                                        ],
                                    },
                                ]}
                            >
                                {(() => {
                                    const isLast = active.idx === retos.length - 1;
                                    const preferDown = active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                    const openDown = preferDown && !isLast;
                                    const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                    const arrowLeft = clamp(active.x - popLeft - ARROW / 2, 8, POPOVER_W - ARROW - 8);

                                    return (
                                        <View style={[{
                                            backgroundColor: colors.popoverBg,         // ⬅
                                            borderRadius: 14,
                                            paddingHorizontal: 14,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            shadowColor: '#000',
                                            shadowOpacity: 0.15,
                                            shadowOffset: { width: 0, height: 6 },
                                            shadowRadius: 10,
                                            elevation: 6,
                                        }, openDown ? { paddingTop: 14 } : { paddingBottom: 14 }]}>
                                            <View style={[{
                                                position: 'absolute',
                                                width: ARROW, height: ARROW,
                                                backgroundColor: colors.popoverBg,       // ⬅
                                                transform: [{ rotate: '45deg' }],
                                                borderRadius: 3,
                                                left: arrowLeft,
                                            }, openDown ? { top: -ARROW / 2 } : { bottom: -ARROW / 2 }]} />

                                            <Text style={g.text.challengeTitle}>{active.reto.nombreReto}</Text>
                                            <Text style={[g.text.challengeTime, { opacity: 0.8 }]}>
                                                (Aprox {formatTiempo(active.reto.tiempoEstimadoSegReto)})
                                            </Text>

                                            <Pressable
                                                onPress={() => router.push(`/(modals)/reto/${active.reto.codReto}`)}
                                                style={{
                                                    marginTop: 10,
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 24,
                                                    backgroundColor: colors.primary,       // ⬅
                                                    borderRadius: 999,
                                                }}
                                            >
                                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Ver</Text>
                                            </Pressable>
                                        </View>
                                    );
                                })()}
                            </Animated.View>
                        )}
                    </View>
                </Animated.ScrollView>
            </View>
        </FadeWrapper>
    );
}
