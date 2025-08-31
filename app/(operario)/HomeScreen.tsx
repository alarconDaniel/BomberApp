// app/(operario)/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, Animated, Dimensions, Pressable, ActivityIndicator,
    Platform, UIManager, StyleSheet
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import HeaderOperario from '../../components/operario/HeaderOperario';
import FadeWrapper from "../../components/operario/FadeWrapper";
import { Reto } from '../../models/Reto';
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from "../../theme/GlobalStyles";
import RNDateTimePicker from "@react-native-community/datetimepicker";

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

function formatTiempo(seg: number) {
    if (!seg || isNaN(seg)) return '0 min';
    const totalMin = Math.floor(seg / 60);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;
    if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
}

function formatFechaBonita(d: Date, hoy: Date) {
    const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const str = d.toLocaleDateString('es-CO', opts);
    const isHoy = d.toDateString() === hoy.toDateString();
    return isHoy ? `Hoy, ${str}` : str.charAt(0).toUpperCase() + str.slice(1);
}

function estadoToIcon(estado: Reto['estado']): { name: any, bg: string, fg: string, ring: string } {
    switch (estado) {
        case 'completado': return { name: 'check', bg: '#E7F8EE', fg: '#1BA97A', ring: '#A8EBCF' };
        case 'en_progreso': return { name: 'play', bg: '#FFF4E5', fg: '#E48B00', ring: '#FFD9A6' };
        case 'abandonado':
        case 'vencido':    return { name: 'times', bg: '#FCE8E8', fg: '#D63D3D', ring: '#F4B9B9' };
        case 'asignado':
        default:           return { name: 'flag', bg: '#E7F0FF', fg: '#2D6AE3', ring: '#BFD2FF' };
    }
}

