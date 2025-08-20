// app/(tabs)/homeRetos.tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    View, Text, Animated, Dimensions, Pressable, ActivityIndicator,
    Platform, UIManager, StyleSheet
} from 'react-native';
import Svg, {Polyline} from 'react-native-svg';
import {FontAwesome5} from '@expo/vector-icons';
import {useRouter} from 'expo-router';

import HeaderOperario from '../../components/HeaderOperario';
import FadeWrapper from "../../components/FadeWrapper";

import {Reto} from '../../models/Reto';
import {styles as global} from "../../styles/globalStyles";
import {useAuth} from "../../auth/AuthContext";
import { useTheme } from '../../theme/ThemeProvider';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

// Curva
const NODE_SIZE = 84;
const STEP_Y = 120;
const AMPLITUDE = Math.min(120, SCREEN_W * 0.3);
const PERIOD_PX = 320;

// >>> Extensión solo de la curva (no cambia nodos ni layout)
const EXTRA_CURVE_TOP = 240;
const EXTRA_CURVE_BOTTOM = 240;

// Popover
const POPOVER_W = 240;
const POPOVER_EST_H = 120;
const ARROW = 16;
const GAP_NODE_POPOVER = 10;
const EXTRA_SCROLL_PAD = 260;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(n, max));
}

// X para un Y: seno centrado
function xOnS(yPx: number) {
    const centerX = SCREEN_W / 2;
    return centerX + AMPLITUDE * Math.sin((2 * Math.PI * yPx) / PERIOD_PX);
}

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

