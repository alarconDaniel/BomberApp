// components/HeaderOperario.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/globalStyles1'; // ajusta la ruta si este archivo está en otra carpeta

export default function HeaderOperario() {
  return (
    <View style={styles.containerHeader}>
      <View style={styles.button}>
        <Text style={styles.icon}>1</Text>
      </View>

      <View style={styles.button}>
        <Text style={styles.icon}>2</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.navy,
    fontWeight: '700',
  },
});
