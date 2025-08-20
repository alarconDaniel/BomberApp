import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Image,
    Animated,
    Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemTienda } from '../models/ItemTienda';
import { useTheme } from '../theme/ThemeProvider';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemTienda | null;
    onClose: () => void;
    onBuy?: (item: ItemTienda, qty: number) => void;
    accentColor?: string;
    userCoins?: number;
    buying?: boolean;
};

const iconFallbackByTipo: Record<string, string> = {
    POTENCIADOR: 'bolt',
    COFRE: 'box-open',
    ROPA: 'tshirt',
};

export default function DetailsStoreItemModal(props: Props) {
    const {
        visible,
        item,
        onClose,
        onBuy,
        accentColor = '#3B5BDB',
        userCoins = 0,
        buying = false,
    } = props;

    const { colors, isDark } = useTheme();

    // 👇 Llama hooks SIEMPRE
    const [qty, setQty] = useState(1);
    const shake = useRef(new Animated.Value(0)).current;

    // Derivados que toleran item undefined
    const meta = (item?.metadataItem ?? {}) as any;
    const imageUrl: string | undefined = meta?.image;
    const iconName =
        meta?.icon ||
        iconFallbackByTipo[String(item?.tipoItem ?? '').toUpperCase()] ||
        'shopping-bag';

    const price = Number(item?.precioItem || 0);
    const total = useMemo(() => Math.max(1, qty) * price, [qty, price]);
    const hasFunds = total <= userCoins;

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

    const translateX = shake.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-6, 0, 6],
    });

    const clamp = (n: number) => Math.min(99, Math.max(1, Math.round(n)));
    const handleBuy = () => {
        if (!item || !onBuy || !hasFunds || buying) return;
        onBuy(item, clamp(qty));
    };

    if (!visible || !item) return null;

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            {/* fondo clickeable */}
            <Pressable style={styles.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint={isDark ? 'dark' : 'light'} style={styles.backdropBlur} />
            </Pressable>

            <View style={styles.centerWrap} pointerEvents="box-none">
                <Pressable style={[styles.card, styles.shadow, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={() => {}}>
                    {/* título */}
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                        {item.nombreItem}
                    </Text>

                    {/* media + descripción */}
                    <View style={styles.mediaRow}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} resizeMode="contain" style={[styles.image, { backgroundColor: colors.cardTint }]} />
                        ) : (
                            <View style={[styles.iconWrap, { backgroundColor: colors.cardTint }]}>
                                <FontAwesome5 name={iconName as any} size={48} color={accentColor} />
                            </View>
                        )}

                        <View style={{ flex: 1 }}>
                            <Text style={[styles.desc, { color: colors.text }]} numberOfLines={5}>
                                {item.descripcionItem || 'Sin descripción.'}
                            </Text>
                            {/* monedas del usuario */}
                            <Text style={{ marginTop: 6, fontWeight: '700', color: colors.sub }}>
                                Tus monedas: {userCoins}
                            </Text>
                        </View>
                    </View>

                    {/* Selector de cantidad */}
                    <View style={styles.qtyRow}>
                        <Pressable
                            onPress={() => setQty((q) => clamp(q - 1))}
                            style={[styles.circleBtn, { borderColor: colors.divider, backgroundColor: colors.card }]}
                        >
                            <Text style={[styles.circleTxt, { color: colors.text }]}>−</Text>
                        </Pressable>

                        <Animated.View style={[styles.sliderWrap, { transform: [{ translateX }] }]}>
                            <Slider
                                value={qty}
                                onValueChange={(v: number) => setQty(Math.min(99, Math.max(1, Math.round(v))))}
                                minimumValue={1}
                                maximumValue={20}
                                step={1}
                                minimumTrackTintColor={hasFunds ? accentColor : '#B91C1C'}
                                maximumTrackTintColor={hasFunds ? colors.divider : '#FCA5A5'}
                                thumbTintColor={hasFunds ? accentColor : '#B91C1C'}
                            />
                            <Text style={[styles.qtyLabel, { color: hasFunds ? colors.sub : '#7d1b1b' }]}>
                                {qty}{!hasFunds ? ' • Monedas insuficientes' : ''}
                            </Text>
                        </Animated.View>

                        <Pressable
                            onPress={() => setQty((q) => clamp(q + 1))}
                            style={[styles.circleBtn, { borderColor: colors.divider, backgroundColor: colors.card }]}
                        >
                            <Text style={[styles.circleTxt, { color: colors.text }]}>+</Text>
                        </Pressable>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.total, { color: hasFunds ? colors.text : '#B91C1C' }]}>
                            {price > 0 ? `$${total}` : 'Gratis'}
                        </Text>

                        <Pressable
                            onPress={handleBuy}
                            disabled={!hasFunds || buying}
                            style={[
                                styles.buyBtn,
                                { backgroundColor: !hasFunds ? '#B91C1C' : accentColor, opacity: buying ? 0.7 : 1 },
                            ]}
                        >
                            <Text style={styles.buyTxt}>
                                {!hasFunds ? 'Monedas insuficientes' : (buying ? 'Comprando…' : 'Comprar')}
                            </Text>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}

/* Estilos base; los colores dinámicos se aplican inline con `colors` */
const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    backdropBlur: { flex: 1 },
    centerWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        width: SCREEN_W * 0.9,
        borderRadius: 16,
        backgroundColor: '#FFFFFF', // ⟵ se sobreescribe inline con colors.card
        padding: 16,
        borderWidth: 1,             // ⟵ borde sutil usando colors.divider
    },
    shadow: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
    },
    title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    image: {
        width: 92,
        height: 92,
        borderRadius: 12,
        backgroundColor: '#F3F4F6', // ⟵ se sobreescribe inline con colors.cardTint
    },
    iconWrap: {
        width: 92,
        height: 92,
        borderRadius: 12,
        backgroundColor: '#F3F4F6', // ⟵ se sobreescribe inline con colors.cardTint
        alignItems: 'center',
        justifyContent: 'center',
    },
    desc: { lineHeight: 18 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    circleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleTxt: { fontSize: 18, fontWeight: '800' },
    sliderWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
    qtyLabel: {
        alignSelf: 'center',
        marginTop: 4,
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    total: { fontSize: 18, fontWeight: '900' },
    buyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
    buyTxt: { color: 'white', fontWeight: '800' },
});
