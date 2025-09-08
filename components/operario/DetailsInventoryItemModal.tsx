// components/operario/DetailsInventoryItemModal.tsx
import React from 'react';
import {Modal, View, Text, Pressable, StyleSheet, Dimensions} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemInventario } from '../../models/ItemInventario';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';
import { Image } from 'expo-image';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    visible: boolean;
    item?: ItemInventario | null;
    onClose: () => void;
    accentColor?: string;
    showDate?: boolean;
    // 🧩 COFRES
    onOpenChest?: (() => void) | undefined;
    opening?: boolean;
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
                                                      onOpenChest,
                                                      opening = false,
                                                  }: Props) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);
    if (!visible || !item) return null;

    const nombre = item.item?.nombre ?? 'Item';
    const descripcion = item.item?.descripcion || 'Sin descripción.';
    const cantidad = Number(item.cantidad ?? 0);
    const fecha = item.fecha ? new Date(item.fecha) : null;
    const tipo = String(item.item?.tipo ?? '').toUpperCase();

    const bdIcon = item.item.icon;
    const localImg = resolveItemIconFromBd(bdIcon, isDark);


    const iconName = tipo === 'COFRE'
        ? 'box-open'
        : iconFallbackByNombre[nombre] || 'box';

    const s = StyleSheet.create({
        backdrop: { ...StyleSheet.absoluteFillObject },
        backdropBlur: { flex: 1 },
        centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
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
        footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        closeBtn: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.inputBorder,
            backgroundColor: colors.card,
            alignItems: 'center',
        },
        actionBtn: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            opacity: opening ? 0.6 : 1,
        },
        pill: {
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            alignSelf: 'flex-start',
            borderWidth: 1.5,
            borderColor: accentColor || colors.primary,
        },
    });

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={35} tint="dark" style={s.backdropBlur} />
            </Pressable>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Pressable style={[s.card, s.shadow]} onPress={() => {}}>
                    <Text style={[g.text.title, {marginBottom: 24}]} numberOfLines={2}>
                        {nombre}
                    </Text>

                    <View style={s.mediaRow}>
                        <View style={s.iconWrap}>
                            {/* reemplaza el FontAwesome por el PNG local */}
                            <Image
                               source={localImg}
                               style={{ width: 92, height: 92, borderRadius: 12 }}
                               contentFit="contain"
                               cachePolicy="memory-disk"
                               transition={120}
                             />
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
                        <Pressable onPress={onClose} style={s.closeBtn}>
                            <Text style={g.text.smallStrong}>Cerrar</Text>
                        </Pressable>

                        {/* Mostrar acción de apertura solo si es cofre */}
                        {tipo === 'COFRE' && (
                            <Pressable
                                onPress={onOpenChest}
                                disabled={!onOpenChest || opening || cantidad <= 0}
                                style={s.actionBtn}
                            >
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {opening ? 'Abriendo…' : cantidad > 0 ? 'Abrir cofre' : 'Sin cofres'}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}
