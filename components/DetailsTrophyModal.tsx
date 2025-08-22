// src/components/DetailsTrophyModal.tsx
import React, { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

type Holder = { codUsuario: number; nombre: string; nickname: string | null };

export type Trophy = {
    codTrofeo: number;
    nombre: string;
    icono: string;
    descripcion: string;
    holder: Holder | null;
};

type Props = {
    visible: boolean;
    trophy?: Trophy | null;
    onClose: () => void;
    baseUrl?: string;
};

export default function DetailsTrophyModal({ visible, trophy, onClose, baseUrl = '' }: Props) {
    const uri = useMemo(() => {
        if (!trophy?.icono) return null;
        return trophy.icono.startsWith('http') ? trophy.icono : `${baseUrl}${trophy.icono}`;
    }, [trophy?.icono, baseUrl]);

    if (!visible || !trophy) return null;

    const holderName = trophy.holder
        ? (trophy.holder.nickname?.trim() || trophy.holder.nombre)
        : null;

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
                            {uri ? (
                                <Image source={{ uri }} style={s.iconImg} resizeMode="cover" />
                            ) : (
                                <FontAwesome5 name="trophy" size={28} color="#F59E0B" />
                            )}
                        </View>
                        <Text
                            style={s.title}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {trophy.nombre}
                        </Text>
                    </View>

                    {/* Descripción */}
                    <Text style={s.desc} numberOfLines={6}>
                        {trophy.descripcion || 'Sin descripción.'}
                    </Text>

                    {/* Holder (si aplica) */}
                    <View style={s.footer}>
                        {holderName ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome5 name="user-astronaut" size={16} color="#374151" />
                                <Text style={s.holderTxt}>
                                    Lo tiene: <Text style={{ fontWeight: '800' }}>{holderName}</Text>
                                </Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome5 name="bolt" size={16} color="#16A34A" />
                                <Text style={s.holderTxt}>Sin dueño — ¿te lo ganas?</Text>
                            </View>
                        )}
                    </View>

                    {/* 👇 Botón cerrar abajo */}
                    <Pressable onPress={onClose} style={s.closeBtn}>
                        <Text style={s.closeTxt}>Cerrar</Text>
                    </Pressable>
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
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    iconImg: { width: '100%', height: '100%' },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#111827',
        flex: 1,
    },
    desc: { color: '#374151', marginTop: 12, lineHeight: 20 },
    footer: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    holderTxt: { color: '#374151', flexShrink: 1 },
    closeBtn: {
        marginTop: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#111827',
        alignSelf: 'center',
    },
    closeTxt: { color: 'white', fontWeight: '800' },
});
