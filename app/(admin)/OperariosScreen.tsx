import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { API } from '../../config/api';

const FOOTER_HEIGHT = 64;

/* ---------- Tipos ---------- */
type OperarioUI = {
  id: string;
  nombre: string;
  cargo: 'Administrador' | 'Operario';
};

type UsuarioDTO = {
  codUsuario: number;
  nombreUsuario: string;
  apellidoUsuario: string;
  correoUsuario: string;
  contrasenaUsuario: string;
  codRol: number; // 1 = Admin, 2 = Operario
};

/* ---------- Mapeo ---------- */
function mapUsuarioToUI(u: UsuarioDTO): OperarioUI {
  return {
    id: String(u.codUsuario),
    nombre: `${u.nombreUsuario} ${u.apellidoUsuario}`.trim(),
    cargo: u.codRol === 1 ? 'Administrador' : 'Operario',
  };
}

/* ---------- Pantalla ---------- */
export default function OperariosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [data, setData] = useState<OperarioUI[]>([]);
  const [cargando, setCargando] = useState(false);

  const listar = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch(API.usuario.listar);
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
      const json = JSON.parse(txt) as unknown;
      const arr = Array.isArray(json) ? (json as UsuarioDTO[]).map(mapUsuarioToUI) : [];
      setData(arr);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { listar(); }, [listar]);

  useFocusEffect(useCallback(() => { listar(); }, [listar]));

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? data.filter(o => o.nombre.toLowerCase().includes(q)) : data;
  }, [query, data]);

  return (
    <FadeWrapper>
      <SafeAreaView style={[s.container, { paddingTop: insets.top || 8 }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={g.text.h2}>Operarios</Text>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(admin)/(tabs)/operarios/OperarioFormScreen',
                params: { mode: 'create' },
              })
            }
            style={s.primaryBtn}
            activeOpacity={0.9}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={[g.text.onPrimary, { marginLeft: 6 }]}>Crear</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color="#97A0AC" style={{ marginHorizontal: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar un operario"
            placeholderTextColor="#9aa4ad"
            style={s.searchInput}
          />
          <TouchableOpacity style={s.refreshBtn} onPress={listar} accessibilityLabel="Actualizar">
            <Ionicons name="refresh" size={18} color={colors.text} />
          </TouchableOpacity>
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
                  router.push({
                    pathname: '/(admin)/(tabs)/operarios/OperarioFormScreen',
                    params: { mode: 'edit', id: String(item.id) },
                  })
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

/* ---------- Item ---------- */
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
      <View style={itemStyles.avatar} />
      <View style={itemStyles.info}>
        <Text numberOfLines={1} style={itemStyles.name}>{item.nombre}</Text>
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
      style={[itemStyles.square, danger && { backgroundColor: '#ff6b6b' }]}
    />
  );
}

/* ---------- Estilos ---------- */
function getStyles(c: import('../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      height: 36,
      borderRadius: 10,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    searchWrap: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      backgroundColor: '#EEF2F7',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: '#E1E6EE',
    },
    searchInput: { flex: 1, height: 40, paddingHorizontal: 8, color: c.text },
    refreshBtn: {
      padding: 6,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E9ED',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#D1D5DB', marginRight: 12 },
  info: { flex: 1, paddingRight: 8 },
  name: { fontWeight: '800', fontSize: 15, color: '#111827' },
  role: { marginTop: 2, fontSize: 13, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 8 },
  square: { width: 24, height: 24, backgroundColor: '#9CA3AF', borderRadius: 6 },
});
