// app/(tabs)/homeRetos.tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    View, Text, Animated, Dimensions, Pressable, ActivityIndicator,
    Platform, UIManager, StyleSheet
} from 'react-native';
import Svg, {Polyline} from 'react-native-svg';
import {FontAwesome5} from '@expo/vector-icons';
import {useRouter} from 'expo-router';

import HeaderOperario from '../components/HeaderOperario';
import FadeWrapper from "../components/FadeWrapper";

import {Reto} from '../models/Reto';
import {ServicioGet} from '../services/ServicioGet';
import {styles as global} from "../styles/globalStyles";

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

// Curva
const NODE_SIZE = 84;
const STEP_Y = 120;
const AMPLITUDE = Math.min(120, SCREEN_W * 0.3);
const PERIOD_PX = 320;

// Popover
const POPOVER_W = 240;
const POPOVER_EST_H = 120;              // altura estimada para decidir arriba/abajo
const ARROW = 16;                        // tamaño del “rombo”
const GAP_NODE_POPOVER = 10;            // separación nodo-popover
const EXTRA_SCROLL_PAD = 260;           // para que el último no choque con el footer

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(n, max));
}

// X para un Y: seno centrado
function xOnS(yPx: number) {
    const centerX = SCREEN_W / 2;
    return centerX + AMPLITUDE * Math.sin((2 * Math.PI * yPx) / PERIOD_PX);
}

// Camino
function buildPolylinePoints(totalHeight: number) {
    const points: string[] = [];
    const step = 8;
    for (let y = 0; y <= totalHeight; y += step) {
        const x = xOnS(y);
        points.push(`${x},${y}`);
    }
    return points.join(' ');
}

// Calcular tiempo correctamente
function formatTiempo(ms: number) {
    if (!ms || isNaN(ms)) return '0 min';

    const totalMin = Math.floor(ms / 60000); // 60000 ms = 1 minuto
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;

    if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
}


