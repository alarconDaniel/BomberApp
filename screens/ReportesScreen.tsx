// screens/ReportesScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import { colors } from '../styles/globalStyles1';
import {
  listarArchivos,
  obtenerUrlDescarga,
  eliminarArchivo,
} from './archivos/archivos';
import * as Linking from 'expo-linking';

const FOOTER_HEIGHT = 64;

type Archivo = {
  nombreOriginal: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  fechaSubida: string;
};

export default function ReportesScreen() {
  const [query, setQuery] = useState('');
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      // 👇 Admin: trae TODOS (no envía codUsuario)
      const data = await listarArchivos({ admin: true, take: 100, skip: 0 });
      setArchivos(data.rows ?? []);
    } catch (e: any) {
      console.log('🛑 Error listando archivos:', e?.message);
      setArchivos([]);
      Alert.alert('Error', `No se pudo listar los archivos.\n${e?.message ?? ''}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Agrupa visualmente: PDFs -> “Mantenimiento”; otros -> “Supervisión”
  const { mant, sup } = useMemo(() => {
    const filtra = (arr: Archivo[]) =>
      arr.filter(a => a.nombreOriginal.toLowerCase().includes(query.toLowerCase()));

    const _mant = archivos.filter(a => getExt(a.nombreOriginal) === 'PDF');
    const _sup  = archivos.filter(a => getExt(a.nombreOriginal) !== 'PDF');

    return { mant: filtra(_mant), sup: filtra(_sup) };
  }, [archivos, query]);

  return (
    <FadeWrapper>
      <SafeAreaView style={styles.container}>
        <HeaderOperario />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + 20 }}
        >
          <Text style={styles.title}>REPORTES</Text>

          {/* Buscador */}
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar un reporte"
              placeholderTextColor="#9aa4ad"
              style={styles.searchInput}
            />
          </View>

          {/* Acciones: solo refrescar (botón pequeño) */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, gap: 8 }}>
            <TinyBtn text={loading ? 'Act…' : 'Refrescar'} onPress={cargar} />
          </View>

          {/* Sección Mantenimiento */}
          <Section title="Mantenimiento">
            <FlatList
              data={mant}
              keyExtractor={(i) => i.path}
              renderItem={({ item }) => (
                <ReportItem
                  item={item}
                  onVer={() => handleVer(item)}
                  onEliminar={() => handleEliminar(item, cargar)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              scrollEnabled={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 8 }}>
                  {archivos.length === 0 ? 'No hay archivos.' : 'Sin PDFs por ahora.'}
                </Text>
              }
            />
            <TinyLink text="Más" onPress={() => {}} />
          </Section>

          {/* Sección Supervisión */}
          <Section title="Supervisión">
            <FlatList
              data={sup}
              keyExtractor={(i) => i.path}
              renderItem={({ item }) => (
                <ReportItem
                  item={item}
                  onVer={() => handleVer(item)}
                  onEliminar={() => handleEliminar(item, cargar)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              scrollEnabled={false}
              contentContainerStyle={{ paddingVertical: 6 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 8 }}>
                  {archivos.length === 0 ? 'No hay archivos.' : 'Sin archivos para esta sección.'}
                </Text>
              }
            />
            <TinyLink text="Más" onPress={() => {}} />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------------- Subcomponentes ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function ReportItem({
  item,
  onVer,
  onEliminar,
}: {
  item: Archivo;
  onVer: () => void;
  onEliminar: () => void;
}) {
  const type = mapType(getExt(item.nombreOriginal));
  return (
    <View style={itemStyles.card}>
      <View style={[itemStyles.icon, { backgroundColor: type.bg, borderColor: type.border }]}>
        <Text style={itemStyles.iconLabel}>{type.label}</Text>
      </View>

      <View style={itemStyles.info}>
        <Text numberOfLines={1} style={itemStyles.name}>
          {item.nombreOriginal}
        </Text>
        <Text style={itemStyles.meta}>
          {(item.sizeBytes / 1024).toFixed(1)} KB • {new Date(item.fechaSubida).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity style={itemStyles.viewBtn} activeOpacity={0.9} onPress={onVer}>
        <Text style={itemStyles.viewText}>Ver</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[itemStyles.viewBtn, { backgroundColor: '#FCE4EC', marginLeft: 6 }]}
        activeOpacity={0.9}
        onPress={onEliminar}
      >
        <Text style={[itemStyles.viewText, { color: '#C2185B' }]}>X</Text>
      </TouchableOpacity>
    </View>
  );
}

/* Botón pequeño y link pequeño (discretos) */
function TinyBtn({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#D7DBDF',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#C9CED3',
        minWidth: 64,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{text}</Text>
    </TouchableOpacity>
  );
}

function TinyLink({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignSelf: 'flex-end', paddingTop: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1f6feb' }}>{text}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- Handlers ---------------- */

async function handleVer(item: Archivo) {
  try {
    const { url } = await obtenerUrlDescarga(item.path);
    await Linking.openURL(url);
  } catch (e: any) {
    Alert.alert('Error', 'No se pudo abrir el archivo.');
  }
}

async function handleEliminar(item: Archivo, recargar: () => Promise<void>) {
  Alert.alert('Eliminar', '¿Deseas eliminar este archivo?', [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Eliminar',
      style: 'destructive',
      onPress: async () => {
        try {
          await eliminarArchivo({ codUsuario: 1, path: item.path });
          await recargar();
        } catch (e: any) {
          Alert.alert('Error', 'No se pudo eliminar el archivo.');
        }
      },
    },
  ]);
}

/* ---------------- Helpers UI ---------------- */

function getExt(name: string) {
  const parts = name.split('.');
  return (parts.length > 1 ? parts.pop()! : '?').toUpperCase();
}

function mapType(ext: string) {
  switch (ext) {
    case 'PDF': return { label: 'PDF', bg: '#EF5350', border: '#C62828' };
    case 'XLS':
    case 'XLSX':
    case 'CSV': return { label: 'XLS', bg: '#66BB6A', border: '#2E7D32' };
    case 'DOC':
    case 'DOCX': return { label: 'W', bg: '#42A5F5', border: '#1565C0' };
    case 'PPT':
    case 'PPTX': return { label: 'PPT', bg: '#FFA726', border: '#EF6C00' };
    default: return { label: '?', bg: '#BDBDBD', border: '#9E9E9E' };
  }
}

/* ---------------- Estilos ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: colors.navy,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  searchWrap: {
    marginHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#E6E9ED',
    marginBottom: 8,
  },
  searchInput: { height: 36, paddingHorizontal: 12, color: '#1F2937' },
});

const sectionStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  title: {
    backgroundColor: '#D0D3D6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    fontWeight: '900',
    color: colors.navy,
  },
  body: {
    backgroundColor: '#ECEDEE',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});

const itemStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D5DADE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 34, height: 34,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconLabel: { fontWeight: '900', color: colors.white, fontSize: 12 },
  info: { flex: 1, paddingRight: 8 },
  name: { fontWeight: '800', color: '#2A2A2A' },
  meta: { fontSize: 12, color: '#6B7280' },
  // 🔻 Botones más pequeños
  viewBtn: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#D0D3D6',
    justifyContent: 'center',
  },
  viewText: { fontWeight: '800', color: colors.navy, fontSize: 12 },
});
