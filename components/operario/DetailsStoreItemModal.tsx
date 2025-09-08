import React, {useEffect, useRef, useState, useMemo} from 'react';
import {Modal, View, Text, Pressable, StyleSheet, Dimensions, Animated, Easing} from 'react-native';
import {Image} from 'expo-image';
import {BlurView} from 'expo-blur';
import Slider from '@react-native-community/slider';
import {FontAwesome5} from '@expo/vector-icons';
import {ItemTienda} from '../../models/ItemTienda';
import {useTheme} from '../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../theme/GlobalStyles';
import {resolveItemIconFromBd} from '../../config/icons/itemIcons';

const {width: SCREEN_W} = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemTienda | null;
    onClose: () => void;
    onBuy?: (item: ItemTienda, qty: number) => void;
    accentColor?: string;
    userCoins?: number;
    buying?: boolean;
};

const iconFallbackByTipo: Record<string, string> = {POTENCIADOR: 'bolt', COFRE: 'box-open', ROPA: 'tshirt'};

export default function DetailsStoreItemModal(props: Props) {
    const {visible, item, onClose, onBuy, accentColor = '#3B5BDB', userCoins = 0, buying = false} = props;
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    const isRopa = String(item?.tipoItem ?? '').toUpperCase() === 'ROPA';

    const [qty, setQty] = useState(1);
    const shake = useRef(new Animated.Value(0)).current;

    const bdIcon = item?.iconoPath;
    const localImg = resolveItemIconFromBd(bdIcon, isDark);

    const price = Number(item?.precioItem || 0);
    const quantityToUse = isRopa ? 1 : Math.max(1, qty);
    const total = useMemo(() => quantityToUse * price, [quantityToUse, price]);
    const hasFunds = total <= userCoins;

    useEffect(() => {
        if (!item) return;
        if (!hasFunds) {
            Animated.sequence([
                Animated.timing(shake, {toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: true}),
                Animated.timing(shake, {toValue: -1, duration: 60, easing: Easing.linear, useNativeDriver: true}),
                Animated.timing(shake, {toValue: 0.7, duration: 60, easing: Easing.linear, useNativeDriver: true}),
                Animated.timing(shake, {toValue: -0.7, duration: 60, easing: Easing.linear, useNativeDriver: true}),
                Animated.timing(shake, {
                    toValue: 0,
                    duration: 60,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true
                }),
            ]).start();
        }
    }, [hasFunds, item, shake]);

    const translateX = shake.interpolate({inputRange: [-1, 0, 1], outputRange: [-6, 0, 6]});
    const clamp = (n: number) => Math.min(99, Math.max(1, Math.round(n)));
    const handleBuy = () => {
        if (!item || !onBuy || !hasFunds || buying) return;
        if (isRopa && item.yaPosee) return; // bloquea si ya la tiene
        onBuy(item, isRopa ? 1 : clamp(qty));
    };

    if (!visible || !item) return null;

    const s = StyleSheet.create({
        backdrop: {...StyleSheet.absoluteFillObject},
        backdropBlur: {flex: 1},
        centerWrap: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16},
        card: {width: SCREEN_W * 0.9, borderRadius: 16, backgroundColor: colors.card, padding: 16},
        shadow: {
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: {width: 0, height: 6},
            shadowRadius: 12,
            elevation: 8
        },
        mediaRow: {flexDirection: 'row', gap: 12, alignItems: 'center'},
        image: {width: 92, height: 92, borderRadius: 12, backgroundColor: colors.imageBg},
        iconWrap: {
            width: 92,
            height: 92,
            borderRadius: 12,
            backgroundColor: colors.imageBg,
            alignItems: 'center',
            justifyContent: 'center'
        },
        pillRow: {flexDirection: 'row', gap: 8, marginTop: 8},
        pill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start'},
        pillText: {fontSize: 12, fontWeight: '700'},
        qtyRow: {flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16},
        circleBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: colors.inputBorder
        },
        circleTxt: {fontSize: 18, fontWeight: '800', color: colors.text},
        sliderWrap: {flex: 1, alignItems: 'stretch', justifyContent: 'center'},
        footer: {marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
        total: {fontSize: 18, fontWeight: '900'},
        buyBtn: {paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary},
        buyBtnDisabled: {opacity: 0.5},
    });

    const buyDisabled = buying || !hasFunds || (isRopa && item.yaPosee);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint="dark" style={s.backdropBlur}/>
            </Pressable>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Pressable style={[s.card, s.shadow]} onPress={() => {
                }}>
                    <Text style={[g.text.title, {marginBottom: 24}]} numberOfLines={2}>
                        {item.nombreItem}
                    </Text>

                    <View style={s.mediaRow}>
                         <Image
                           source={localImg}
                           contentFit="contain"
                           cachePolicy="memory-disk"
                           transition={120}
                           style={s.image}
                         />

                        <View style={{flex: 1}}>
                            <Text style={[g.text.body, g.text.secondary]} numberOfLines={5}>
                                {item.descripcionItem || 'Sin descripción.'}
                            </Text>
                            <Text style={[g.text.smallStrong, g.text.muted, {marginTop: 6}]}>Tus
                                monedas: {userCoins}</Text>
                            {isRopa && (
                                <View style={s.pillRow}>
                                    <View style={[s.pill, {borderColor: accentColor}]}>
                                        <Text style={[s.pillText, {color: accentColor}]}>Ropa (única)</Text>
                                    </View>
                                    {item.yaPosee && (
                                        <View style={[s.pill, {borderColor: colors.danger}]}>
                                            <Text style={[s.pillText, {color: colors.danger}]}>Ya la tienes</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Cantidad: sólo mostrar slider si NO es ropa */}
                    {!isRopa && (
                        <View style={s.qtyRow}>
                            <Pressable onPress={() => setQty((q) => clamp(q - 1))} style={s.circleBtn}>
                                <Text style={s.circleTxt}>−</Text>
                            </Pressable>

                            <Animated.View style={[s.sliderWrap, {transform: [{translateX}]}]}>
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
                                <Text style={[g.text.caption, {
                                    alignSelf: 'center',
                                    marginTop: 4,
                                    color: hasFunds ? colors.mutedText : colors.danger
                                }]}>
                                    {qty}
                                    {!hasFunds ? ' • Monedas insuficientes' : ''}
                                </Text>
                            </Animated.View>

                            <Pressable onPress={() => setQty((q) => clamp(q + 1))} style={s.circleBtn}>
                                <Text style={s.circleTxt}>+</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={s.footer}>
                        <Text
                            style={[s.total, {color: hasFunds ? colors.text : colors.danger}]}>{price > 0 ? `$${total}` : 'Gratis'}</Text>
                        <Pressable onPress={handleBuy} disabled={buyDisabled}
                                   style={[s.buyBtn, buyDisabled && s.buyBtnDisabled]}>
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                {!hasFunds ? 'Monedas insuficientes' : item.yaPosee && isRopa ? 'Ya la tienes' : buying ? 'Comprando…' : 'Comprar'}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}
