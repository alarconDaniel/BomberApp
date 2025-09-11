import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions, Animated, Easing, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemTienda } from '../../models/ItemTienda';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';

const { width: SCREEN_W } = Dimensions.get('window');

type Mode = 'details' | 'success';

type Props = {
    visible: boolean;
    mode: Mode;
    item?: ItemTienda | null;
    successInfo?: { name: string; qty: number } | null;
    onRequestClose: () => void;            // cerrar TODO el modal
    onBuy?: (item: ItemTienda, qty: number) => void;
    userCoins?: number;
    buying?: boolean;
    accentColor?: string;
    autoCloseMs?: number;
};

export default function StoreModal({
                                       visible,
                                       mode,
                                       item,
                                       successInfo,
                                       onRequestClose,
                                       onBuy,
                                       userCoins = 0,
                                       buying = false,
                                       accentColor = '#3B5BDB',
                                       autoCloseMs = 1800,
                                   }: Props) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    // ANIMS
    const back = useRef(new Animated.Value(0)).current;            // 0..1 (backdrop)
    const detailsCard = useRef(new Animated.Value(0)).current;     // 0..1 (card detalles)
    const successCard = useRef(new Animated.Value(0)).current;     // 0..1 (card éxito)
    const pulse = useRef(new Animated.Value(0)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
    const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closingRef = useRef(false); // evita cierres reentrantes

    // Montaje del backdrop (entrada suave)
    useEffect(() => {
        if (visible) {
            closingRef.current = false;
            back.setValue(0);
            Animated.timing(back, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
        } else {
            // reset limpio al desmontar
            pulseLoop.current?.stop();
            if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null; }
            back.setValue(0);
            successCard.setValue(0);
            detailsCard.setValue(0);
            pulse.setValue(0);
            closingRef.current = false;
        }
    }, [visible, back, successCard, detailsCard, pulse]);

    // Entrada/salida tarjetas según modo
    useEffect(() => {
        if (!visible) return;

        // apagar loops/timers anteriores de success
        pulseLoop.current?.stop();
        if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null; }

        if (mode === 'details') {
            // Mostrar detalles (card in)
            successCard.setValue(0);              // seguridad: éxito fuera
            detailsCard.setValue(0);
            Animated.timing(detailsCard, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        } else {
            // Mostrar éxito (card in); ocultar detalles de inmediato
            detailsCard.setValue(0);
            successCard.setValue(0);
            pulse.setValue(0);

            Animated.timing(successCard, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
                const loop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                    ])
                );
                pulseLoop.current = loop;
                loop.start();

                if (autoCloseMs && autoCloseMs > 0) {
                    successTimer.current = setTimeout(() => handleCloseFromSuccess(), autoCloseMs);
                }
            });
        }
    }, [mode, visible, autoCloseMs, detailsCard, successCard, pulse]);

    // ========= cierres =========
    const handleCloseFromDetails = () => {
        if (closingRef.current) return;
        closingRef.current = true;

        // 1) Sale card de DETALLES (backdrop queda opaco)
        Animated.timing(detailsCard, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true })
            .start(() => {
                // 2) fade del backdrop
                Animated.timing(back, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true })
                    .start(() => {
                        // 3) cerrar modal fuera de la fase sensible
                        InteractionManager.runAfterInteractions(() => {
                            onRequestClose();
                        });
                    });
            });
    };

    const handleCloseFromSuccess = () => {
        if (closingRef.current) return;
        closingRef.current = true;

        Animated.timing(successCard, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true })
            .start(() => {
                pulseLoop.current?.stop();
                if (successTimer.current) { clearTimeout(successTimer.current); successTimer.current = null; }

                Animated.timing(back, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true })
                    .start(() => {
                        InteractionManager.runAfterInteractions(() => {
                            onRequestClose();
                        });
                    });
            });
    };

    // ========= UI DETALLES =========
    const isRopa = String(item?.tipoItem ?? '').toUpperCase() === 'ROPA';
    const [qty, setQty] = useState(1);
    useEffect(() => { setQty(1); }, [item?.codItem]);

    const price = Number(item?.precioItem || 0);
    const quantityToUse = isRopa ? 1 : Math.max(1, qty);
    const total = useMemo(() => quantityToUse * price, [quantityToUse, price]);
    const hasFunds = total <= userCoins;

    const shake = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!item) return;
        if (!hasFunds) {
            Animated.sequence([
                Animated.timing(shake, { toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -1, duration: 60, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0.7, duration: 60, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -0.7, duration: 60, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            ]).start();
        }
    }, [hasFunds, item, shake]);
    const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-6, 0, 6] });

    const bdIcon = item?.iconoPath;
    const localImg = item ? resolveItemIconFromBd(bdIcon, isDark) : null;
    const buyDisabled = !item || buying || !hasFunds || (isRopa && item.yaPosee);

    const clamp = (n: number) => Math.min(99, Math.max(1, Math.round(n)));
    const handleBuyPress = () => { if (item && onBuy && !buyDisabled) onBuy(item, isRopa ? 1 : clamp(qty)); };

    const s = StyleSheet.create({
        centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        card: {
            width: SCREEN_W * 0.9, borderRadius: 16, backgroundColor: colors.card, padding: 16,
            shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8,
            borderWidth: 1, borderColor: colors.divider,
        },
        mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        image: { width: 120, height: 120, borderRadius: 12, backgroundColor: colors.imageBg },
        pillRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
        pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
        pillText: { fontSize: 12, fontWeight: '700' },
        qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
        circleBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: colors.inputBorder },
        circleTxt: { fontSize: 18, fontWeight: '800', color: colors.text },
        sliderWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
        footer: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        total: { fontSize: 18, fontWeight: '900' },
        buyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
        buyBtnDisabled: { opacity: 0.5 },

        successCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        successCard: {
            width: '86%', borderRadius: 16, backgroundColor: colors.card, padding: 16, alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8,
        },
        badge: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
        ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: colors.success },
        successBtn: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.success },
    });

    // Helpers de cierre (tap fuera / back)
    const onTapBackdrop = () => {
        if (mode === 'success') handleCloseFromSuccess();
        else handleCloseFromDetails();
    };

    // Interpolaciones
    const detailsOpacity   = detailsCard;
    const detailsScale     = detailsCard.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    const detailsTranslate = detailsCard.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

    const successOpacity   = successCard;
    const successScale     = successCard.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    const successTranslate = successCard.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
    const ringScale        = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
    const ringOpacity      = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            presentationStyle="overFullScreen"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={onTapBackdrop}  // Android back
        >
            {/* Backdrop único */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: back }]}>
                <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
                <Pressable style={StyleSheet.absoluteFillObject} onPress={onTapBackdrop} />
            </Animated.View>

            {/* DETALLES (se oculta totalmente cuando mode='success') */}
            {item && (
                <View
                    style={[
                        s.centerWrap,
                        mode === 'success' && { opacity: 0, pointerEvents: 'none' }, // <- clave anti-flash
                    ]}
                    pointerEvents={mode === 'success' ? 'none' : 'box-none'}
                >
                    <Animated.View
                        style={[
                            s.card,
                            { opacity: detailsOpacity, transform: [{ scale: detailsScale }, { translateY: detailsTranslate }] },
                        ]}
                        pointerEvents="auto"
                    >
                        <Text style={[g.text.title, { marginBottom: 24 }]} numberOfLines={2}>
                            {item.nombreItem}
                        </Text>

                        <View style={s.mediaRow}>
                            {localImg && <Image source={localImg} contentFit="contain" cachePolicy="memory-disk" transition={120} style={s.image} />}
                            <View style={{ flex: 1 }}>
                                <Text style={[g.text.body, g.text.secondary]} numberOfLines={5}>
                                    {item.descripcionItem || 'Sin descripción.'}
                                </Text>
                                <Text style={[g.text.smallStrong, g.text.muted, { marginTop: 6 }]}>Tus monedas: {userCoins}</Text>
                                {String(item.tipoItem).toUpperCase() === 'ROPA' && (
                                    <View style={s.pillRow}>
                                        <View style={[s.pill, { borderColor: accentColor }]}>
                                            <Text style={[s.pillText, { color: accentColor }]}>Ropa (única)</Text>
                                        </View>
                                        {item.yaPosee && (
                                            <View style={[s.pill, { borderColor: colors.danger }]}>
                                                <Text style={[s.pillText, { color: colors.danger }]}>Ya la tienes</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {String(item.tipoItem).toUpperCase() !== 'ROPA' && (
                            <View style={s.qtyRow}>
                                <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={s.circleBtn}>
                                    <Text style={s.circleTxt}>−</Text>
                                </Pressable>

                                <Animated.View style={[s.sliderWrap, { transform: [{ translateX }] }]}>
                                    <Slider
                                        value={qty}
                                        onValueChange={(v: number) => setQty(Math.min(99, Math.max(1, Math.round(v))))}
                                        minimumValue={1}
                                        maximumValue={20}
                                        step={1}
                                        minimumTrackTintColor={hasFunds ? accentColor : colors.danger}
                                        maximumTrackTintColor={hasFunds ? colors.mutedBg : colors.dangerSoft}
                                        thumbTintColor={hasFunds ? accentColor : colors.danger}
                                    />
                                    <Text style={[g.text.caption, { alignSelf: 'center', marginTop: 4, color: hasFunds ? colors.mutedText : colors.danger }]}>
                                        {qty}{!hasFunds ? ' • Monedas insuficientes' : ''}
                                    </Text>
                                </Animated.View>

                                <Pressable onPress={() => setQty((q) => Math.min(99, q + 1))} style={s.circleBtn}>
                                    <Text style={s.circleTxt}>+</Text>
                                </Pressable>
                            </View>
                        )}

                        <View style={s.footer}>
                            <Text style={[s.total, { color: hasFunds ? colors.text : colors.danger }]}>{price > 0 ? `$${total}` : 'Gratis'}</Text>
                            <Pressable onPress={handleBuyPress} disabled={buyDisabled} style={[s.buyBtn, buyDisabled && s.buyBtnDisabled]}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {!hasFunds ? 'Monedas insuficientes'
                                        : (isRopa && item.yaPosee) ? 'Ya la tienes'
                                            : buying ? 'Comprando…' : 'Comprar'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* ÉXITO (encima de todo, en el mismo modal) */}
            {mode === 'success' && (
                <View pointerEvents="box-none" style={s.successCenter}>
                    <Animated.View style={[s.successCard, { opacity: successOpacity, transform: [{ scale: successScale }, { translateY: successTranslate }] }]}>
                        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                            <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                            <View style={s.badge}>
                                <FontAwesome5 name="check" size={28} color="white" />
                            </View>
                        </View>
                        <Text style={g.text.title}>¡Compra confirmada!</Text>
                        <Text style={[g.text.body, g.text.secondary, { textAlign: 'center', marginBottom: 12 }]}>
                            Se ha comprado {successInfo?.qty ?? 1} × <Text style={g.text.bodyStrong}>{successInfo?.name ?? ''}</Text>
                        </Text>
                        <Pressable onPress={handleCloseFromSuccess} style={s.successBtn}>
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Listo</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}
        </Modal>
    );
}
