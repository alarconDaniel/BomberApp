// components/LevelUpOverlay.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

type Props = {
    visible: boolean;
    level: number;
    onClose: () => void;
};

const { width: W, height: H } = Dimensions.get('window');
const EMOJIS = ['🎉', '✨', '🎊', '⭐️', '🪄', '💥', '🔥', '🧨'];

export default function LevelUpOverlay({ visible, level, onClose }: Props) {
    const backdrop = useRef(new Animated.Value(0)).current;
    const pop = useRef(new Animated.Value(0)).current;

    // Confetis "virtuales": definimos N piezas con valores animados independientes
    const pieces = useMemo(() => {
        const N = 22;
        return Array.from({ length: N }).map((_, i) => {
            const progress = new Animated.Value(0);
            const x = Math.random() * W;
            const drift = (Math.random() * 80 + 40) * (Math.random() > 0.5 ? 1 : -1);
            const rotateDeg = (Math.random() * 180 + 90) * (Math.random() > 0.5 ? 1 : -1);
            const size = Math.random() * 14 + 16;
            const emoji = EMOJIS[i % EMOJIS.length];
            const delay = Math.floor(Math.random() * 300);
            return { progress, x, drift, rotateDeg, size, emoji, delay };
        });
    }, []);

    useEffect(() => {
        if (!visible) return;

        // Backdrop + pop del badge
        backdrop.setValue(0);
        pop.setValue(0);
        Animated.parallel([
            Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.sequence([
                Animated.timing(pop, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.8)), useNativeDriver: true }),
                Animated.timing(pop, { toValue: 0.94, duration: 120, useNativeDriver: true }),
                Animated.timing(pop, { toValue: 1, duration: 120, useNativeDriver: true }),
            ]),
        ]).start();

        // Confeti cayendo
        pieces.forEach((p) => {
            p.progress.setValue(0);
            Animated.timing(p.progress, {
                toValue: 1,
                duration: 1300 + Math.random() * 600,
                delay: p.delay,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();
        });
    }, [visible]);

    if (!visible) return null;

    return (
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            {/* Backdrop */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdrop },
                ]}
            />

            {/* Badge central */}
            <View style={styles.centerWrap} pointerEvents="none">
                <Animated.View
                    style={[
                        styles.badge,
                        {
                            transform: [
                                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                            ],
                        },
                    ]}
                >
                    <FontAwesome5 name="trophy" size={28} color="#F59E0B" />
                    <Text style={styles.badgeTxtTop}>¡SUBISTE A</Text>
                    <Text style={styles.levelNumber}>{level}</Text>
                    <Text style={styles.badgeTxtBottom}>NIVEL!</Text>
                </Animated.View>
            </View>

            {/* Confetis */}
            {pieces.map((p, idx) => {
                const translateY = p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-60, H + 80],
                });
                const translateX = p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [p.x, p.x + p.drift],
                });
                const rotate = p.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.rotateDeg}deg`],
                });
                const opacity = p.progress.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [0, 1, 0],
                });

                return (
                    <Animated.Text
                        key={idx}
                        style={{
                            position: 'absolute',
                            fontSize: p.size,
                            transform: [{ translateX }, { translateY }, { rotate }],
                            opacity,
                        }}
                    >
                        {p.emoji}
                    </Animated.Text>
                );
            })}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    centerWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: '#111827',
        borderWidth: 4,
        borderColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
        paddingTop: 14,
    },
    badgeTxtTop: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginTop: 6 },
    levelNumber: { color: '#FCD34D', fontSize: 84, fontWeight: '900', lineHeight: 86 },
    badgeTxtBottom: { color: '#E5E7EB', fontSize: 18, fontWeight: '800' },
});
