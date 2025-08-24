// screens/ReportesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, useColorScheme,
} from 'react-native';
import * as Linking from 'expo-linking';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import {
  listarArchivos,
  obtenerUrlDescarga,
  eliminarArchivo,
  type ArchivoItem,
} from './archivos/archivos';

type GroupMap = Record<string, ArchivoItem[]>;

const FOOTER_HEIGHT = 56;
const INITIAL_SHOWN = 3;

export default function ReportesScreen() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  // paleta neutral como tu mock (fondo claro)
  const c = {
    bg: dark ? '#0f0f10' : '#f2f2f2',
    card: dark ? '#1b1c1f' : '#e6e6e6',
    section: dark ? '#232428' : '#dcdcdc',
    text: dark ? '#111' : '#111',
    textInv: '#fff',
    soft: '#777',
    border: dark ? '#36373b' : '#cfcfcf',
    chip: dark ? '#2a2b2f' : '#d7d7d7',
    pill: dark ? '#3a3b40' : '#cfcfcf',
  };

  const [query, setQuery] = useState('');
  const [archivos, setArchivos] = useState<ArchivoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const codUsuario = 1; // TODO: toma del contexto/auth

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { items, total } = await listarArchivos({ take: 100, skip: 0, codUsuario });
      setArchivos(items);
      setTotal(total);
    } catch (e: any) {
      console.log('🛑 Error listando archivos:', e?.message);
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  }, [codUsuario]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = useCallback(async (item: ArchivoItem) => {
    try {
      const url = await obtenerUrlDescarga(item.path);
      if (url) await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Descarga', e?.message ?? 'No se pudo obtener la URL de descarga');
    }
  }, []);

  const borrar = useCallback(async (item: ArchivoItem) => {
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
              const ok = await eliminarArchivo(item.path, codUsuario);
              if (ok) setArchivos(prev => prev.filter(a => a.path !== item.path));
              else Alert.alert('Eliminar', 'No se pudo eliminar');
            } catch (e: any) {
              Alert.alert('Eliminar', e?.message ?? 'Error eliminando archivo');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [codUsuario]);

  // Búsqueda
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archivos;
    return archivos.filter(a =>
      a.nombreOriginal.toLowerCase().includes(q) ||
      (a.area ?? '').toLowerCase().includes(q),
    );
  }, [archivos, query]);

  // Agrupar por area (o “Otros”)
  const grupos: GroupMap = useMemo(() => {
    const res: GroupMap = {};
    for (const a of filtrados) {
      const key = a.area?.trim() || 'Otros';
      (res[key] ||= []).push(a);
    }
    // orden opcional por nombre
    for (const k of Object.keys(res)) {
      res[k].sort((x, y) => x.nombreOriginal.localeCompare(y.nombreOriginal));
    }
    return res;
  }, [filtrados]);

  const toggleMas = (seccion: string) =>
    setExpanded(prev => ({ ...prev, [seccion]: !prev[seccion] }));

  // --- Render de un item tipo “tarjeta” como el mock ---
  const renderRow = (item: ArchivoItem) => {
    const { label, bg, fg } = pickIcon(item.contentType, item.nombreOriginal);
    return (
      <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Text style={[styles.iconTxt]}>{label}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.nombreOriginal}</Text>
          {/* Autor: no lo tenemos en BD; muestro área o codUsuario como subtítulo */}
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

  // --- Render de sección (Mantenimiento / Supervisión / Otros) ---
  const renderSection = (title: string, items: ArchivoItem[]) => {
    const isOpen = expanded[title] ?? false;
    const slice = isOpen ? items : items.slice(0, INITIAL_SHOWN);
    return (
      <View style={[styles.sectionWrap, { backgroundColor: c.section, borderColor: '#7aa3ff' }]}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {slice.map((it) => (
          <View key={it.path} style={styles.rowWrap}>
            {renderRow(it)}
          </View>
        ))}

        {items.length > INITIAL_SHOWN && (
          <TouchableOpacity style={[styles.moreBtn, { backgroundColor: '#cfcfcf' }]} onPress={() => toggleMas(title)}>
            <Text style={styles.moreTxt}>{isOpen ? 'Menos' : 'Mas'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Secciones en orden alphabético como el mock
  const sectionEntries = Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b));

  return (
    <FadeWrapper>
      <HeaderOperario />
      <View style={styles.container}>
        <Text style={styles.pageTitle}>REPORTES</Text>

        {/* Buscador */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar un reporte"
            placeholderTextColor="#9d9d9d"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={{ height: 10 }} />

        {/* Listado por secciones */}
        {sectionEntries.length === 0 ? (
          <View style={{ paddingVertical: 24 }}>
            <Text style={{ textAlign: 'center', color: '#777' }}>
              {loading ? '' : 'Sin archivos'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={sectionEntries}
            keyExtractor={([name]) => name}
            renderItem={({ item: [name, items] }) => renderSection(name, items)}
            contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT }}
          />
        )}
      </View>
    </FadeWrapper>
  );
}

/** Icono simple por tipo */
function pickIcon(mime: string, name: string) {
  const lower = (mime || '').toLowerCase();
  const ext = (name.split('.').pop() || '').toLowerCase();

  if (lower.includes('pdf') || ext === 'pdf') {
    return { label: 'PDF', bg: '#e74c3c', fg: '#fff' };
  }
  if (lower.includes('sheet') || lower.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return { label: 'XLS', bg: '#27ae60', fg: '#fff' };
  }
  if (lower.includes('word') || ['doc', 'docx'].includes(ext)) {
    return { label: 'DOC', bg: '#2980b9', fg: '#fff' };
  }
  if (lower.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) {
    return { label: 'PPT', bg: '#e67e22', fg: '#fff' };
  }
  return { label: 'FILE', bg: '#7f8c8d', fg: '#fff' };
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 8 },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#111',
    letterSpacing: 1,
    marginBottom: 8,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dedede',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchIcon: { marginRight: 6, color: '#777' },
  searchInput: { flex: 1, color: '#111', paddingVertical: 4 },

  sectionWrap: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 14,
    borderWidth: 2, // borde azul como tu mock
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: '#7aa3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },

  rowWrap: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },

  rowTitle: { fontWeight: '700', color: '#111' },
  rowSub: { fontSize: 12 },

  pill: {
    marginHorizontal: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pillTxt: { color: '#555', fontWeight: '700' },

  close: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9d9d9',
  },
  closeTxt: { color: '#333', fontWeight: '700' },

  moreBtn: {
    alignSelf: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
    paddingVertical: 6,
    borderRadius: 100,
  },
  moreTxt: { color: '#6b6b6b', fontWeight: '800' },
});
