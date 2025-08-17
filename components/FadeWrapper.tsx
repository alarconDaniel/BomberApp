// components/FadeWrapper.tsx
import { ReactNode, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

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
            // Evita relanzar mientras la pantalla ya está enfocada
            if (!hasRun.current) {
                fadeAnim.setValue(0);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration,
                    delay,
                    useNativeDriver: true,
                }).start(() => { hasRun.current = true; });
            }
        } else {
            hasRun.current = false; // se permite animar de nuevo la próxima vez que entre
        }
    }, [isFocused, duration, delay, fadeAnim]);

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {children}
        </Animated.View>
    );
}
