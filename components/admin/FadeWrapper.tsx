import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';

type Props = ViewProps & { children: React.ReactNode };

export default function FadeWrapper({ children, style, ...rest }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View {...rest} style={[{ flex: 1, opacity }, style]}>
      {children}
    </Animated.View>
  );
}
