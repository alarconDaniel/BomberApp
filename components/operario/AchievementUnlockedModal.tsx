// components/operario/AchievementUnlockedModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions, FlatList, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export type AchievementItem = { nombre: string; icono?: string; recompensa?: string };

export default function AchievementUnlockedModal({
                                                     visible,
                                                     onClose,
                                                     baseUrl,
                                                     items,
                                                 }: {
    visible: boolean;
    onClose: () => void;
    baseUrl?: string;
    items: AchievementItem[];
}) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const scale = useRef(new Animated.Value(0.7)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const [showList, setShowList] = useState(false);

    useEffect(() => {
        if (!visible) return;
        scale.setValue(0.7);
        glow.setValue(0);
        setShowList(false);

        Animated.sequence([
            Animated.timing(scale, { toValue: 1, duration: 480, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
            Animated.timing(glow, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        ]).start(() => setShowList(true));
    }, [visible]);

    const glowBg = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.card, (colors as any).primarySoft || '#dfe7ff'],
    });

    const s = StyleSheet.create({
        backdrop: { ...StyleSheet.absoluteFillObject },
        centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        card: { width: SCREEN_W * 0.9, borderRadius: 16, backgroundColor: colors.card, padding: 16, borderWidth: 1, borderColor: colors.divider },
        headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
        achItem: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, marginVertical: 6, backgroundColor: colors.bg, flexDirection: 'row', alignItems: 'center', gap: 12 },
        iconWrap: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.imageBg, alignItems: 'center', justifyContent: 'center' },
        footer: { marginTop: 12, alignItems: 'flex-end' },
        btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
    });

    const resolveIcon = (raw?: string) => {
        if (!raw) return null;
        const uri = raw.startsWith('http') ? raw : ((baseUrl || '') + raw);
        return { uri };
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <BlurView intensity={35} tint="dark" style={{ flex: 1 }} />
            </View>

            <View style={s.centerWrap} pointerEvents="box-none">
                <Animated.View style={[s.card, { backgroundColor: glowBg }]}>
                    <View style={s.headerRow}>
                        <FontAwesome5 name="award" size={22} color={colors.primary} />
                        <Text style={g.text.title}>¡Logro conseguido!</Text>
                    </View>

                    {showList && (
                        <FlatList
                            data={items}
                            keyExtractor={(it, i) => it.nombre + '-' + i}
                            renderItem={({ item }) => (
                                <View style={s.achItem}>
                                    <View style={s.iconWrap}>
                                        {item.icono ? (
                                            <Image source={resolveIcon(item.icono) as any} style={{ width: 44, height: 44 }} resizeMode="contain" />
                                        ) : (
                                            <FontAwesome5 name="medal" size={20} color={colors.primary} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={g.text.bodyStrong}>{item.nombre}</Text>
                                        {!!item.recompensa && <Text style={[g.text.caption, g.text.muted]}>{item.recompensa}</Text>}
                                    </View>
                                </View>
                            )}
                            style={{ maxHeight: SCREEN_H * 0.35 }}
                            showsVerticalScrollIndicator={false}
                        />
                    )}

                    <View style={s.footer}>
                        <Pressable onPress={onClose} style={s.btn}>
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Continuar</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}