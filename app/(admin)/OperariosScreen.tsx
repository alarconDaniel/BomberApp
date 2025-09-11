// app/(admin)/OperariosScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/admin/FadeWrapper';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';

const FOOTER_HEIGHT = 64;

/* ---------- Tipos (alineados al backend) ---------- */
type UsuarioListDTO = {
  codUsuario: number;
  codRol: number;                 // 1=Admin, 2=Operario
  codCargoUsuario: number | null;
  nombreUsuario: string;
  apellidoUsuario: string;
  cedulaUsuario: string;
  nicknameUsuario: string | null;
  correoUsuario: string;
  tokenVersion: number;
};

type OperarioUI = {
  id: string;
  nombre: string;
  cargo: 'Administrador' | 'Operario';
};

/* ---------- Helpers UI ---------- */
function mapUsuarioToUI(u: UsuarioListDTO): OperarioUI {
  return {
    id: String(u.codUsuario),
    nombre: `${u.nombreUsuario} ${u.apellidoUsuario}`.trim(),
    cargo: u.codRol === 1 ? 'Administrador' : 'Operario',
  };
}

const getInitial = (name: string) =>
    (name || '').trim().charAt(0).toUpperCase() || '?';

/** color pastel estable por id (hash tonto) */
function pastelFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 85%)`;
}

/* ---------- Pantalla ---------- */
export default function OperariosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const { fetchJson } = useAuth();

  const [query, setQuery] = useState('');
  const [data, setData] = useState<OperarioUI[]>([]);
  const [cargando, setCargando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  // 👇 Nuevo: id del usuario actual
  const [myId, setMyId] = useState<string | null>(null);

  const cargarMe = useCallback(async () => {
    try {
      const me = await fetchJson<UsuarioListDTO>('/usuario/me');
      if (me && typeof me.codUsuario === 'number') setMyId(String(me.codUsuario));
    } catch {
      // Si falla, no bloqueamos la pantalla; el backend igual protege.
      setMyId(null);
    }
  }, [fetchJson]);

  const listar = useCallback(async () => {
    try {
      setCargando(true);
      const json = await fetchJson<UsuarioListDTO[]>('/usuario/listar');
      const arr = Array.isArray(json) ? json.map(mapUsuarioToUI) : [];
      setData(arr);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, [fetchJson]);

  const refrescar = useCallback(async () => {
    try {
      setRefrescando(true);
      const json = await fetchJson<UsuarioListDTO[]>('/usuario/listar');
      setData((Array.isArray(json) ? json : []).map(mapUsuarioToUI));
      await cargarMe(); // mantener me en sync por si acaso
    } catch {
      // silencio
    } finally {
      setRefrescando(false);
    }
  }, [fetchJson, cargarMe]);

  useEffect(() => {
    // Carga inicial de lista y del usuario actual
    listar();
    cargarMe();
  }, [listar, cargarMe]);

  useFocusEffect(useCallback(() => {
    listar();
    cargarMe();
  }, [listar, cargarMe]));

  const borrar = (id: string) => {
    // 🛡️ Bloqueo client-side: no permitir intento de auto-eliminación
    if (myId && id === myId) {
      Alert.alert('Acción no permitida', 'No puedes eliminarte a ti mismo 🤺');
      return;
    }

    Alert.alert('Confirmar', '¿Deseas borrar este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          let exito = false;
          try {
            setCargando(true);
            await fetchJson(`/usuario/borrar/${Number(id)}`, { method: 'DELETE' });
            await listar();
            await cargarMe();
            exito = true;
          } catch (e: any) {
            const msg = '';
            if (/403/.test(msg) || /propi/i.test(msg)) {
              Alert.alert('Acción no permitida', 'No puedes eliminar tu propio usuario');
            } else if (/409/.test(msg) || /1451|referenciad/i.test(msg)) {
              Alert.alert('No se puede borrar', 'El usuario está referenciado por otros registros.');
            } else if (/404/.test(msg)) {
              Alert.alert('No existe', 'Usuario no encontrado');
            } else {
              Alert.alert('Error', msg || 'No se pudo borrar');
            }
          } finally {
            setCargando(false);
            if(exito){
              Alert.alert('Información', `El usuario se eliminó exitosamente.`);
            }
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
        <SafeAreaView style={[s.container, { paddingTop: (insets.top || 8) }]}>
          {/* Header */}
          <View style={s.header}>
            <Text style={[g.text.h1, {textAlign: "center", alignSelf: "center", paddingTop: 10}]}>Operarios</Text>

            <TouchableOpacity
                onPress={() =>
                    router.push({
                      // 🟣 ABRE MODAL para crear
                      pathname: '/(modals)/admin/operario-form',
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
            <Ionicons name="search" size={16} color={colors.mutedText} style={{ marginHorizontal: 8 }} />
            <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar un operario"
                placeholderTextColor={colors.mutedText}
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
                          myId={myId}
                          onEdit={() =>
                              router.push({
                                // 🟣 ABRE MODAL para editar
                                pathname: '/(modals)/admin/operario-form',
                                params: { mode: 'edit', id: String(item.id) },
                              })
                          }
                          onDelete={() => borrar(item.id)}
                          c={colors}
                      />
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  contentContainerStyle={{ padding: 16, paddingBottom: FOOTER_HEIGHT + 20 }}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
                  ListEmptyComponent={
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ opacity: 0.6 }}>Sin usuarios</Text>
                    </View>
                  }
              />
          )}
        </SafeAreaView>
      </FadeWrapper>
  );
}

/* ---------- Item ---------- */
function OperarioItem({
                        item,
                        myId,
                        onEdit,
                        onDelete,
                        c,
                      }: {
  item: OperarioUI;
  myId: string | null;
  onEdit: () => void;
  onDelete: () => void;
  c: import('../../theme/ThemeProvider').Palette;
}) {
  const initial = getInitial(item.nombre);
  const isSelf = myId && item.id === myId;

  return (
      <View style={[itemStyles.card, { backgroundColor: c.card, borderColor: c.tabBorder }]}>
        <View style={[itemStyles.avatar, { backgroundColor: pastelFromId(item.id) }]}>
          <Text style={itemStyles.avatarText}>{initial}</Text>
        </View>

        <View style={itemStyles.info}>
          <Text numberOfLines={1} style={[itemStyles.name, { color: c.text }]}>{item.nombre}</Text>
          <Text style={[itemStyles.role, { color: c.mutedText }]}>{item.cargo}</Text>
        </View>

        <View style={itemStyles.actions}>
          <TouchableOpacity
              onPress={onEdit}
              style={[itemStyles.iconBtn, { backgroundColor: c.mutedBg, borderColor: c.outline }]}
              activeOpacity={0.85}
              accessibilityLabel="Editar"
          >
            <Ionicons name="create-outline" size={16} color={c.text} />
          </TouchableOpacity>

          {/* Botón borrar: deshabilitado si soy yo mismo */}
          <TouchableOpacity
              onPress={() => {
                if (isSelf) {
                  Alert.alert('Acción no permitida', 'No puedes eliminarte a ti mismo 🤺');
                  return;
                }
                onDelete();
              }}
              style={[
                itemStyles.iconBtn,
                {
                  backgroundColor: isSelf ? c.mutedBg : c.danger,
                  borderColor: isSelf ? c.outline : c.danger,
                  opacity: isSelf ? 0.5 : 1,
                },
              ]}
              activeOpacity={0.85}
              accessibilityLabel={isSelf ? 'Eliminar (deshabilitado para tu propio usuario)' : 'Eliminar'}
          >
            <Ionicons name="trash-outline" size={16} color={isSelf ? c.text : '#fff'} />
          </TouchableOpacity>
        </View>
      </View>
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
      marginTop: 3,
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
      backgroundColor: c.card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: c.inputBorder,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: '#111827', fontSize: 16 },
  info: { flex: 1, paddingRight: 8 },
  name: { fontWeight: '800', fontSize: 15 },
  role: { marginTop: 2, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
