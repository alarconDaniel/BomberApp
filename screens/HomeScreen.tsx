import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView } from 'react-native';
import HeaderOperario from '../components/HeaderOperario';
import FooterOperario from '../components/FooterOperario';
import FadeWrapper from '../components/FadeWrapper';
import { colors } from '../styles/globalStyles1';

const FOOTER_HEIGHT = 64;

export default function HomeScreen() {
  return (
    <FadeWrapper>
      <SafeAreaView style={styles.container}>
        <HeaderOperario />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + 16 }]}
        >
          <Text style={styles.title}>¡Bienvenido!</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas del mes</Text>
            <View style={[styles.card, { backgroundColor: colors.orange }]} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trabajos realizados</Text>
            <View style={[styles.card, { backgroundColor: colors.blue }]} />
          </View>
        </ScrollView>

        
      </SafeAreaView>
    </FadeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.red,
  },
  card: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cfcfcf',
  },
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
});
