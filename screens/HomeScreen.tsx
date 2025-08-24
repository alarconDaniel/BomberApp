import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { BarChart } from 'react-native-chart-kit';

import HeaderOperario from '../components/HeaderOperario';
import FadeWrapper from '../components/FadeWrapper';
import { colors } from '../styles/globalStyles1';
import { API } from '../config/api';

const FOOTER_HEIGHT = 64;

// ====== TIPOS FLEXIBLES (nos adaptamos al backend) ======
type ReportRaw = any;
type Report = {
  id: string | number;
  fechaISO: string;   // YYYY-MM-DD (normalizado)
  estado: string;     // ej. 'completado' | 'pendiente' | ...
  titulo?: string;
};

// Normaliza lo que venga del backend
function normalizeReport(x: ReportRaw): Report | null {
  const fecha =
    x?.fecha ??
    x?.fecha_reporte ??
    x?.createdAt ??
    x?.created_at ??
    x?.fechaReporte ??
    null;

  const id =
    x?.id ?? x?.codReporte ?? x?.cod_reporte ?? x?.codigo ?? null;

  const estado =
    (x?.estado ?? x?.status ?? x?.estado_reporte ?? '').toString().toLowerCase();

  if (!fecha || !id) return null;

  // recortamos a YYYY-MM-DD
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return null;
  const fechaISO = d.toISOString().slice(0, 10);

  return {
    id,
    fechaISO,
    estado,
    titulo: x?.titulo ?? x?.asunto ?? x?.descripcion ?? undefined,
  };
}

export default function HomeScreen() {
  const [nombreUsuario, setNombreUsuario] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [reportesMes, setReportesMes] = useState<Report[]>([]);

  // animación suave
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  // Carga nombre guardado en el login
  useEffect(() => {
    (async () => {
      try {
        const n = await SecureStore.getItemAsync('user_name');
        setNombreUsuario(n ?? null);
      } catch {}
    })();
  }, []);

  // Carga datos del mes
  useEffect(() => {
    fetchEstadisticasMes();
  }, []);

  const fetchEstadisticasMes = async () => {
    try {
      setLoading(true);

      // Si tu API tiene endpoint dedicado, úsalo aquí:
      // const res = await fetch(API.reporte.statsMes); // <- ajusta si existe
      // const json = await res.json();

      // Plan B (genérico): listamos reportes y filtramos el mes actual
      const res = await fetch(API.reporte?.listar ?? API.reportes?.listar ?? '');
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);

      let data: any;
      try { data = JSON.parse(txt); } catch { data = []; }

      const arr = (Array.isArray(data) ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.reportes) ? data.reportes
        : []) as ReportRaw[];

      const norm = arr.map(normalizeReport).filter(Boolean) as Report[];

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth(); // 0..11
      const filtered = norm.filter(r => {
        const d = new Date(r.fechaISO);
        return d.getFullYear() === y && d.getMonth() === m;
      });

      setReportesMes(filtered);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No pudimos cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const { total, completados, pendientes } = useMemo(() => {
    const total = reportesMes.length;
    const completados = reportesMes.filter(r => r.estado.includes('complet') || r.estado === 'cerrado').length;
    const pendientes = reportesMes.filter(r => r.estado.includes('pend') || r.estado === 'abierto').length;
    return { total, completados, pendientes };
  }, [reportesMes]);

  // Serie por día (gráfica)
  const chartData = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const counts = Array(daysInMonth).fill(0);
    reportesMes.forEach(r => {
      const d = new Date(r.fechaISO);
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < daysInMonth) counts[idx]++;
    });

    const labels = counts.map((_, i) => (i + 1).toString());
    // Para no saturar el eje X, solo mostramos 1 de cada 3 labels
    const shownLabels = labels.map((l, i) => (i % 3 === 0 ? l : ''));

    return {
      labels: shownLabels,
      datasets: [{ data: counts }],
    };
  }, [reportesMes]);

  const exportarExcel = async () => {
    try {
      if (reportesMes.length === 0) {
        Alert.alert('Sin datos', 'No hay reportes del mes para exportar.');
        return;
      }

      // Generamos workbook
      const XLSX = await import('xlsx'); // carga perezosa
      const rows = reportesMes.map(r => ({
        ID: r.id,
        Fecha: r.fechaISO,
        Estado: r.estado,
        Titulo: r.titulo ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ReportesMes');

      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const now = new Date();
      const filename = `reportes_${now.getFullYear()}_${now.getMonth() + 1}.xlsx`;
      const uri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(uri, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar reportes',
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo exportar el Excel');
    }
  };

  const screenW = Dimensions.get('window').width;

  return (
    <FadeWrapper>
      <SafeAreaView style={styles.container}>
        <HeaderOperario />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + 16 }]}
        >
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <Text style={styles.title}>
              ¡Bienvenido{nombreUsuario ? `, ${nombreUsuario}` : ''}!
            </Text>

            {/* KPIs */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={styles.kpiNumber}>{total}</Text>
                <Text style={styles.kpiLabel}>Reportes del mes</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={styles.kpiNumber}>{completados}</Text>
                <Text style={styles.kpiLabel}>Completados</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={styles.kpiNumber}>{pendientes}</Text>
                <Text style={styles.kpiLabel}>Pendientes</Text>
              </View>
            </View>

            {/* Gráfica */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reportes por día</Text>

              {loading ? (
                <View style={styles.chartCard}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={styles.chartCard}>
                  <BarChart
                    width={screenW - 32}
                    height={220}
                    data={chartData}
                    fromZero
                    showValuesOnTopOfBars={false}
                    chartConfig={{
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: () => colors.blue,
                      labelColor: () => '#6B7280',
                      barPercentage: 0.6,
                      propsForLabels: { fontSize: 10 },
                      propsForBackgroundLines: { stroke: '#E5E7EB' },
                    }}
                    style={{ borderRadius: 12 }}
                  />
                </View>
              )}
            </View>

            {/* CTA exportar */}
            <View style={styles.section}>
              <TouchableOpacity style={styles.exportBtn} onPress={exportarExcel} disabled={loading}>
                <Text style={styles.exportTxt}>Exportar a Excel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------------- estilos (usa tu paleta legacy) ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },

  section: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.red },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  kpiNumber: { fontSize: 22, fontWeight: '900', color: '#111827' },
  kpiLabel: { marginTop: 2, color: '#4B5563', fontWeight: '600' },

  chartCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportBtn: {
    backgroundColor: colors.blue,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportTxt: { color: colors.white, fontWeight: '800' },
});