export default function HomeRetosScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { fetchJson } = useAuth();

    const g = makeGlobalStyles(colors);

    const [retos, setRetos] = useState<Reto[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // ⬇️ Medición para posicionar el calendario flotante justo debajo del header
    const [headerBottom, setHeaderBottom] = useState<number>(80);

    const popAnim = useRef(new Animated.Value(0)).current;

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [pickerVisible, setPickerVisible] = useState(false);
    const togglePicker = () => setPickerVisible(v => !v);

    useEffect(() => {
        if (Platform.OS === 'android') {
            // @ts-ignore
            UIManager.setLayoutAnimationEnabledExperimental?.(true);
        }
    }, []);

    const ymd = (d: Date) => d.toISOString().split('T')[0];

    const listarRetos = async (d: Date) => {
        try {
            setCargando(true); setError(null);
            const fecha = ymd(d);
            const resultado = await fetchJson<any[]>(`/mis-retos/listar?fecha=${fecha}`);
            const mapeados: Reto[] = (resultado ?? []).map((item: any) => new Reto(
                item.codReto ?? item.cod ?? 0,
                item.nombreReto ?? item.nombre ?? 'Reto',
                item.descripcionReto ?? item.descripcion ?? '',
                item.tiempoEstimadoSegReto ?? item.tiempo ?? 0,
                item.fechaInicioReto ?? item.fechaInicio ?? '',
                item.fechaFinReto ?? item.fechaFin ?? '',
                (item.estado as Reto['estado']) ?? 'asignado',
                item.fechaObjetivo,
                item.esAutomatico === 1 || item.esAutomatico === true
            ));
            setRetos(mapeados);
        } catch (e: any) {
            setError(e?.message || 'Error cargando retos');
        } finally { setCargando(false); }
    };

    useEffect(() => { listarRetos(selectedDate); }, [selectedDate]);

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

    const today = new Date();
    const headerStr = formatFechaBonita(selectedDate, today);

    const onPickDate = (_: any, date?: Date) => {
        setPickerVisible(false);
        if (!date) return;
        // no permitir futuros:
        if (date > today) return;
        setSelectedDate(date);
        setExpandedId(null);
    };

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
                <Pressable onPress={() => listarRetos(selectedDate)} style={{ padding: 12, backgroundColor: colors.cardTint, borderRadius: 8, borderWidth: 1, borderColor: colors.divider }}>
                    <Text style={{ color: colors.text }}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={{ backgroundColor: colors.bg, flex: 1 }}>
                <HeaderOperario />

                {/* Encabezado de día + botón de calendario */}
                <View
                    onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        setHeaderBottom(y + height);
                    }}
                    style={{
                        paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                    }}
                >
                    <View>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
                            {headerStr}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontSize: 13 }}>
                            {retos.length} reto{retos.length === 1 ? '' : 's'} para este día
                        </Text>
                    </View>
                    <Pressable
                        onPress={togglePicker}
                        style={{
                            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider,
                            flexDirection: 'row', alignItems: 'center', gap: 8
                        }}
                    >
                        <FontAwesome5 name="calendar-alt" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>
                            Fecha
                        </Text>
                    </Pressable>
                </View>

                {/* 📌 Calendario flotante (no empuja el layout) */}
                {pickerVisible && (
                    <>
                        {Platform.OS === 'ios' ? (
                            <>
                                {/* Backdrop para cerrar tocando fuera */}
                                <Pressable
                                    onPress={() => setPickerVisible(false)}
                                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.12)', zIndex: 999 }]}
                                />
                                {/* Card flotante posicionada debajo del header */}
                                <View
                                    style={{
                                        position: 'absolute',
                                        left: 12,
                                        right: 12,
                                        top: headerBottom + 4,
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        backgroundColor: colors.card,
                                        borderWidth: 1,
                                        borderColor: colors.divider,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 4,
                                        zIndex: 1000,
                                        elevation: 50, // Android ignora (pero no hace daño)
                                    }}
                                >
                                    <RNDateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        display="inline"
                                        onChange={onPickDate}
                                        maximumDate={today}
                                        themeVariant={isDark ? 'dark' : 'light'}
                                        // iOS-only (silencia TS si hace falta)
                                        // @ts-ignore
                                        textColor={colors.text}
                                        // @ts-ignore
                                        accentColor={colors.primary}
                                        style={{
                                            backgroundColor: colors.card,
                                            alignSelf: 'center',
                                        }}
                                    />
                                </View>
                            </>
                        ) : (
                            // ANDROID: usar modal nativo (no desplaza nada)
                            <RNDateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="default"
                                onChange={onPickDate}
                                maximumDate={today}
                                themeVariant={isDark ? 'dark' : 'light'}
                            />
                        )}
                    </>
                )}

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
                                stroke={colors.brandBlue}
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

                            const ico = estadoToIcon(reto.estado);

                            return (
                                <Pressable
                                    key={`${reto.codReto}-${reto.fechaObjetivo ?? ''}`}
                                    onPress={() => openFor(reto.codReto)}
                                    style={[
                                        {
                                            position: 'absolute',
                                            width: NODE_SIZE,
                                            height: NODE_SIZE,
                                            borderRadius: NODE_SIZE / 2,
                                            backgroundColor: colors.card,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#000',
                                            shadowOpacity: 0.12,
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowRadius: 8,
                                            elevation: 4,
                                            borderWidth: 2,
                                            borderColor: ico.ring,
                                            left, top,
                                        },
                                    ]}
                                >
                                    <View
                                        style={{
                                            width: NODE_SIZE - 14,
                                            height: NODE_SIZE - 14,
                                            borderRadius: (NODE_SIZE - 14) / 2,
                                            backgroundColor: ico.bg,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FontAwesome5
                                            name={ico.name as any}
                                            size={24}
                                            color={ico.fg}
                                            solid
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
                                            backgroundColor: colors.popoverBg,
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
                                                backgroundColor: colors.popoverBg,
                                                transform: [{ rotate: '45deg' }],
                                                borderRadius: 3,
                                                left: arrowLeft,
                                            }, openDown ? { top: -ARROW / 2 } : { bottom: -ARROW / 2 }]} />

                                            <Text style={g.text.challengeTitle}>{active.reto.nombreReto}</Text>
                                            <Text style={[g.text.challengeTime, { opacity: 0.8 }]}>
                                                (Aprox {formatTiempo(active.reto.tiempoEstimadoSegReto)})
                                            </Text>
                                            {active.reto.esAutomatico ? (
                                                <Text style={{ marginTop: 4, fontSize: 12, color: colors.mutedText }}>Reto automático</Text>
                                            ) : null}

                                            <Pressable
                                                onPress={() => router.push(`/(modals)/reto/${active.reto.codReto}`)}
                                                style={{
                                                    marginTop: 10,
                                                    paddingVertical: 8,
                                                    paddingHorizontal: 24,
                                                    backgroundColor: colors.primary,
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
