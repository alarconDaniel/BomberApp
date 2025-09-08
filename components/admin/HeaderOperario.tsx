// components/HeaderOperario.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider'; // ajusta la ruta si tu ThemeProvider está en otro lado

export default function HeaderOperario() {
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={s.containerHeader}>
      <View style={s.button}>
        <Text style={s.icon}>1</Text>
      </View>

      <View style={s.button}>
        <Text style={s.icon}>2</Text>
      </View>
    </View>
  );
}

function getStyles(c: any) {
  return StyleSheet.create({
    containerHeader: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card, // antes: colors.white
    },
    button: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: c.mutedBg, // antes: colors.gray300
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.outline,
    },
    icon: {
      color: c.text, // antes: colors.navy
      fontWeight: '700',
    },
  });
}
