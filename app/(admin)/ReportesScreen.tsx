// app/(admin)/ReportesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert,
  ActivityIndicator, Pressable, SafeAreaView
} from 'react-native';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import HeaderOperario from '../../components/HeaderOperario';

import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

// ⬇️ usa el contexto y el factory existente
import { useAuth } from '../../auth/AuthContext';
import { makeArchivosApi, type ArchivoItem } from '../../config/archivos/archivo';

type GroupMap = Record<string, ArchivoItem[]>;
const FOOTER_HEIGHT = 56;
const INITIAL_SHOWN = 3;

export default function ReportesScreen() {
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  // 🎨 Paleta DARK (coherente con Operarios/Retos)
  const c = {
    bg: colors.bg,                  // fondo principal oscuro
    card: colors.card,              // tarjetas
    section: colors.cardTint,       // bloques de sección
    text: colors.text,              // texto principal
    soft: colors.mutedText,         // texto secundario
    border: colors.tabBorder,       // bordes sutiles
    pill: colors.mutedBg,           // chips / botones suaves
    searchBg: colors.card,          // buscador
    searchBorder: colors.inputBorder,
    sectionAccent: colors.primarySoft, // etiqueta de sección
    danger: colors.danger ?? '#EF4444',
    primary: colors.primary,
  };

  const { user, loading: authLoading, fetchJson, baseUrl } = useAuth();
  const archivosApi = useMemo(() => makeArchivosApi(fetchJson, baseUrl), [fetchJson, baseUrl]);

  const isAdmin = (() => {
    const r = (user as any)?.rol;
    if (typeof r === 'number') return r === 1;
    return String(r ?? '').toLowerCase() === 'admin' || String(r ?? '').toLowerCase() === 'administrador';
  })();

  const [query, setQuery] = useState('');
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      // Soporta {items,total} o {rows,total}
      const resp = await archivosApi.listarArchivos({ take: 100, skip: 0 });
      const items = (resp as any).items ?? (resp as any).rows ?? [];
      setArchivos(items);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  }, [archivosApi]);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = useCallback(async () => {
    try { setRefreshing(true); await cargar(); } finally { setRefreshing(false); }
  }, [cargar]);

  const abrir = useCallback(async (item: ArchivoItem) => {
    try {
      const url = await archivosApi.obtenerUrlDescarga(item.path);
      if (!url) return Alert.alert('Descarga', 'No se pudo obtener la URL de descarga');
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Descarga', e?.message ?? 'No se pudo abrir el archivo');
    }
  }, [archivosApi]);

  const borrar = useCallback((item: ArchivoItem) => {
    if (!isAdmin) return Alert.alert('Sin permisos', 'Solo un administrador puede eliminar archivos.');
    if (item.codUsuario == null) return Alert.alert('Eliminar', 'No se puede eliminar: falta el propietario del archivo.');
    Alert.alert(
      'Eliminar',
      `¿Borrar "${item.nombreOriginal}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const ok = await archivosApi.eliminarArchivo(item.path, item.codUsuario!);
              if (ok) setArchivos(prev => prev.filter(a => a.path !== item.path));
              else Alert.alert('Eliminar', 'No se pudo eliminar');
            } catch (e: any) {
              const msg = String(e?.message || '');
              if (msg.includes('403')) Alert.alert('Sin permisos', 'No puedes eliminar archivos.');
              else Alert.alert('Eliminar', e?.message ?? 'Error eliminando archivo');
            }
          }
        }
      ],
      { cancelable: true }
    );
  }, [archivosApi, isAdmin]);

  // Búsqueda en memoria
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivos;
    return archivos.filter(a =>
      a.nombreOriginal.toLowerCase().includes(q) ||
      (a.area ?? '').toLowerCase().includes(q),
    );
  }, [archivos, query]);

  // Agrupar por área y ordenar por fecha desc
  const grupos: GroupMap = useMemo(() => {
    const res: GroupMap = {};
    for (const a of filtrados) {
      const key = a.area?.trim() || 'Otros';
      (res[key] ||= []).push(a);
    }
    for (const k of Object.keys(res)) {
      res[k].sort((x, y) => {
        const fx = x.fechaSubida ?? '';
        const fy = y.fechaSubida ?? '';
        return fy.localeCompare(fx) || x.nombreOriginal.localeCompare(y.nombreOriginal);
      });
    }
    return res;
  }, [filtrados]);

  const toggleMas = (seccion: string) =>
    setExpanded(prev => ({ ...prev, [seccion]: !prev[seccion] }));

  // --- Botón cuadrado reutilizable (como en Retos) ---
  function Square({ onPress, danger = false }: { onPress?: () => void; danger?: boolean }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          width: 32, height: 32, borderRadius: 10,
          backgroundColor: danger ? c.danger : c.pill,
          alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Ionicons name={danger ? 'trash' : 'create'} size={16} color={danger ? '#fff' : c.text} />
      </Pressable>
    );
  }

  const renderRow = (item: ArchivoItem) => {
    // 👇 Mantengo tu orden ORIGINAL para que los íconos salgan bien
    const { label, bg } = pickIcon(item.contentType, item.nombreOriginal);
    return (
      <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Text style={styles.iconTxt}>{label}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>
            {item.nombreOriginal}
          </Text>
          <Text style={[styles.rowSub, { color: c.soft }]} numberOfLines={1}>
            {item.area ?? `Usuario ${item.codUsuario ?? ''}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pill, { backgroundColor: c.pill }]}
          onPress={() => abrir(item)}
          activeOpacity={0.9}
        >
          <Ionicons name="download" size={16} color={c.text} />
          <Text style={[styles.pillTxt, { color: c.text }]}>Descargar</Text>
        </TouchableOpacity>

        {isAdmin && <Square onPress={() => borrar(item)} danger />}
      </View>
    );
  };

  const renderSection = (title: string, items: ArchivoItem[]) => {
    const isOpen = expanded[title] ?? false;
    const slice = isOpen ? items : items.slice(0, INITIAL_SHOWN);
    return (
      <View style={[styles.sectionWrap, { backgroundColor: c.section, borderColor: c.sectionAccent }]}>
        <Text style={[styles.sectionTitle, { backgroundColor: c.sectionAccent, color: c.text }]}>
          {title}
        </Text>

        {slice.map((it) => (
          <View key={`${title}-${it.path}`} style={styles.rowWrap}>
            {renderRow(it)}
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

  const sectionEntries = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));

  if (authLoading) {
    return (
      <FadeWrapper>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: colors.text }}>Verificando sesión…</Text>
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
            placeholder="Buscar un reporte"
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

        {/* Secciones */}
        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: c.soft }}>Cargando…</Text>
          </View>
        ) : sectionEntries.length === 0 ? (
          <View style={{ paddingVertical: 24 }}>
            <Text style={{ textAlign: 'center', color: c.soft }}>Sin archivos</Text>
          </View>
        ) : (
          <FlatList
            data={sectionEntries}
            keyExtractor={([name]) => name}
            renderItem={({ item: [name, items] }) => renderSection(name, items)}
            contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </FadeWrapper>
  );
}

