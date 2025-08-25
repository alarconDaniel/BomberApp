import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput,
  TouchableOpacity, FlatList, Alert, ActivityIndicator,
} from 'react-native';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/StackNavigator';

import FadeWrapper from '../../components/FadeWrapper';
import HeaderOperario from '../../components/HeaderOperario';
import { colors } from '../../styles/globalStyles1';
import { API } from '../../config/api';

const FOOTER_HEIGHT = 64;

/* ---------- Tipos ---------- */
type OperarioUI = {
  id: string; // para la FlatList y navegación
  nombre: string;
  cargo: 'Administrador' | 'Operario';
};

type UsuarioDTO = {
  codUsuario: number;
  nombreUsuario: string;
  apellidoUsuario: string;
  correoUsuario: string;
  contrasenaUsuario: string;
  codRol: number; // 1 = Administrador, 2 = Operario (ajústalo si difiere)
};

/* ---------- Mapeos ---------- */
function mapUsuarioToUI(u: UsuarioDTO): OperarioUI {
  return {
    id: String(u.codUsuario),
    nombre: `${u.nombreUsuario} ${u.apellidoUsuario}`.trim(),
    cargo: u.codRol === 1 ? 'Administrador' : 'Operario',
  };
}

/* ---------- Pantalla ---------- */
export default function OperariosScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [query, setQuery] = useState('');
  const [data, setData] = useState<OperarioUI[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cargar lista desde backend
  const listar = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch(API.usuario.listar);
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      let json: unknown;
      try { json = JSON.parse(txt); } catch { throw new Error('JSON inválido'); }
      const arr = Array.isArray(json) ? (json as UsuarioDTO[]).map(mapUsuarioToUI) : [];
      setData(arr);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    listar();
  }, [listar]);

  // Refrescar al volver de Crear/Editar
  useFocusEffect(
    useCallback(() => {
      listar();
    }, [listar]),
  );

  // Borrar operario
  const borrar = (id: string) => {
    Alert.alert('Confirmar', '¿Deseas borrar este operario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            setCargando(true);
            const res = await fetch(API.usuario.borrar(Number(id)), { method: 'DELETE' });
            const txt = await res.text();

            if (!res.ok) {
              if (res.status === 409 || /1451|referenciad/i.test(txt)) {
                Alert.alert('No se puede borrar', 'El usuario está referenciado por otros registros.');
              } else if (res.status === 404) {
                Alert.alert('No existe', 'Usuario no encontrado');
              } else {
                Alert.alert('Error', txt || `HTTP ${res.status}`);
              }
              return;
            }

            await listar();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo borrar');
          } finally {
            setCargando(false);
          }
        },
      },
    ]);
  };

  // Filtro local por nombre
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data.filter((o: OperarioUI) => o.nombre.toLowerCase().includes(q)) : data;
  }, [query, data]);

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
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.createBtn}
            onPress={() => navigation.navigate('OperarioForm', { mode: 'create' })}
          >
            <Text style={styles.createText}>Crear</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.roundIcon}
            activeOpacity={0.8}
            onPress={listar}
          />
        </View>

        {/* Lista */}
        {cargando ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OperarioItem
                item={item}
                onEdit={() =>
                  navigation.navigate('OperarioForm', { mode: 'edit', id: String(item.id) })
                }
                onDelete={() => borrar(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 16, paddingBottom: FOOTER_HEIGHT + 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Item de la lista ---------- */
function OperarioItem({
  item,
  onEdit,
  onDelete,
}: {
  item: OperarioUI;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={itemStyles.card}>
      {/* Avatar circular */}
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
        <Square onPress={onEdit} />
        <Square danger onPress={onDelete} />
      </View>
    </View>
  );
}

function Square({ onPress, danger = false }: { onPress?: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.square, danger && { backgroundColor: '#ff6b6b' }]}
    />
  );
}

/* ---------- Estilos ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  headerRow: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5, color: colors.navy },

  searchWrap: { marginHorizontal: 16, borderRadius: 10, backgroundColor: '#E6E9ED' },
  searchInput: { height: 36, paddingHorizontal: 12, color: '#1F2937' },

  actionsRow: {
    marginTop: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
  },

  square: { width: 20, height: 20, backgroundColor: '#BDBDBD', borderRadius: 4 },

  createBtn: {
    backgroundColor: '#BDBDBD', paddingHorizontal: 14, height: 32, borderRadius: 8, justifyContent: 'center',
  },
  createText: { color: colors.navy, fontWeight: '700' },

  roundIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#9AA4AD' },
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C4C4C4' },
  crossV: { position: 'absolute', left: 19, top: 6, bottom: 6, width: 2, backgroundColor: '#A9A9A9', borderRadius: 1 },
  crossH: { position: 'absolute', top: 19, left: 6, right: 6, height: 2, backgroundColor: '#A9A9A9', borderRadius: 1 },
  info: { flex: 1, paddingRight: 8 },
  name: { fontWeight: '800', color: '#2A2A2A' },
  role: { marginTop: 2, fontSize: 12, color: '#5F6B7A', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 6, marginLeft: 6 },
});
