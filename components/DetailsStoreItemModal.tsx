import React, { useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemTienda } from '../models/ItemTienda';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemTienda | null;
    onClose: () => void;
    onBuy?: (item: ItemTienda, qty: number) => void;
    accentColor?: string;
};

const iconFallbackByTipo: Record<string, string> = {
    POTENCIADOR: 'bolt',
    COFRE: 'box-open',
    ROPA: 'tshirt',
};

export default function DetailsStoreItemModal({
                                                  visible,
                                                  item,
                                                  onClose,
                                                  onBuy,
                                                  accentColor = '#3B5BDB',
                                              }: Props) {
    if (!item) return null;

    const [qty, setQty] = useState(1);
    const meta = (item.metadataItem ?? {}) as any;
    const imageUrl: string | undefined = meta?.image;
    const iconName =
        meta?.icon ||
        iconFallbackByTipo[String(item.tipoItem).toUpperCase()] ||
        'shopping-bag';

    const price = Number(item.precioItem || 0);
    const total = useMemo(() => Math.max(1, qty) * price, [qty, price]);

    const clamp = (n: number) => Math.min(99, Math.max(1, Math.round(n)));

    const handleBuy = () => {
        if (onBuy) onBuy(item, clamp(qty));
    };

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            {/* Backdrop con blur: se cierra al tocar fuera */}
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint="dark" style={s.backdropBlur} />
            </Pressable>

            {/* Contenedor centrado */}
            <View style={s.centerWrap} pointerEvents="box-none">
                {/* Bloque modal */}
                <Pressable style={[s.card, s.shadow]} onPress={() => {}}>
                    {/* Título */}
                    <Text style={[s.title, { color: '#111827' }]} numberOfLines={2}>
                        {item.nombreItem}
                    </Text>

                    {/* Imagen o Ícono */}
                    <View style={s.mediaRow}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} resizeMode="contain" style={s.image} />
                        ) : (
                            <View style={s.iconWrap}>
                                <FontAwesome5 name={iconName as any} size={48} color={accentColor} />
                            </View>
                        )}

                        {/* Descripción */}
                        <View style={{ flex: 1 }}>
                            <Text style={s.desc} numberOfLines={5}>
                                {item.descripcionItem || item.descripcionItem || 'Sin descripción.'}
                            </Text>
                        </View>
                    </View>

                    {/* Selector de cantidad */}
                    <View style={s.qtyRow}>
                        <Pressable
                            onPress={() => setQty((q) => clamp(q - 1))}
                            style={[s.circleBtn, { borderColor: '#D1D5DB' }]}
                        >
                            <Text style={s.circleTxt}>−</Text>
                        </Pressable>

                        <View style={s.sliderWrap}>
                            <Slider
                                value={qty}
                                onValueChange={(v: number) => setQty(clamp(v))}
                                minimumValue={1}
                                maximumValue={20}
                                step={1}
                                minimumTrackTintColor={accentColor}
                                maximumTrackTintColor="#E5E7EB"
                            />
                            <Text style={s.qtyLabel}>{qty}</Text>
                        </View>

                        <Pressable
                            onPress={() => setQty((q) => clamp(q + 1))}
                            style={[s.circleBtn, { borderColor: '#D1D5DB' }]}
                        >
                            <Text style={s.circleTxt}>+</Text>
                        </Pressable>
                    </View>

                    {/* Footer: precio total + CTA */}
                    <View style={s.footer}>
                        <Text style={s.total}>
                            {price > 0 ? `$${total}` : 'Gratis'}
                        </Text>

                        <Pressable
                            onPress={handleBuy}
                            style={[s.buyBtn, { backgroundColor: accentColor }]}
                        >
                            <Text style={s.buyTxt}>Comprar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
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
        backgroundColor: '#FFFFFF',
        padding: 16,
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
        backgroundColor: '#F3F4F6',
    },
    iconWrap: {
        width: 92,
        height: 92,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    desc: { color: '#374151', lineHeight: 18 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
    circleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleTxt: { fontSize: 18, fontWeight: '800', color: '#111827' },
    sliderWrap: { flex: 1, alignItems: 'stretch', justifyContent: 'center' },
    qtyLabel: {
        alignSelf: 'center',
        marginTop: 4,
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    total: { fontSize: 18, fontWeight: '900', color: '#111827' },
    buyBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
    buyTxt: { color: 'white', fontWeight: '800' },
});
