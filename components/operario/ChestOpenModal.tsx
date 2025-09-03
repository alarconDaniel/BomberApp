// components/operario/ChestOpenModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Easing, Dimensions, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Reward = { codItem: number; nombre: string; tipo: string; cantidad: number };
type Props = {
    visible: boolean;
    onClose: () => void;
    size: 'pequeno' | 'medio' | 'grande';
    rewards: Reward[];
};

export default function ChestOpenModal({ visible, onClose, size, rewards }: Props) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    // Valores animados separados por “dominio”
    const scale = useRef(new Animated.Value(0.6)).current;   // nativo
    const rotate = useRef(new Animated.Value(0)).current;     // nativo
    const glow = useRef(new Animated.Value(0)).current;       // JS

    const [showList, setShowList] = useState(false);
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!visible) return;

        // Reset antes de arrancar
        scale.setValue(0.6);
        rotate.setValue(0);
        glow.setValue(0);
        setShowList(false);

        // Entrada con driver NATIVE (solo transform)
        const entry = Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]);

        entry.start(() => {
            // Loop del glow (JS-driven por color)
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(glow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
                    Animated.timing(glow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
                ])
            );
            loopRef.current = loop;
            loop.start();

            // Demorita para revelar lista
            timeoutRef.current = setTimeout(() => setShowList(true), 560);
        });

        return () => {
            // Limpieza: parar loop y timeouts
            loopRef.current?.stop();
            loopRef.current = null;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        };
    }, [visible, scale, rotate, glow]);

    const rotZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '0deg'] });
    const glowBg = glow.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.card, (colors as any).primarySoft || '#dfe7ff'],
    });

    const chestIconSize = size === 'grande' ? 88 : size === 'medio' ? 76 : 64;

    const s = StyleSheet.create({
        backdrop: { ...StyleSheet.absoluteFillObject },
        centerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        card: { width: SCREEN_W * 0.9, borderRadius: 16, backgroundColor: colors.card, padding: 16, borderWidth: 1, borderColor: colors.divider },
        chestWrapGlow: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16 },
        chestInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 8 },
        rewardItem: { paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, marginVertical: 6, backgroundColor: colors.bg },
        footer: { marginTop: 12, alignItems: 'flex-end' },
        btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primary },
    });

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.backdrop}>
                <BlurView intensity={35} tint="dark" style={{ flex: 1 }} />
            </View>

            <View style={s.centerWrap} pointerEvents="box-none">
                <View style={s.card}>
                    <Text style={[g.text.title, { marginBottom: 10 }]}>{size === 'grande' ? '¡Cofre Grande!' : size === 'medio' ? 'Cofre Medio' : 'Cofre Pequeño'}</Text>

                    {/* EXTERNO: backgroundColor (JS-driven) */}
                    <Animated.View style={[s.chestWrapGlow, { backgroundColor: glowBg }]}>
                        {/* INTERNO: transforms (Native driver) */}
                        <Animated.View style={[s.chestInner, { transform: [{ scale }, { rotateZ: rotZ }] }]}>
                            <FontAwesome5 name="box-open" size={chestIconSize} color={colors.primary} />
                            <Text style={[g.text.caption, g.text.muted, { marginTop: 6 }]}>Abriendo...</Text>
                        </Animated.View>
                    </Animated.View>

                    {showList && (
                        <>
                            <Text style={[g.text.bodyStrong, { marginTop: 6, marginBottom: 6 }]}>Recompensas</Text>
                            <FlatList
                                data={rewards}
                                keyExtractor={(r, i) => `${r.codItem}-${i}`}
                                renderItem={({ item }) => (
                                    <View style={s.rewardItem}>
                                        <Text style={g.text.bodyStrong}>
                                            x{item.cantidad} • {item.nombre}
                                        </Text>
                                        <Text style={[g.text.caption, g.text.muted]}>{item.tipo === 'ROPA' ? 'Ropa' : 'Potenciador'}</Text>
                                    </View>
                                )}
                                style={{ maxHeight: SCREEN_H * 0.35 }}
                                showsVerticalScrollIndicator={false}
                            />
                        </>
                    )}

                    <View style={s.footer}>
                        <Pressable onPress={onClose} style={s.btn}>
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Listo</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
