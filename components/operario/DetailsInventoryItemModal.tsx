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
import { ItemInventario } from '../../models/ItemInventario';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemInventario | null;
    onClose: () => void;
    accentColor?: string;
    showDate?: boolean;
};

const iconFallbackByNombre: Record<string, string> = {
    'Cofre': 'box-open',
    'Camiseta': 'tshirt',
    'Pocion': 'flask',
    'Boost': 'bolt',
};

export default function DetailsInventoryItemModal({
                                                      visible,
                                                      item,
                                                      onClose,
                                                      accentColor,
                                                      showDate = true,
                                                  }: Props) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);
    if (!visible || !item) return null;

    const nombre = item.item?.nombre ?? 'Item';
    const descripcion = item.item?.descripcion || 'Sin descripción.';
    const cantidad = Number(item.cantidad ?? 0);
    const fecha = item.fecha ? new Date(item.fecha) : null;

    const iconName =
        iconFallbackByNombre[nombre] || 'box';

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
            backgroundColor: colors.card,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.divider,
        },
        shadow: {
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            elevation: 8,
        },
        mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        iconWrap: {
            width: 92,
            height: 92,
            borderRadius: 12,
            backgroundColor: colors.imageBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
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
            borderColor: colors.inputBorder,
            backgroundColor: colors.primary,
        },
    });

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint="dark" style={s.backdropBlur} />
            </Pressable>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Pressable style={[s.card, s.shadow]} onPress={() => {}}>
                    {/* Título */}
                    <Text style={[g.text.title, {marginBottom: 24}]} numberOfLines={2}>
                        {nombre}
                    </Text>

                    {/* Media + descripción */}
                    <View style={s.mediaRow}>
                        <View style={s.iconWrap}>
                            <FontAwesome5 name={iconName as any} size={48} color={accentColor || colors.primary} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={[g.text.body, g.text.secondary]} numberOfLines={6}>
                                {descripcion}
                            </Text>

                            <View style={{ marginTop: 8 }}>
                                <Text style={g.text.bodyStrong}>
                                    Cantidad en tu inventario: <Text style={{ fontWeight: '900' }}>x{cantidad}</Text>
                                </Text>
                                {showDate && fecha && (
                                    <Text style={[g.text.caption]}>
                                        Desde: {fecha.toLocaleDateString()} {fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Footer simple */}
                    <View style={s.footer}>
                        <Pressable onPress={onClose} style={s.closeBtn}>
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Cerrar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}