// Calcular tiempo correctamente
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
    const { fetchJson } = useAuth();
    const { colors } = useTheme();

    const router = useRouter();
    const [retos, setRetos] = useState<Reto[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // id del reto abierto
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Animación del popover
    const popAnim = useRef(new Animated.Value(0)).current;

    // Enable LayoutAnimation en Android por si se usa en el futuro
    useEffect(() => {
        if (Platform.OS === 'android') {
            // @ts-ignore
            UIManager.setLayoutAnimationEnabledExperimental?.(true);
        }
    }, []);

    const listarRetos = async () => {
        try {
            setCargando(true);
            setError(null);

            const resultado = await fetchJson<any[]>('/mis-retos/listar');

            const mapeados: Reto[] = (resultado ?? []).map((item: any) =>
                new Reto(
                    item.codReto ?? item.cod ?? 0,
                    item.nombreReto ?? item.nombre ?? 'Reto',
                    item.descripcionReto ?? item.descripcion ?? '',
                    item.tiempoEstimadoSegReto ?? item.tiempo ?? 0,
                    item.fechaInicioReto ?? item.fechaInicio ?? '',
                    item.fechaFinReto ?? item.fechaFin ?? '',
                    item.completadoReto ?? item.completado ?? false,
                )
            );

            setRetos(mapeados);
        } catch (e: any) {
            setError(e?.message || 'Error cargando retos');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        listarRetos();
    }, []);

    // Geometría
    const totalHeight = Math.max(SCREEN_H, (retos.length + 1) * STEP_Y);

    // Puntos extendidos de la curva
    const polylinePoints = useMemo(
        () => buildPolylinePointsExtended(totalHeight, EXTRA_CURVE_TOP, EXTRA_CURVE_BOTTOM),
        [totalHeight]
    );

    const nodes = useMemo(
        () =>
            retos.map((r, idx) => {
                const y = 80 + idx * STEP_Y;
                const x = xOnS(y);
                return {reto: r, x, y, idx};
            }),
        [retos]
    );

    // Animar abrir/cerrar según expandedId
    useEffect(() => {
        if (expandedId == null) {
            Animated.timing(popAnim, {toValue: 0, duration: 140, useNativeDriver: true}).start();
        } else {
            popAnim.setValue(0);
            Animated.spring(popAnim, {
                toValue: 1,
                useNativeDriver: true,
                friction: 6,
                tension: 120,
            }).start();
        }
    }, [expandedId]);

    const active = useMemo(
        () => (expandedId != null ? nodes.find(n => n.reto.codReto === expandedId) : null),
        [expandedId, nodes]
    );

    const openFor = (id: number) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const s = useMemo(() => makeStyles(colors), [colors]);
    const stylesNode = useMemo(() => makeNodeStyles(colors), [colors]);
    const stylesPopover = useMemo(() => makePopoverStyles(colors), [colors]);

    if (cargando) {
        return (
            <View style={[{alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: colors.bg}]}>
                <ActivityIndicator size="large" color={colors.primary}/>
                <Text style={{marginTop: 20, color: colors.text}}>Cargando retos…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[{alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: colors.bg}]}>
                <Text style={{marginBottom: 12, paddingHorizontal: 60, color: colors.text}}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable
                    onPress={listarRetos}
                    style={{
                        padding: 12,
                        backgroundColor: colors.cardTint,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.divider
                    }}
                >
                    <Text style={{ color: colors.text }}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
                <HeaderOperario/>

                <Animated.ScrollView showsVerticalScrollIndicator={false}>
                    {/* Camino en S */}
                    <View style={{height: totalHeight}}>
                        <Svg
                            height={totalHeight + EXTRA_CURVE_TOP + EXTRA_CURVE_BOTTOM}
                            width={SCREEN_W}
                            style={{position: 'absolute', top: -EXTRA_CURVE_TOP, left: 0}}
                        >
                            <Polyline
                                points={polylinePoints}
                                fill="none"
                                stroke={colors.primary}
                                strokeWidth={24}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.35}
                            />
                        </Svg>

                        {/* Nodos */}
                        {nodes.map(({reto, x, y}) => {
                            const left = x - NODE_SIZE / 2;
                            const top = y - NODE_SIZE / 2;

                            const innerCompleted = {
                                backgroundColor: colors.primarySoft,
                                borderRadius: (NODE_SIZE - 14) / 2,
                                width: NODE_SIZE - 14,
                                height: NODE_SIZE - 14,
                                alignItems: 'center',
                                justifyContent: 'center',
                            } as const;

                            return (
                                <Pressable
                                    key={reto.codReto}
                                    onPress={() => openFor(reto.codReto)}
                                    style={[stylesNode.node, {left, top}]}
                                >
                                    {reto.completadoReto ? (
                                        <View style={innerCompleted}>
                                            <FontAwesome5 name="check" size={24} color={colors.primary}/>
                                        </View>
                                    ) : (
                                        <View style={stylesNode.nodeInner}>
                                            <FontAwesome5 name="flag" size={24} color={colors.primary}/>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}

                        {/* Overlay para cerrar al tocar fuera */}
                        {expandedId != null && (
                            <Pressable onPress={() => setExpandedId(null)} style={StyleSheet.absoluteFill} />
                        )}

                        {/* Popover */}
                        {active && (
                            <Animated.View
                                pointerEvents="box-none"
                                style={[
                                    stylesPopover.container,
                                    {zIndex: 999, elevation: 20},
                                    (() => {
                                        const isLast = active.idx === retos.length - 1;
                                        const preferDown = active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                        const openDown = preferDown && !isLast ? true : false;

                                        const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                        const popTop = openDown
                                            ? active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER
                                            : active.y - GAP_NODE_POPOVER - POPOVER_EST_H;

                                        return { left: popLeft, top: popTop };
                                    })(),
                                    {
                                        opacity: popAnim.interpolate({inputRange: [0, 1], outputRange: [0, 1]}),
                                        transform: [
                                            {scale: popAnim.interpolate({inputRange: [0, 1], outputRange: [0.95, 1]})},
                                            {translateY: popAnim.interpolate({inputRange: [0, 1], outputRange: [-4, 0]})},
                                        ],
                                    },
                                ]}
                            >
                                {(() => {
                                    const isLast = active.idx === retos.length - 1;
                                    const preferDown = active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                    const openDown = preferDown && !isLast ? true : false;

                                    const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                    const arrowLeft = clamp(active.x - popLeft - ARROW / 2, 8, POPOVER_W - ARROW - 8);

                                    return (
                                        <View
                                            style={[
                                                stylesPopover.body,
                                                openDown ? {paddingTop: 14} : {paddingBottom: 14},
                                            ]}
                                        >
                                            {/* flechita */}
                                            <View
                                                style={[
                                                    stylesPopover.arrow,
                                                    openDown ? {top: -ARROW / 2} : {bottom: -ARROW / 2},
                                                    {left: arrowLeft},
                                                ]}
                                            />

                                            {/* contenido */}
                                            <Text style={stylesPopover.title}>
                                                {active.reto.nombreReto}
                                            </Text>
                                            <Text style={stylesPopover.subtitle}>
                                                (Aprox {formatTiempo(active.reto.tiempoEstimadoSegReto)})
                                            </Text>

                                            <Pressable
                                                onPress={() => router.push(`/(modals)/reto/${active.reto.codReto}`)}
                                                style={stylesPopover.cta}
                                            >
                                                <Text style={stylesPopover.ctaText}>Ver</Text>
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

/* ---------- estilos dependientes del tema ---------- */
const makeStyles = (c: import('../../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        // Puedes extender estilos globales aquí si hace falta
    });

const makeNodeStyles = (c: import('../../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        node: {
            position: 'absolute',
            width: NODE_SIZE,
            height: NODE_SIZE,
            borderRadius: NODE_SIZE / 2,
            backgroundColor: c.card,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowOffset: {width: 0, height: 4},
            shadowRadius: 8,
            elevation: 4,
            borderWidth: 2,
            borderColor: c.primary,
        },
        nodeInner: {
            width: NODE_SIZE - 14,
            height: NODE_SIZE - 14,
            borderRadius: (NODE_SIZE - 14) / 2,
            backgroundColor: c.cardTint,
            alignItems: 'center',
            justifyContent: 'center',
        }
    });

const makePopoverStyles = (c: import('../../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        container: {
            position: 'absolute',
            width: POPOVER_W,
        },
        body: {
            backgroundColor: c.card,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowOffset: {width: 0, height: 6},
            shadowRadius: 10,
            elevation: 6,
            borderWidth: 1,
            borderColor: c.divider,
        },
        arrow: {
            position: 'absolute',
            width: ARROW,
            height: ARROW,
            backgroundColor: c.card,
            transform: [{rotate: '45deg'}],
            borderRadius: 3,
            borderColor: c.divider,
            borderWidth: 1,
        },
        title: {fontSize: 14, fontWeight: '600', textAlign: 'center', color: c.text},
        subtitle: {fontSize: 12, opacity: 0.8, marginTop: 2, color: c.sub},
        cta: {
            marginTop: 10,
            paddingVertical: 8,
            paddingHorizontal: 24,
            backgroundColor: c.primary,
            borderRadius: 999,
        },
        ctaText: {color: '#fff', fontSize: 14, fontWeight: '600'},
    });
