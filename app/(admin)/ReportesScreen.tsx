// app/(admin)/ReportesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import HeaderOperario from '../../components/HeaderOperario';

import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';

type DriveFile = {
  id: string;
  name: string;           // nombre con el que se subió (Drive lo respeta)
  mimeType?: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
};

const FOOTER_HEIGHT = 56;
const INITIAL_SHOWN = 6;

export default function ReportesScreen() {
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  const c = {
    bg: colors.bg,
    card: colors.card,
    section: colors.cardTint,
    text: colors.text,
    soft: colors.mutedText,
    border: colors.tabBorder,
    pill: colors.mutedBg,
    searchBg: colors.card,
    searchBorder: colors.inputBorder,
    sectionAccent: colors.primarySoft,
    danger: colors.danger ?? '#EF4444',
    primary: colors.primary,
  };

  const { fetchJson } = useAuth();

  // Estado UI
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Archivos por tipo
  const [mantFiles, setMantFiles] = useState<DriveFile[]>([]);
  const [supFiles, setSupFiles] = useState<DriveFile[]>([]);

  // Cargar por tipo desde backend /archivos/listar-por-tipo
  const loadTipo = useCallback(async (tipo: 'mantenimiento' | 'supervision') => {
    const r = await fetchJson<{ files: DriveFile[]; nextPageToken?: string; folderId: string }>(
      `/archivos/listar-por-tipo?tipo=${tipo}`
    );
    return r.files || [];
  }, [fetchJson]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [m, s] = await Promise.all([loadTipo('mantenimiento'), loadTipo('supervision')]);
      setMantFiles(m);
      setSupFiles(s);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar los reportes de Drive');
    } finally {
      setLoading(false);
    }
  }, [loadTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = useCallback(async () => {
    try { setRefreshing(true); await cargar(); } finally { setRefreshing(false); }
  }, [cargar]);

  // Abrir archivo (Drive webViewLink)
  const abrir = useCallback(async (f: DriveFile) => {
    if (!f.webViewLink) return Alert.alert('Drive', 'No hay enlace para este archivo.');
    try { await Linking.openURL(f.webViewLink); } catch (e) {
      Alert.alert('Drive', 'No se pudo abrir el enlace.');
    }
  }, []);

  // Eliminar archivo — body debe ser string y con Content-Type JSON
  const eliminar = useCallback(async (f: DriveFile, tipo: 'mantenimiento' | 'supervision') => {
    Alert.alert(
      'Eliminar',
      `¿Borrar "${f.name}" de ${tipo === 'mantenimiento' ? 'Mantenimiento' : 'Supervisión'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchJson(`/archivos/eliminar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: f.id }), // ← FIX aquí
              });
              if (tipo === 'mantenimiento') {
                setMantFiles(prev => prev.filter(x => x.id !== f.id));
              } else {
                setSupFiles(prev => prev.filter(x => x.id !== f.id));
              }
            } catch (e: any) {
              Alert.alert('Eliminar', e?.message ?? 'No se pudo eliminar el archivo.');
            }
          }
        }
      ],
      { cancelable: true }
    );
  }, [fetchJson]);

  // Filtro en memoria por query
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { m: mantFiles, s: supFiles };
    const filtra = (arr: DriveFile[]) =>
      arr.filter(f => (f.name || '').toLowerCase().includes(q));
    return { m: filtra(mantFiles), s: filtra(supFiles) };
  }, [query, mantFiles, supFiles]);

  // Secciones
  const sections = useMemo(() => ([
    { key: 'Mantenimiento', items: filtrados.m as DriveFile[], tipo: 'mantenimiento' as const },
    { key: 'Supervisión',   items: filtrados.s as DriveFile[], tipo: 'supervision' as const },
  ]), [filtrados]);

  const toggleMas = (seccion: string) =>
    setExpanded(prev => ({ ...prev, [seccion]: !prev[seccion] }));

  // Icono por tipo
  function pickIcon(mime?: string, name?: string) {
    const ext = (name?.split('.').pop() || '').toLowerCase();
    const lower = (mime || '').toLowerCase();
    if (['pdf'].includes(ext) || lower.includes('pdf')) return { label: 'PDF', bg: '#e74c3c' };
    if (['xls','xlsx','csv'].includes(ext) || lower.includes('sheet') || lower.includes('excel')) return { label: 'XLS', bg: '#27ae60' };
    if (['doc','docx'].includes(ext) || lower.includes('word') || lower.includes('msword') || lower.includes('wordprocessingml')) return { label: 'DOC', bg: '#2980b9' };
    if (['ppt','pptx'].includes(ext) || lower.includes('powerpoint') || lower.includes('presentationml')) return { label: 'PPT', bg: '#e67e22' };
    return { label: 'FILE', bg: '#7f8c8d' };
  }

  const Row = ({ f, tipo }: { f: DriveFile; tipo: 'mantenimiento' | 'supervision' }) => {
    const { label, bg } = pickIcon(f.mimeType, f.name);
    return (
      <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Text style={styles.iconTxt}>{label}</Text>
        </View>

        <View style={{ flex: 1 }}>
          {/* Nombre EXACTO con el que se subió */}
          <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{f.name}</Text>
          <Text style={[styles.rowSub, { color: c.soft }]} numberOfLines={1}>
            {new Date(f.createdTime || Date.now()).toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pill, { backgroundColor: c.pill }]}
          onPress={() => abrir(f)}
          activeOpacity={0.9}
        >
          <Ionicons name="open-outline" size={16} color={c.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, { backgroundColor: c.danger }]}
          onPress={() => eliminar(f, tipo)}
          activeOpacity={0.9}
        >
          <Ionicons name="trash" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSection = (title: string, items: DriveFile[], tipo: 'mantenimiento' | 'supervision') => {
    const isOpen = expanded[title] ?? false;
    const slice = isOpen ? items : items.slice(0, INITIAL_SHOWN);
    return (
      <View style={[styles.sectionWrap, { backgroundColor: c.section, borderColor: c.sectionAccent }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: c.sectionAccent, color: c.text }]}>
          {title}
        </Text>

        {items.length === 0 && (
          <Text style={{ color: c.soft, marginTop: 6 }}>Sin archivos</Text>
        )}

        {slice.map((f) => (
          <View key={`${title}-${f.id}`} style={styles.rowWrap}>
            <Row f={f} tipo={tipo} />
          </View>
        ))}

        {items.length > INITIAL_SHOWN && (
          <TouchableOpacity
            style={[styles.moreBtn, { backgroundColor: c.pill }]}
            onPress={() => toggleMas(title)}
          >
            <Text style={[styles.moreTxt, { color: c.text }]}>{isOpen ? 'Menos' : 'Más'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: colors.text }}>Cargando reportes…</Text>
        </SafeAreaView>
      </FadeWrapper>
    );
  }

  return (
    <FadeWrapper>
      <HeaderOperario />
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={[styles.pageTitle, { color: c.text }]}>REPORTES</Text>

        {/* Buscador */}
        <View style={[styles.searchWrap, { backgroundColor: c.searchBg, borderColor: c.searchBorder }]}>
          <Ionicons name="search" size={16} color={c.soft} style={{ marginHorizontal: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Buscar por nombre"
            placeholderTextColor={c.soft}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} accessibilityLabel="Actualizar">
            <Ionicons name="refresh" size={18} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 10 }} />

        <FlatList
          data={[
            { key: 'Mantenimiento' as const, items: filtrados.m, tipo: 'mantenimiento' as const },
            { key: 'Supervisión' as const,   items: filtrados.s, tipo: 'supervision' as const },
          ]}
          keyExtractor={(s) => s.key}
          renderItem={({ item }) => renderSection(item.key, item.items, item.tipo)}
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </FadeWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
  pageTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 4 },
  refreshBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  sectionWrap: { borderRadius: 14, padding: 10, marginBottom: 14, borderWidth: 1.5 },
  sectionTitle: {
    fontSize: 15, fontWeight: '800',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    alignSelf: 'flex-start', marginBottom: 8,
  },

  rowWrap: { marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  icon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },

  rowTitle: { fontWeight: '700' },
  rowSub: { fontSize: 12 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  pillTxt: { fontWeight: '700' },

  moreBtn: { alignSelf: 'center', marginTop: 6, paddingHorizontal: 30, paddingVertical: 6, borderRadius: 100 },
  moreTxt: { fontWeight: '800' },
});
