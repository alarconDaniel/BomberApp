// components/FadeWrapper.tsx
import { ReactNode, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { wasModalClosedRecently } from '../navigation/ModalTracker';

interface FadeWrapperProps {
    children: ReactNode;
    duration?: number;
    delay?: number;
}

export default function FadeWrapper({
                                        children,
                                        duration = 500,
                                        delay = 0,
                                    }: FadeWrapperProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isFocused = useIsFocused();
    const hasRun = useRef(false);

    useEffect(() => {
        if (isFocused) {
            // Si acabamos de cerrar un modal, no animes: deja visible al tiro.
            if (wasModalClosedRecently()) {
                fadeAnim.setValue(1);
                hasRun.current = true;
                return;
            }
            // Evita relanzar mientras la pantalla ya está enfocada
            if (!hasRun.current) {
                fadeAnim.setValue(0);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration,
                    delay,
                    useNativeDriver: true,
                }).start(() => {
                    hasRun.current = true;
                });
            }
        } else {
            // La próxima vez que entre (salvo regreso de modal), sí animará
            hasRun.current = false;
        }
    }, [isFocused, duration, delay, fadeAnim]);

    return <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{children}</Animated.View>;
}
