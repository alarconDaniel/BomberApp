// components/FadeWrapper.tsx
import { ReactNode, useRef } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

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

    useFocusEffect(() => {
        fadeAnim.setValue(0); // Reinicia animación
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration,
            delay,
            useNativeDriver: true,
        }).start();
    });

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {children}
        </Animated.View>
    );
}
