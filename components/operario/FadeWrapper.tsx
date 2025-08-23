// components/FadeWrapper.tsx
import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { wasModalClosedRecently } from '../../navigation/ModalTracker';

interface FadeWrapperProps {
    children: ReactNode;
    duration?: number; // override opcional
    delay?: number;    // override opcional
}

const DEFAULT_DURATION = 500;

export default function FadeWrapper({
                                        children,
                                        duration,
                                        delay,
                                    }: FadeWrapperProps) {
    const { colors } = useTheme();
    const isFocused = useIsFocused();

    const DURATION = duration ?? DEFAULT_DURATION;
    const DELAY = delay ?? 0;

    // Animaciones
    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentScale = useRef(new Animated.Value(0.995)).current;
    const scrimOpacity = useRef(new Animated.Value(1)).current;

    const hasRun = useRef(false);

    useEffect(() => {
        if (isFocused) {
            if (wasModalClosedRecently()) {
                // Sin animar si vienes de cerrar un modal
                contentOpacity.setValue(1);
                contentScale.setValue(1);
                scrimOpacity.setValue(0);
                hasRun.current = true;
                return;
            }
            if (!hasRun.current) {
                // Estado inicial
                contentOpacity.setValue(0);
                contentScale.setValue(0.995);
                scrimOpacity.setValue(1);

                Animated.parallel([
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: DURATION,
                        delay:   DELAY,
                        useNativeDriver: true,
                    }),
                    Animated.timing(contentScale, {
                        toValue: 1,
                        duration: Math.max(220, DURATION - 180),
                        delay:   DELAY,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scrimOpacity, {
                        toValue: 0,
                        duration: DURATION,
                        delay:   DELAY,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    hasRun.current = true;
                });
            }
        } else {
            // Prepárate para la próxima entrada
            hasRun.current = false;
            contentOpacity.setValue(0);
            contentScale.setValue(0.995);
            scrimOpacity.setValue(1);
        }
    }, [isFocused, DURATION, DELAY, contentOpacity, contentScale, scrimOpacity]);

    return (
        <View style={styles.container}>
            {/* Scrim del color de fondo del tema */}
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: colors.bg },
                ]}
            />
            {/* Contenido */}
            <Animated.View
                style={{
                    flex: 1,
                    opacity: contentOpacity,
                    transform: [{ scale: contentScale }],
                }}
            >
                {children}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
