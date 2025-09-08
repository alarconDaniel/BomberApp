// components/operario/DetailsTrophyModal.tsx
import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveTrofeoIconFromBd } from '../../config/icons/trofeoIcon';

const { width: SCREEN_W } = Dimensions.get('window');

type Holder = { codUsuario: number; nombre: string; nickname: string | null };

export type Trophy = {
    codTrofeo: number;
    nombre: string;
    icono: string;      // slug o ruta relativa (se resuelve a asset local)
    descripcion: string;
    holder: Holder | null;
};

type Props = {
    visible: boolean;
    trophy?: Trophy | null;
    onClose: () => void;
    baseUrl?: string; // <- ya no se usa (quedó por compatibilidad si tu tipo lo trae)
};

export default function DetailsTrophyModal({ visible, trophy, onClose }: Props) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    if (!visible || !trophy) return null;

    const holderName = trophy.holder
        ? (trophy.holder.nickname?.trim() || trophy.holder.nombre)
        : null;

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
        iconBox: {
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: colors.imageBg,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        iconImg: { width: '100%', height: '100%' },
        footer: {
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        closeBtn: {
            marginTop: 18,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: colors.primary,
            alignSelf: 'center',
        },
    });

    const localImg = resolveTrofeoIconFromBd(trophy.icono, isDark);

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
            {/* Backdrop + blur */}
            <Pressable style={s.backdrop} onPress={onClose}>
                <BlurView intensity={40} tint="dark" style={s.backdropBlur} />
            </Pressable>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Pressable style={[s.card, s.shadow]} onPress={() => {}}>
                    {/* Header: icono + título */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={s.iconBox}>
                            <Image
                                source={localImg}
                                style={s.iconImg}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={120}
                            />
                        </View>
                        <Text style={[g.text.h3]} numberOfLines={2} ellipsizeMode="tail">
                            {trophy.nombre}
                        </Text>
                    </View>

                    {/* Descripción */}
                    <Text style={[g.text.body, g.text.secondary, { marginTop: 12, lineHeight: 20 }]} numberOfLines={6}>
                        {trophy.descripcion || 'Sin descripción.'}
                    </Text>

                    {/* Holder (si aplica) */}
                    <View style={s.footer}>
                        {holderName ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome5 name="user-astronaut" size={16} color={colors.secondaryText} />
                                <Text style={[g.text.body, g.text.secondary, { flexShrink: 1 }]}>
                                    Lo tiene: <Text style={g.text.bodyStrong}>{holderName}</Text>
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome5 name="bolt" size={16} color={colors.success} />
                                <Text style={[g.text.body, g.text.secondary]}>Sin dueño — ¿te lo ganas?</Text>
                            </View>
                        )}
                    </View>

                    {/* Botón cerrar */}
                    <Pressable onPress={onClose} style={s.closeBtn}>
                        <Text style={[g.text.smallStrong, g.text.onPrimary]}>Cerrar</Text>
                    </Pressable>
                </Pressable>
            </View>
        </Modal>
    );
}