export default function HomeRetosScreen() {
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

            const urlServicio = 'http://192.168.20.20:3550/reto/listar';
            const resultado = await ServicioGet.peticionGet(urlServicio);

            const mapeados: Reto[] = (resultado ?? []).map((item: any) =>
                new Reto(
                    item.codReto ?? item.cod ?? 0,
                    item.nombreReto ?? item.nombre ?? 'Reto',
                    item.descripcionReto ?? item.descripcion ?? '',
                    item.tiempoReto ?? item.tiempo ?? 0,
                    item.fechaInicioReto ?? item.fechaInicio ?? '',
                    item.fechaFinReto ?? item.fechaFin ?? '',
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
    const polylinePoints = useMemo(() => buildPolylinePoints(totalHeight), [totalHeight]);

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
            Animated.timing(popAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
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

    if (cargando) {
        return (
            <View style={[global.container, {alignItems: 'center', justifyContent: 'center'}]}>
                <ActivityIndicator size="large"/>
                <Text style={{marginTop: 12}}>Cargando retos…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[global.container, {alignItems: 'center', justifyContent: 'center'}]}>
                <Text style={{marginBottom: 12}}>Uy, se cayó esto: {error}</Text>
                <Pressable onPress={listarRetos} style={{padding: 12, backgroundColor: '#e5e7eb', borderRadius: 8}}>
                    <Text>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View>
                <HeaderOperario/>

                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: EXTRA_SCROLL_PAD }}  // más espacio vs footer
                >
                    {/* Camino en S */}
                    <View style={{height: totalHeight}}>
                        <Svg height={totalHeight} width={SCREEN_W} style={{position: 'absolute', top: 0, left: 0}}>
                            <Polyline
                                points={polylinePoints}
                                fill="none"
                                stroke="#001780"
                                strokeWidth={16}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.35}
                            />
                        </Svg>

                        {/* Nodos */}
                        {nodes.map(({reto, x, y}) => {
                            const left = x - NODE_SIZE / 2;
                            const top = y - NODE_SIZE / 2;

                            return (
                                <Pressable
                                    key={reto.codReto}
                                    onPress={() => openFor(reto.codReto)}
                                    style={[
                                        stylesNode.node,
                                        { left, top }
                                    ]}
                                >
                                    <View style={stylesNode.nodeInner}>
                                        <FontAwesome5 name="flag" size={24} color="#3B5BDB" />
                                    </View>
                                </Pressable>
                            );
                        })}

                        {/* Overlay para cerrar al tocar fuera */}
                        {expandedId != null && (
                            <Pressable
                                onPress={() => setExpandedId(null)}
                                style={StyleSheet.absoluteFill} // cubre toda el área de la S
                            />
                        )}

                        {/* Popover (render único, arriba de todo) */}
                        {active && (
                            <Animated.View
                                pointerEvents="box-none"
                                style={[
                                    stylesPopover.container,
                                    // z-index bien alto y elevation para Android
                                    { zIndex: 999, elevation: 20 },
                                    // posición calculada
                                    (() => {
                                        // ¿abre abajo o arriba?
                                        const isLast = active.idx === retos.length - 1;
                                        const preferDown = active.y + NODE_SIZE/2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                        const openDown = preferDown && !isLast ? true : false;

                                        const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                        const popTop = openDown
                                            ? active.y + NODE_SIZE / 2 + GAP_NODE_POPOVER
                                            : active.y - GAP_NODE_POPOVER - POPOVER_EST_H;

                                        return {
                                            left: popLeft,
                                            top: popTop,
                                        };
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
                                {/* punta/triángulo */}
                                {(() => {
                                    const isLast = active.idx === retos.length - 1;
                                    const preferDown = active.y + NODE_SIZE/2 + GAP_NODE_POPOVER + POPOVER_EST_H <= totalHeight - 16;
                                    const openDown = preferDown && !isLast ? true : false;

                                    // popLeft usado arriba (recalcular aquí igual)
                                    const popLeft = clamp(active.x - POPOVER_W / 2, 10, SCREEN_W - POPOVER_W - 10);
                                    // Alinear la punta con el centro del nodo
                                    const arrowLeft = clamp(active.x - popLeft - ARROW/2, 8, POPOVER_W - ARROW - 8);

                                    return (
                                        <View
                                            style={[
                                                stylesPopover.body,
                                                openDown ? { paddingTop: 14 } : { paddingBottom: 14 },
                                            ]}
                                        >
                                            {/* flechita */}
                                            <View
                                                style={[
                                                    stylesPopover.arrow,
                                                    openDown ? { top: -ARROW/2 } : { bottom: -ARROW/2 },
                                                    { left: arrowLeft },
                                                ]}
                                            />

                                            {/* contenido */}
                                            <Text style={stylesPopover.title}>
                                                {active.reto.nombreReto}
                                            </Text>
                                            <Text style={stylesPopover.subtitle}>
                                                (Aprox {formatTiempo(active.reto.tiempoReto)})
                                            </Text>


                                            <Pressable
                                                onPress={() =>
                                                    router.push({
                                                        pathname: '/reto/[id]',
                                                        params: { id: String(active.reto.codReto) },
                                                    })
                                                }
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

const stylesNode = StyleSheet.create({
    node: {
        position: 'absolute',
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: NODE_SIZE / 2,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#6C8CFF',
    },
    nodeInner: {
        width: NODE_SIZE - 14,
        height: NODE_SIZE - 14,
        borderRadius: (NODE_SIZE - 14) / 2,
        backgroundColor: '#EFF3FF',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

const stylesPopover = StyleSheet.create({
    container: {
        position: 'absolute',
        width: POPOVER_W,
    },
    body: {
        backgroundColor: '#CFCFD4',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 10,
        elevation: 6,
    },
    arrow: {
        position: 'absolute',
        width: ARROW,
        height: ARROW,
        backgroundColor: '#CFCFD4',
        transform: [{ rotate: '45deg' }],
        borderRadius: 3,
    },
    title: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    subtitle: { fontSize: 12, opacity: 0.8, marginTop: 2 },
    cta: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 24,
        backgroundColor: '#9CA3AF',
        borderRadius: 999,
    },
    ctaText: { color: 'white', fontSize: 14, fontWeight: '600' },
});
