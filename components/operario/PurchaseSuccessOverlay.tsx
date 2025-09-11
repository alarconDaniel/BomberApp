import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable, Modal, StyleSheet as RNStyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

type Props = {
    visible: boolean;         // controlado por el padre
    itemName: string;
    qty: number;
    onClose: () => void;      // el padre pondrá visible=false
    onClosed?: () => void;    // callback cuando terminamos la salida
    autoCloseMs?: number;
};

export default function PurchaseSuccessOverlay({
                                                   visible,
                                                   itemName,
                                                   qty,
                                                   onClose,
                                                   onClosed,
                                                   autoCloseMs = 1800,
                                               }: Props) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    // Animaciones
    const back  = useRef(new Animated.Value(0)).current;  // 0..1
    const card  = useRef(new Animated.Value(0)).current;  // 0..1
    const pulse = useRef(new Animated.Value(0)).current;  // 0..1

    const loopRef  = useRef<Animated.CompositeAnimation | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Estado interno para controlar el <Modal> sin depender del parpadeo del padre
    const [rendered, setRendered] = useState(false);      // si renderizamos contenido
    const [modalVisible, setModalVisible] = useState(false); // se pasa al <Modal visible={...}>

    const cleanup = () => {
        loopRef.current?.stop();
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    // Efecto principal: reacciona a props.visible
    useEffect(() => {
        if (visible) {
            // ENTRADA
            setRendered(true);
            setModalVisible(true);
            cleanup();
            back.setValue(0);
            card.setValue(0);
            pulse.setValue(0);

            Animated.parallel([
                Animated.timing(back, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(card, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start(() => {
                const loop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                    ])
                );
                loopRef.current = loop;
                loop.start();

                if (autoCloseMs && autoCloseMs > 0) {
                    // No cerramos el Modal aquí; pedimos al padre que ponga visible=false
                    timerRef.current = setTimeout(() => { onClose(); }, autoCloseMs);
                }
            });
        } else {
            // SALIDA (solo si estaba renderizado)
            if (!rendered) return;

            cleanup();
            // Card-first exit (no toques 'back', mantenlo opaco hasta ocultar el Modal)
            Animated.timing(card, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true })
                .start(() => {
                    // Ocultamos el Modal de golpe y reseteamos
                    setModalVisible(false);
                    setRendered(false);
                    back.setValue(0);
                    onClosed?.();
                });
        }

        // Limpieza al desmontar este componente (cambio de pantalla, etc.)
        return () => { cleanup(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]); // 👈 clave: solo reacciona a cambios de props.visible

    if (!rendered) return null;

    // Interpolaciones
    const cardOpacity   = card;
    const cardScale     = card.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });
    const cardTranslate = card.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
    const ringScale     = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
    const ringOpacity   = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    const s = StyleSheet.create({
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
        card: {
            width: '86%',
            borderRadius: 16,
            backgroundColor: colors.card,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            elevation: 8,
        },
        badge: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
        ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: colors.success },
        btn: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.success },
    });

    const requestClose = () => { onClose(); }; // dispara salida controlada vía props.visible=false

    return (
        <Modal
            visible={modalVisible}           // 👈 AHORA sí, controlado
            transparent
            animationType="none"             // animamos manualmente
            presentationStyle="overFullScreen"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={requestClose}    // Android back
        >
            {/* Backdrop con blur: solo animamos de ENTRADA; en salida permanece opaco hasta ocultar el Modal */}
            <Animated.View style={[RNStyleSheet.absoluteFillObject, { opacity: back }]}>
                <BlurView intensity={30} tint="dark" style={RNStyleSheet.absoluteFill} />
                <Pressable style={RNStyleSheet.absoluteFillObject} onPress={requestClose} />
            </Animated.View>

            {/* Card */}
            <View style={s.center} pointerEvents="box-none">
                <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ scale: cardScale }, { translateY: cardTranslate }] }]}>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                        <View style={s.badge}>
                            <FontAwesome5 name="check" size={28} color="white" />
                        </View>
                    </View>
                    <Text style={g.text.title}>¡Compra confirmada!</Text>
                    <Text style={[g.text.body, g.text.secondary, { textAlign: 'center', marginBottom: 12 }]}>
                        Se ha comprado {qty} × <Text style={g.text.bodyStrong}>{itemName}</Text>
                    </Text>
                    <Pressable onPress={requestClose} style={s.btn}>
                        <Text style={[g.text.smallStrong, g.text.onPrimary]}>Listo</Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
    );
}
