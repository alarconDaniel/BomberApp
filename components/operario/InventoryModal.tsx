import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Animated,
    Easing,
    InteractionManager,
    FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';
import { ItemInventario } from '../../models/ItemInventario';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Mode = 'details' | 'chest';
type Reward = { codItem: number; nombre: string; tipo: string; cantidad: number };
type ChestPayload = { size: 'pequeno' | 'medio' | 'grande'; rewards: Reward[] };

type Props = {
    visible: boolean;
    mode: Mode;
    item?: ItemInventario | null;
    chest?: ChestPayload | null;

    onRequestClose: () => void;

    // acciones
    onOpenChest?: (() => void) | undefined;
    opening?: boolean;

    accentColor?: string;
    showDate?: boolean;
};

export default function InventoryModal({
                                           visible,
                                           mode,
                                           item,
                                           chest,
                                           onRequestClose,
                                           onOpenChest,
                                           opening = false,
                                           accentColor,
                                           showDate = true,
                                       }: Props) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    // ===== Animaciones globales del Modal / cards =====
    const back = useRef(new Animated.Value(0)).current;            // backdrop 0..1
    const detailsCard = useRef(new Animated.Value(0)).current;     // card detalles 0..1
    const chestCard = useRef(new Animated.Value(0)).current;       // card chest 0..1
    const closingRef = useRef(false); // evita cierres reentrantes

    // ===== Animaciones internas del “chest” (glow y transforms) =====
    const chestScale = useRef(new Animated.Value(0.6)).current;    // native
    const chestRotate = useRef(new Animated.Value(0)).current;     // native
    const chestGlow = useRef(new Animated.Value(0)).current;       // JS (color)
    const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const revealListTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showList, setShowList] = useState(false);

    // ===== Backdrop mount/unmount =====
    useEffect(() => {
        if (visible) {
            closingRef.current = false;
            back.setValue(0);
            Animated.timing(back, {
                toValue: 1,
                duration: 220,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        } else {
            // Reset limpio al desmontar
            stopChestLoopsAndTimers();
            back.setValue(0);
            detailsCard.setValue(0);
            chestCard.setValue(0);
            chestScale.setValue(0.6);
            chestRotate.setValue(0);
            chestGlow.setValue(0);
            setShowList(false);
            closingRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // ===== Entrada/salida según modo =====
    useEffect(() => {
        if (!visible) return;

        if (mode === 'details') {
            // Mostrar detalles (card in); ocultar chest
            stopChestLoopsAndTimers();
            setShowList(false);

            chestCard.setValue(0);
            detailsCard.setValue(0);
            Animated.timing(detailsCard, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else {
            // Mostrar chest (card in); ocultar detalles
            detailsCard.setValue(0);
            chestCard.setValue(0);
            Animated.timing(chestCard, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(() => {
                // Arrancar anim interna del chest
                chestScale.setValue(0.6);
                chestRotate.setValue(0);
                chestGlow.setValue(0);
                setShowList(false);

                Animated.parallel([
                    Animated.timing(chestScale, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
                    Animated.timing(chestRotate, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                ]).start(() => {
                    const loop = Animated.loop(
                        Animated.sequence([
                            Animated.timing(chestGlow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
                            Animated.timing(chestGlow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
                        ])
                    );
                    glowLoopRef.current = loop;
                    loop.start();

                    revealListTimerRef.current = setTimeout(() => setShowList(true), 560);
                });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, visible]);

    const stopChestLoopsAndTimers = () => {
        glowLoopRef.current?.stop();
        glowLoopRef.current = null;
        if (revealListTimerRef.current) clearTimeout(revealListTimerRef.current);
        revealListTimerRef.current = null;
    };

    useEffect(() => {
        return () => {
            stopChestLoopsAndTimers();
        };
    }, []);

    // ===== Cierres con animación =====
    const closeAfter = (animateCard: Animated.Value) => {
        // 1) Sale la tarjeta actual
        Animated.timing(animateCard, {
            toValue: 0,
            duration: 170,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(() => {
            // 2) fade del backdrop
            Animated.timing(back, {
                toValue: 0,
                duration: 140,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }).start(() => {
                // 3) cerrar modal fuera de la fase sensible
                InteractionManager.runAfterInteractions(() => {
                    onRequestClose();
                });
            });
        });
    };

    const handleCloseFromDetails = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        closeAfter(detailsCard);
    };

    const handleCloseFromChest = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        stopChestLoopsAndTimers();
        closeAfter(chestCard);
    };

    const onTapBackdrop = () => {
        if (mode === 'chest') handleCloseFromChest();
        else handleCloseFromDetails();
    };

    // ===== Datos de Detalles =====
    const nombre = item?.item?.nombre ?? 'Item';
    const descripcion = item?.item?.descripcion || 'Sin descripción.';
    const cantidad = Number(item?.cantidad ?? 0);
    const fecha = item?.fecha ? new Date(item.fecha) : null;
    const tipo = String(item?.item?.tipo ?? '').toUpperCase();
    const bdIcon = item?.item?.icon;
    const localImg = item ? resolveItemIconFromBd(bdIcon, isDark) : null;

    const buyDisabled = !(tipo === 'COFRE') || !onOpenChest || opening || cantidad <= 0;

    // ===== Interpolaciones =====
    const detailsOpacity   = detailsCard;
    const detailsScale     = detailsCard.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    const detailsTranslate = detailsCard.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

    const chestOpacity     = chestCard;
    const chestScaleCard   = chestCard.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    const chestTranslate   = chestCard.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

    const rotZ = chestRotate.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] });
    const glowBg = chestGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.card, (colors as any).primarySoft || '#dfe7ff'],
    });

    const chestIconSize = chest?.size === 'grande' ? 88 : chest?.size === 'medio' ? 76 : 64;

    const s = StyleSheet.create({
        centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },

        // Detalles
        card: {
            width: SCREEN_W * 0.9,
            borderRadius: 16,
            backgroundColor: colors.card,
            padding: 16,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            elevation: 8,
            borderWidth: 1,
            borderColor: colors.divider,
        },
        mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        iconWrap: { width: 112, height: 112, borderRadius: 12, backgroundColor: colors.imageBg, alignItems: 'center', justifyContent: 'center' },
        footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        closeBtn: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card, alignItems: 'center' },
        actionBtn: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: opening ? 0.6 : 1 },
        pill: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: accentColor || colors.primary },

        // Chest
        chestCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        chestCardBox: {
            width: SCREEN_W * 0.9,
            borderRadius: 16,
            backgroundColor: colors.card,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.divider,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            elevation: 8,
        },
        chestWrapGlow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16 },
        chestInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 8 },
        rewardItem: {
            paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12,
            borderWidth: 1, borderColor: colors.inputBorder, marginVertical: 6, backgroundColor: colors.bg
        },
        footerRight: { marginTop: 12, alignItems: 'flex-end' },
        btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
    });

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            presentationStyle="overFullScreen"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={onTapBackdrop}
        >
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: back }]}>
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onTapBackdrop} />
            </Animated.View>

            {/* DETALLES */}
            {item && (
                <View
                    style={[
                        s.centerWrap,
                        mode === 'chest' && { opacity: 0, pointerEvents: 'none' }, // invisible bajo chest
                    ]}
                    pointerEvents={mode === 'chest' ? 'none' : 'box-none'}
                >
                    <Animated.View
                        style={[s.card, { opacity: detailsOpacity, transform: [{ scale: detailsScale }, { translateY: detailsTranslate }] }]}
                        pointerEvents="auto"
                    >
                        <Text style={[g.text.title, { marginBottom: 24 }]} numberOfLines={2}>{nombre}</Text>

                        <View style={s.mediaRow}>
                            <View style={s.iconWrap}>
                                {localImg && (
                                    <Image
                                        source={localImg}
                                        style={{ width: 102, height: 102, borderRadius: 12 }}
                                        contentFit="contain"
                                        cachePolicy="memory-disk"
                                        transition={120}
                                    />
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[g.text.body, g.text.secondary]} numberOfLines={6}>{descripcion}</Text>
                                <View style={{ marginTop: 8 }}>
                                    <Text style={g.text.bodyStrong}>
                                        Cantidad en tu inventario: <Text style={{ fontWeight: '900' }}>x{cantidad}</Text>
                                    </Text>
                                    {showDate && fecha && (
                                        <Text style={[g.text.caption]}>
                                            Desde: {fecha.toLocaleDateString()} {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    )}
                                    {tipo === 'COFRE' && (
                                        <View style={s.pill}>
                                            <Text style={[g.text.smallStrong, { color: accentColor || colors.primary }]}>
                                                Cofre: ábrelo para recibir recompensas
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <View style={s.footer}>
                            <Pressable onPress={handleCloseFromDetails} style={s.closeBtn}>
                                <Text style={g.text.smallStrong}>Cerrar</Text>
                            </Pressable>

                            {tipo === 'COFRE' && (
                                <Pressable onPress={onOpenChest} disabled={buyDisabled} style={s.actionBtn}>
                                    <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                        {opening ? 'Abriendo…' : cantidad > 0 ? 'Abrir cofre' : 'Sin cofres'}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* CHEST (recompensas) */}
            {mode === 'chest' && chest && (
                <View pointerEvents="box-none" style={s.chestCenter}>
                    <Animated.View style={[s.chestCardBox, { opacity: chestOpacity, transform: [{ scale: chestScaleCard }, { translateY: chestTranslate }] }]}>
                        <Text style={[g.text.title, { marginBottom: 10 }]}>
                            {chest.size === 'grande' ? '¡Cofre Grande!' : chest.size === 'medio' ? 'Cofre Medio' : 'Cofre Pequeño'}
                        </Text>

                        {/* Glow de fondo (JS-driven) */}
                        <Animated.View style={[s.chestWrapGlow, { backgroundColor: glowBg }]}>
                            {/* Transforms nativos */}
                            <Animated.View style={[s.chestInner, { transform: [{ scale: chestScale }, { rotateZ: rotZ }] }]}>
                                <FontAwesome5 name="box-open" size={chestIconSize} color={colors.primary} />
                                <Text style={[g.text.caption, g.text.muted, { marginTop: 6 }]}>{showList ? '¡Recompensas listas!' : 'Abriendo...'}</Text>
                            </Animated.View>
                        </Animated.View>

                        {showList && (
                            <>
                                <Text style={[g.text.bodyStrong, { marginTop: 6, marginBottom: 6 }]}>Recompensas</Text>
                                <FlatList
                                    data={chest.rewards}
                                    keyExtractor={(r, i) => `${r.codItem}-${i}`}
                                    renderItem={({ item: r }) => (
                                        <View style={s.rewardItem}>
                                            <Text style={g.text.bodyStrong}>x{r.cantidad} • {r.nombre}</Text>
                                            <Text style={[g.text.caption, g.text.muted]}>{r.tipo === 'ROPA' ? 'Ropa' : 'Potenciador'}</Text>
                                        </View>
                                    )}
                                    style={{ maxHeight: SCREEN_H * 0.35 }}
                                    showsVerticalScrollIndicator={false}
                                />
                            </>
                        )}

                        <View style={s.footerRight}>
                            <Pressable onPress={handleCloseFromChest} style={s.btn}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>Listo</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            )}
        </Modal>
    );
}
