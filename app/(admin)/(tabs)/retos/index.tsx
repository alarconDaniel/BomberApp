// app/(admin)/(tabs)/retos/index.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function RetosIndex() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Retos disponibles</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(admin)/(tabs)/retos/RetoEmparejarScreen')}
      >
        <Text style={styles.cardText}>Reto de Emparejar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(admin)/(tabs)/retos/RetoMultipleScreen')}
      >
        <Text style={styles.cardText}>Reto de Selección Múltiple</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(admin)/(tabs)/retos/RetoRellenarScreen')}
      >
        <Text style={styles.cardText}>Reto de Rellenar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  cardText: {
    fontSize: 18,
  },
});
