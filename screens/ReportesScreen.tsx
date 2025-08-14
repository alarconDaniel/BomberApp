// screens/ReportesScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import FadeWrapper from '../components/FadeWrapper';
import HeaderOperario from '../components/HeaderOperario';
import FooterOperario from '../components/FooterOperario';
import { colors } from '../styles/globalStyles1';

const FOOTER_HEIGHT = 64;

type FileType = 'pdf' | 'xls' | 'doc' | 'ppt';
type Report = {
  id: string;
  name: string;         // con extensión para mostrar
  author: string;
  type: FileType;
};

const MANTENIMIENTO: Report[] = [
  { id: 'm1', name: 'ManualGrúa.pdf', author: 'Daniel Andres Ulloa', type: 'pdf' },
  { id: 'm2', name: 'ManualAeroimpresor.pdf', author: 'Luis Carlos Perez', type: 'pdf' },
  { id: 'm3', name: 'ManualEscalera.pdf', author: 'Juan Andres Silva', type: 'pdf' },
];

const SUPERVISION: Report[] = [
  { id: 's1', name: 'inventario.xls', author: 'Daniel Andres Ulloa', type: 'xls' },
  { id: 's2', name: 'importancia_epp.docx', author: 'Luis Carlos Perez', type: 'doc' },
  { id: 's3', name: 'EPP.ppt', author: 'Juan Andres Silva', type: 'ppt' },
];

export default function ReportesScreen() {
  const [query, setQuery] = useState('');

  const mantFiltered = useMemo(
    () => MANTENIMIENTO.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );
  const supFiltered = useMemo(
    () => SUPERVISION.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

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

          {/* Sección Mantenimiento */}
          <Section title="Mantenimiento">
            <FlatList
              data={mantFiltered}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <ReportItem item={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
            <RoundedBtn text="Más" onPress={() => {}} />
          </Section>

          {/* Sección Supervisión */}
          <Section title="Supervisión">
            <FlatList
              data={supFiltered}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => <ReportItem item={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
            <RoundedBtn text="Más" onPress={() => {}} />
          </Section>
        </ScrollView>

        {/* Footer fijo */}
        
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------------- Subcomponentes ---------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function ReportItem({ item }: { item: Report }) {
  const accent = getTypeColor(item.type);
  const logo = getTypeLabel(item.type);

  return (
    <View style={itemStyles.card}>
      {/* Icono de tipo (cuadro con etiqueta) */}
      <View style={[itemStyles.icon, { backgroundColor: accent.bg, borderColor: accent.border }]}>
        <Text style={itemStyles.iconLabel}>{logo}</Text>
      </View>

      {/* Info */}
      <View style={itemStyles.info}>
        <Text numberOfLines={1} style={itemStyles.name}>
          {item.name}
        </Text>
        <Text style={itemStyles.author}>{item.author}</Text>
      </View>

      {/* Botón Ver */}
      <TouchableOpacity style={itemStyles.viewBtn} activeOpacity={0.9} onPress={() => {}}>
        <Text style={itemStyles.viewText}>Ver</Text>
      </TouchableOpacity>

      {/* Dos cuadraditos */}
      <View style={itemStyles.squares}>
        <View style={itemStyles.square} />
        <View style={itemStyles.square} />
      </View>
    </View>
  );
}

function RoundedBtn({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={roundedStyles.btn}>
      <Text style={roundedStyles.text}>{text}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- Helpers ---------------- */

function getTypeColor(type: FileType) {
  switch (type) {
    case 'pdf':
      return { bg: '#EF5350', border: '#C62828' }; // rojo
    case 'xls':
      return { bg: '#66BB6A', border: '#2E7D32' }; // verde
    case 'doc':
      return { bg: '#42A5F5', border: '#1565C0' }; // azul
    case 'ppt':
      return { bg: '#FFA726', border: '#EF6C00' }; // naranja
    default:
      return { bg: '#BDBDBD', border: '#9E9E9E' };
  }
}
function getTypeLabel(type: FileType) {
  if (type === 'pdf') return 'PDF';
  if (type === 'xls') return 'XLS';
  if (type === 'doc') return 'W';
  if (type === 'ppt') return 'PPT';
  return '?';
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

  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: FOOTER_HEIGHT,
    backgroundColor: colors.white,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
});

const sectionStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 10 },
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
  author: { fontSize: 12, color: '#6B7280' },

  viewBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#D0D3D6',
    justifyContent: 'center',
    marginRight: 8,
  },
  viewText: { fontWeight: '800', color: colors.navy },

  squares: { flexDirection: 'row', gap: 6 },
  square: { width: 22, height: 22, backgroundColor: '#B0B0B0', borderRadius: 6 },
});

const roundedStyles = StyleSheet.create({
  btn: {
    alignSelf: 'center',
    marginTop: 6,
    height: 30,
    paddingHorizontal: 18,
    backgroundColor: '#D0D3D6',
    borderRadius: 16,
    justifyContent: 'center',
  },
  text: { fontWeight: '800', color: colors.navy },
});
