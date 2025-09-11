// components/FadeWrapper.tsx
import React, { ReactNode, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { wasModalClosedRecently } from '../../navigation/ModalTracker';

interface FadeWrapperProps {
  children: ReactNode;
  duration?: number; // override opcional
  delay?: number;    // override opcional
}

const DEFAULT_DURATION = 400;

export default function FadeWrapper({
                                      children,
                                      duration,
                                      delay,
                                    }: FadeWrapperProps) {
  const { colors } = useTheme();

  const DURATION = duration ?? DEFAULT_DURATION;
  const DELAY = delay ?? 0;

  // Animaciones
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.995)).current;
  const scrimOpacity = useRef(new Animated.Value(1)).current;

  // Refs para controlar ciclos/limpieza
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = () => {
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
  };

  const stopAllAnimations = () => {
    animRef.current?.stop();
    contentOpacity.stopAnimation();
    contentScale.stopAnimation();
    scrimOpacity.stopAnimation();
  };

  const toInitial = () => {
    // Detén cualquier animación en curso y vuelve a estado inicial
    stopAllAnimations();
    clearSafetyTimer();

    contentOpacity.setValue(0);
    contentScale.setValue(0.995);
    scrimOpacity.setValue(1);
  };

  const toFinal = () => {
    stopAllAnimations();
    clearSafetyTimer();

    contentOpacity.setValue(1);
    contentScale.setValue(1);
    scrimOpacity.setValue(0);
  };

  useFocusEffect(
      React.useCallback(() => {
        // Al ganar foco, prepara estado inicial
        toInitial();

        // ✅ Validación: si acabas de cerrar un modal, no animes nada
        if (wasModalClosedRecently()) {
          toFinal();
          // Limpieza al perder foco
          return () => {
            toInitial();
          };
        }

        // Arranca animaciones en paralelo
        const parallel = Animated.parallel([
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
        ]);

        animRef.current = parallel;

        parallel.start(({ finished }) => {
          // Si se interrumpe (navegaste a otro screen), asegura estado final visible
          if (!finished) {
            toFinal();
          }
        });

        // Fail-safe extra por si algo se queda colgado (timers/animaciones)
        safetyTimer.current = setTimeout(() => {
          toFinal();
        }, DURATION + DELAY + 120);

        // Limpieza al perder foco
        return () => {
          toInitial();
        };
      }, [DURATION, DELAY])
  );

  return (
      <View style={styles.container}>
        {/* Scrim del color de fondo del tema */}
        <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: colors.bg}, // , opacity: scrimOpacity
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
