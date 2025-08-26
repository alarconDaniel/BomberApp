// screens/ReportesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert,
  useColorScheme, ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import FadeWrapper from '../../components/FadeWrapper';
import HeaderOperario from '../../components/HeaderOperario';

// ⬇️ usa el contexto y el factory existente
import { useAuth } from '../../auth/AuthContext';
import { makeArchivosApi, type ArchivoItem } from '../../config/archivos/archivo';

type GroupMap = Record<string, ArchivoItem[]>;
const FOOTER_HEIGHT = 56;
const INITIAL_SHOWN = 3;

export default function ReportesScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const c = {
    bg: dark ? '#0f0f10' : '#f2f2f2',
    card: dark ? '#1b1c1f' : '#e6e6e6',
    section: dark ? '#232428' : '#dcdcdc',
    text: dark ? '#f5f5f5' : '#111',
    soft: '#9aa0a6',
    border: dark ? '#36373b' : '#cfcfcf',
    pill: dark ? '#3a3b40' : '#cfcfcf',
  };

  // API de archivos con fetchJson (que ya mete Authorization: Bearer) + baseUrl
  const { fetchJson, baseUrl } = useAuth();
  const archivosApi = useMemo(() => makeArchivosApi(fetchJson, baseUrl), [fetchJson, baseUrl]);

  const [query, setQuery] = useState('');
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      // Soporta ambas formas: {items,total} o {rows,total}
      const resp = await archivosApi.listarArchivos({ take: 100, skip: 0 });
      const items = (resp as any).items ?? (resp as any).rows ?? [];
      const t = (resp as any).total ?? items.length;
      setArchivos(items);
      setTotal(t);
    } catch (e: any) {
      console.log('🛑 Error listando archivos:', e?.message);
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  }, [archivosApi]);

  useEffect(() => { cargar(); }, [cargar]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await cargar();
    } finally {
      setRefreshing(false);
    }
  }, [cargar]);

  const abrir = useCallback(async (item: ArchivoItem) => {
    try {
      const url = await archivosApi.obtenerUrlDescarga(item.path);
      if (!url) return Alert.alert('Descarga', 'No se pudo obtener la URL de descarga');

      // En Android, canOpenURL puede devolver false para http(s) sin intent-filter; abrimos directo
      const can = await Linking.canOpenURL(url).catch(() => false);
      if (!can) {
        await Linking.openURL(url);
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Descarga', e?.message ?? 'No se pudo abrir el archivo');
    }
  }, [archivosApi]);

  const borrar = useCallback((item: ArchivoItem) => {
    if (item.codUsuario == null) {
      Alert.alert('Eliminar', 'No se puede eliminar: falta el propietario del archivo.');
      return;
    }
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
              if (ok) {
                setArchivos(prev => prev.filter(a => a.path !== item.path));
                setTotal(t => Math.max(0, t - 1));
              } else {
                Alert.alert('Eliminar', 'No se pudo eliminar');
              }
            } catch (e: any) {
              Alert.alert('Eliminar', e?.message ?? 'Error eliminando archivo');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [archivosApi]);

  // Búsqueda en memoria
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivos;
    return archivos.filter(a =>
      a.nombreOriginal.toLowerCase().includes(q) ||
      (a.area ?? '').toLowerCase().includes(q),
    );
  }, [archivos, query]);

  // Agrupar por área (o “Otros”) y ordenar por fecha desc
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

  const renderRow = (item: ArchivoItem) => {
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

        <TouchableOpacity style={[styles.pill, { backgroundColor: c.pill }]} onPress={() => abrir(item)}>
          <Text style={styles.pillTxt}>Ver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.close} onPress={() => borrar(item)}>
          <Text style={styles.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSection = (title: string, items: ArchivoItem[]) => {
    const isOpen = expanded[title] ?? false;
    const slice = isOpen ? items : items.slice(0, INITIAL_SHOWN);
    return (
      <View style={[styles.sectionWrap, { backgroundColor: c.section, borderColor: '#7aa3ff' }]}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {slice.map((it) => (
          <View key={`${title}-${it.path}`} style={styles.rowWrap}>
            {renderRow(it)}
          </View>
        ))}

        {items.length > INITIAL_SHOWN && (
          <TouchableOpacity style={[styles.moreBtn, { backgroundColor: '#cfcfcf' }]} onPress={() => toggleMas(title)}>
            <Text style={styles.moreTxt}>{isOpen ? 'Menos' : 'Más'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const sectionEntries = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));

  return (
    <FadeWrapper>
      <HeaderOperario />
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Text style={[styles.pageTitle, { color: c.text }]}>REPORTES</Text>

        {/* Buscador */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: c.text }]}
            placeholder="Buscar un reporte"
            placeholderTextColor="#9d9d9d"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        <View style={{ height: 10 }} />

        {/* Listado por secciones */}
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
          />
        )}
      </View>
    </FadeWrapper>
  );
}

/** Icono simple por tipo (extensión > mime) */
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
  if (lower.includes('word')) return { label: 'DOC', bg: '#2980b9' };
  if (lower.includes('powerpoint')) return { label: 'PPT', bg: '#e67e22' };

  return { label: 'FILE', bg: '#7f8c8d' };
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
  pageTitle: {
    fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#dedede',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
  },
  searchIcon: { marginRight: 6, color: '#777' },
  searchInput: { flex: 1, paddingVertical: 4 },

  sectionWrap: { borderRadius: 10, padding: 8, marginBottom: 14, borderWidth: 2 },
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: '#ffffff', backgroundColor: '#7aa3ff',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6,
  },

  rowWrap: { marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  icon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },

  rowTitle: { fontWeight: '700' },
  rowSub: { fontSize: 12 },

  pill: { marginHorizontal: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100 },
  pillTxt: { color: '#555', fontWeight: '700' },

  close: {
    width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d9d9d9',
  },
  closeTxt: { color: '#333', fontWeight: '700' },

  moreBtn: { alignSelf: 'center', marginTop: 6, paddingHorizontal: 30, paddingVertical: 6, borderRadius: 100 },
  moreTxt: { color: '#6b6b6b', fontWeight: '800' },
});