/** Icono simple por tipo (extensión > mime) — TU FIRMA ORIGINAL (mime, name) */
function pickIcon(mime: string, name: string) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const lower = (mime || '').toLowerCase();

  if (['pdf'].includes(ext)) return { label: 'PDF', bg: '#e74c3c' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'XLS', bg: '#27ae60' };
  if (['doc', 'docx'].includes(ext)) return { label: 'DOC', bg: '#2980b9' };
  if (['ppt', 'pptx'].includes(ext)) return { label: 'PPT', bg: '#e67e22' };
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { label: 'IMG', bg: '#8e44ad' };
  if (['zip','rar','7z'].includes(ext)) return { label: 'ZIP', bg: '#2c3e50' };
  if (['txt','md','log'].includes(ext)) return { label: 'TXT', bg: '#16a085' };

  if (lower.includes('pdf')) return { label: 'PDF', bg: '#e74c3c' };
  if (lower.includes('sheet') || lower.includes('excel')) return { label: 'XLS', bg: '#27ae60' };
  if (lower.includes('word') || lower.includes('msword') || lower.includes('wordprocessingml')) return { label: 'DOC', bg: '#2980b9' };
  if (lower.includes('powerpoint') || lower.includes('presentationml')) return { label: 'PPT', bg: '#e67e22' };

  return { label: 'FILE', bg: '#7f8c8d' };
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
  pageTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8 },

  // Buscador dark
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
