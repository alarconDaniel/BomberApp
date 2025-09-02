// app/(admin)/(tabs)/RetosScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Alert, ActivityIndicator, Pressable, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';

// util compartido
import { fetchRetos, deleteReto, type RetoDTO } from './lib/retos';

const FOOTER_HEIGHT = 64;

/* ===== Helper robusto para permisos ===== */
function hasAdminRole(u: any): boolean {
  if (!u) return false;
  const flat = [
    u?.rol, u?.role, u?.roleId, u?.rolId, u?.codRol, u?.cod_rol,
    u?.idRol, u?.id_rol, u?.perfil, u?.nombreRol, u?.nombre_rol,
  ].filter(v => v !== undefined && v !== null);

  for (const v of flat) {
    const s = String(v).trim().toLowerCase();
    if (s === '1' || s === 'admin' || s === 'administrador') return true;
    const n = Number(s);
    if (!Number.isNaN(n) && n === 1) return true;
  }
  const rname = u?.rol?.name ?? u?.rol?.nombre ?? u?.role?.name ?? u?.role?.nombre;
  if (rname && ['admin', 'administrador'].includes(String(rname).toLowerCase())) return true;
  const rid = u?.rol?.id ?? u?.role?.id;
  return rid === 1 || String(rid) === '1';
}

export default function RetosScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);

  const { user, loading: authLoading, fetchJson } = useAuth();
  const isAdmin = useMemo(() => hasAdminRole(user), [user]);

  const scrollRef = useRef<ScrollView>(null);

  const [query, setQuery] = useState('');
  const [cargando, setCargando] = useState(false);
  const [retos, setRetos] = useState<RetoDTO[]>([]);

  const listarRetos = async () => {
    try {
      setCargando(true);
      const arr = await fetchRetos(fetchJson);
      setRetos(arr);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('401')) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      else Alert.alert('Error', msg || 'No se pudo cargar la lista de retos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { listarRetos(); }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      // Al volver del modal, refrescamos la lista
      listarRetos();
      return () => {};
    }, [])
  );

  if (authLoading) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Verificando sesión…</Text>
        </SafeAreaView>
      </FadeWrapper>
    );
  }

  const borrar = (id: string | number) => {
    if (!isAdmin) { Alert.alert('Sin permisos', 'Solo un administrador puede borrar retos.'); return; }
    Alert.alert('Confirmar', '¿Deseas borrar este reto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive', onPress: async () => {
          try {
            setCargando(true);
            await deleteReto(fetchJson, id);
            await listarRetos();
            Alert.alert('Listo', 'Reto eliminado');
          } catch (e: any) {
            const msg = String(e?.message || '');
            if (/401/.test(msg)) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
            else if (/403/.test(msg)) Alert.alert('Sin permisos', 'El servidor rechazó el borrado (403).');
            else Alert.alert('Error', msg || 'No se pudo borrar');
          } finally { setCargando(false); }
        }
      }
    ]);
  };

  const abrirCrearModal = () => {
    router.push('/(modals)/reto/crear-reto');
  };

  const editar = (item: RetoDTO) => {
    router.push({
      pathname: '/(modals)/reto/crear-reto',
      params: { mode: 'edit', item: JSON.stringify(item) },
    });
  };

  const retosFiltrados = useMemo(() => {
    const q = query.toLowerCase();
    return retos.filter(r => (r.nombreReto || '').toLowerCase().includes(q));
  }, [query, retos]);

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 80 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[g.text.h2, { flex: 1 }]}>Retos</Text>

            {isAdmin && (
              <Pressable
                onPress={abrirCrearModal}
                style={{
                  height: 40,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={[g.text.onPrimary, { marginLeft: 6, fontWeight: '700' }]}>Crear reto</Text>
              </Pressable>
            )}
          </View>

          {/* Historial */}
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={g.text.h3}>Historial de retos</Text>

            <View style={[s.searchWrap, { marginTop: 10 }]}>
              <Ionicons name="search" size={16} color={colors.mutedText} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar…"
                placeholderTextColor={colors.mutedText}
                style={s.searchInput}
              />
            </View>

            {cargando ? (
              <View style={{ marginTop: 12 }}><ActivityIndicator /></View>
            ) : retos.length > 0 ? (
              <FlatList
                data={retosFiltrados}
                keyExtractor={(item) => String(item.codReto)}
                renderItem={({ item }) => (
                  <RetoItem
                    item={item}
                    onEdit={() => editar(item)}
                    onDelete={() => borrar(item.codReto)}
                    c={colors}
                    g={g}
                    isAdmin={isAdmin}
                  />
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
                style={{ marginTop: 10 }}
              />
            ) : (
              <FlatList
                data={[]}
                keyExtractor={(item) => String(item)}
                renderItem={null as any}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 16 }}>
                    <Text style={{ textAlign: 'center', color: colors.mutedText }}>
                      Sin retos
                    </Text>
                  </View>
                }
                scrollEnabled={false}
                style={{ marginTop: 10 }}
              />
            )}
          </View>
        </ScrollView>

        {/* FAB */}
        {isAdmin && (
          <Pressable
            onPress={abrirCrearModal}
            style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            android_ripple={{ color: '#00000022', borderless: true }}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 8 }}>Nuevo reto</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes ---------- */
function Square({ onPress, danger = false, c, title }: { onPress?: () => void; danger?: boolean; c: any; title?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: danger ? c.danger : c.mutedBg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: danger ? c.danger : c.outline
      }}
    >
      <Ionicons name={danger ? 'trash' : 'create'} size={16} color={danger ? '#fff' : c.text} />
    </Pressable>
  );
}

function RetoItem({
  item, onEdit, onDelete, c, g, isAdmin
}: {
  item: RetoDTO;
  onEdit: () => void;
  onDelete: () => void;
  c: any;
  g: ReturnType<typeof makeGlobalStyles>;
  isAdmin: boolean;
}) {
  return (
    <View style={{
      backgroundColor: c.cardTint, borderRadius: 12, paddingHorizontal: 12, minHeight: 56,
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.tabBorder
    }}>
      <Text style={[g.text.bodyStrong, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
        {item.nombreReto}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginLeft: 10 }}>
        {isAdmin && <Square onPress={onEdit} c={c} title="Editar" />}
        {isAdmin && <Square onPress={onDelete} danger c={c} title="Borrar" />}
      </View>
    </View>
  );
}

/* ---------- Estilos base ---------- */
function getStyles(c: import('../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 18,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.tabBorder,
      backgroundColor: c.card,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10,
      backgroundColor: c.card, paddingHorizontal: 10, height: 40,
    },
    searchInput: { flex: 1, color: c.text },
  });
}

/* ---------- Estilos locales ---------- */
const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
