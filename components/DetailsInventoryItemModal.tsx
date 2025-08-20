// components/DetailsInventoryItemModal.tsx
import React from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemInventario } from '../models/ItemInventario';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemInventario | null;
    onClose: () => void;
    accentColor?: string;
    showDate?: boolean; // por si quieres mostrar la fecha de compra
};

const iconFallbackByNombre: Record<string, string> = {
    // Puedes ampliar este diccionario con tus nombres reales
    'Cofre': 'box-open',
    'Camiseta': 'tshirt',
    'Pocion': 'flask',
    'Boost': 'bolt',
};

export default function DetailsInventoryItemModal({
                                                      visible,
                                                      item,
                                                      onClose,
                                                      accentColor = '#3B82F6',
                                                      showDate = true,
                                                  }: Props) {
    if (!visible || !item) return null;

    // Sin metadata en inventario: usamos un fallback por nombre o tipo imaginado
    const nombre = item.item?.nombre ?? 'Item';
    const descripcion = item.item?.descripcion || 'Sin descripción.';
    const cantidad = Number(item.cantidad ?? 0);
    const fecha = item.fecha ? new Date(item.fecha) : null;

    const iconName =
        iconFallbackByNombre[nombre] || 'box'; // un fallback generoso

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint="dark" style={s.backdropBlur} />
            </Pressable>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Pressable style={[s.card, s.shadow]} onPress={() => {}}>
                    {/* Título */}
                    <Text style={[s.title, { color: '#111827' }]} numberOfLines={2}>
                        {nombre}
                    </Text>

                    {/* Media + descripción */}
                    <View style={s.mediaRow}>
                        <View style={s.iconWrap}>
                            <FontAwesome5 name={iconName as any} size={48} color={accentColor} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={s.desc} numberOfLines={6}>
                                {descripcion}
                            </Text>

                            <View style={{ marginTop: 8 }}>
                                <Text style={s.metaStrong}>Cantidad en tu inventario: <Text style={s.metaValue}>x{cantidad}</Text></Text>
                                {showDate && fecha && (
                                    <Text style={s.metaSoft}>
                                        Desde: {fecha.toLocaleDateString()} {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Footer simple */}
                    <View style={s.footer}>
                        <Pressable onPress={onClose} style={[s.closeBtn, { borderColor: '#D1D5DB' }]}>
                            <Text style={s.closeTxt}>Cerrar</Text>
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
    iconWrap: {
        width: 92,
        height: 92,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    desc: { color: '#374151', lineHeight: 18 },
    metaStrong: { color: '#111827', fontWeight: '800' },
    metaValue: { color: '#111827', fontWeight: '900' },
    metaSoft: { color: '#6B7280', fontWeight: '600', marginTop: 2 },
    footer: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    closeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    closeTxt: { color: '#111827', fontWeight: '800' },
});
