// components/FadeWrapper.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
  backgroundColor?: string;
};

export default function FadeWrapper({
  children,
  duration = 200,
  delay = 0,
  style,
  backgroundColor = '#FFFFFF',
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const didAnimate = useRef(false);

  const animateIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  useEffect(() => {
    if (didAnimate.current) return;      // evita re-animar en re-render/foco
    didAnimate.current = true;
    animateIn();
  }, [animateIn]);

  return (
    <Animated.View style={[{ flex: 1, backgroundColor, opacity }, style]}>
      {children}
    </Animated.View>
  );
}
