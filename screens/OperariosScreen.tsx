// screens/OperariosScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import CustomFooter from '../components/CustomFooter';
import { colors } from '../styles/globalStyles1';

const FOOTER_HEIGHT = 64;

type Operario = {
  id: string;
  nombre: string;
  cargo: 'Operativo' | 'Mantenimiento' | 'Supervisión';
};

const MOCK: Operario[] = [
  { id: '1', nombre: 'Juan Camilo Carrillo', cargo: 'Operativo' },
  { id: '2', nombre: 'Daniel Andres Ulloa', cargo: 'Operativo' },
  { id: '3', nombre: 'Luis Carlos Perez', cargo: 'Mantenimiento' },
  { id: '4', nombre: 'Juan Andres Silva', cargo: 'Mantenimiento' },
  { id: '5', nombre: 'Juan David  Fuentes', cargo: 'Operativo' },
  { id: '6', nombre: 'Gonzalo Arturo Rojas', cargo: 'Supervisión' },
  { id: '7', nombre: 'Kevin Orlando Bonilla', cargo: 'Operativo' },
  { id: '8', nombre: 'Samuel Felipe Oriz', cargo: 'Supervisión' },
];

export default function OperariosScreen() {
  const [query, setQuery] = useState('');

  const data = useMemo(
    () =>
      MOCK.filter((o) =>
        o.nombre.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query]
  );

  return (
    <FadeWrapper>
      <SafeAreaView style={styles.container}>
        <HeaderOperario />

        <View style={styles.headerRow}>
          <Text style={styles.title}>OPERARIOS</Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar un operario"
            placeholderTextColor="#9aa4ad"
            style={styles.searchInput}
          />
        </View>

        {/* Acciones superiores */}
        <View style={styles.actionsRow}>
          <TouchableOpacity activeOpacity={0.9} style={styles.createBtn}>
            <Text style={styles.createText}>Crear</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.roundIcon} activeOpacity={0.8} />
        </View>

        {/* Lista */}
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OperarioItem item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: FOOTER_HEIGHT + 20 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer fijo */}
        
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Item de la lista ---------- */

function OperarioItem({ item }: { item: Operario }) {
  return (
    <View style={itemStyles.card}>
      {/* Avatar circular con “grilla” tipo wireframe */}
      <View style={itemStyles.avatarWrap}>
        <View style={itemStyles.avatar} />
        <View style={itemStyles.crossV} />
        <View style={itemStyles.crossH} />
      </View>

      <View style={itemStyles.info}>
        <Text numberOfLines={1} style={itemStyles.name}>
          {item.nombre}
        </Text>
        <Text style={itemStyles.role}>{item.cargo}</Text>
      </View>

      <View style={itemStyles.actions}>
        <Square />
        <Square />
        <Square />
      </View>
    </View>
  );
}

function Square() {
  return <View style={itemStyles.square} />;
}

/* ---------- Estilos ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5, color: colors.navy },

  searchWrap: {
    marginHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#E6E9ED',
  },
  searchInput: { height: 36, paddingHorizontal: 12, color: '#1F2937' },

  actionsRow: {
    marginTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createBtn: {
    backgroundColor: '#BDBDBD',
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
  },
  createText: { color: colors.navy, fontWeight: '700' },

  roundIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#9AA4AD',
  },

  footer: {
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

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: '#D9D9D9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: { width: 40, height: 40, marginRight: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C4C4C4',
  },
  crossV: {
    position: 'absolute',
    left: 19,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: '#A9A9A9',
    borderRadius: 1,
  },
  crossH: {
    position: 'absolute',
    top: 19,
    left: 6,
    right: 6,
    height: 2,
    backgroundColor: '#A9A9A9',
    borderRadius: 1,
  },
  info: { flex: 1, paddingRight: 8 },
  name: { fontWeight: '800', color: '#2A2A2A' },
  role: { marginTop: 2, fontSize: 12, color: '#5F6B7A', fontStyle: 'italic' },

  actions: { flexDirection: 'row', gap: 6, marginLeft: 6 },
  square: {
    width: 22,
    height: 22,
    backgroundColor: '#B0B0B0',
    borderRadius: 6,
  },
});
