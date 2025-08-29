import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

/* ===== Tipos ===== */
type OperarioStat = { id: string; nombre: string; retosCompletados: number; reportesSubidos: boolean };
type RetoItem = { id: string; titulo: string };
type ReporteItem = { id: string; titulo: string };
type DiaData = { operarios: OperarioStat[]; retos: RetoItem[]; reportes: ReporteItem[] };

/* ===== Fechas fijas ===== */
const FECHAS = ['2025-08-29', '2025-08-30', '2025-08-31'];
const FECHAS_NUM = [29, 30, 31];

/* ===== Datos quemados ===== */
const baseOps = [
  'Ana Rojas','Bruno Díaz','Carmen López','Diego Fernández','Elena Salas',
  'Fabio Castillo','Gabriela Torres','Hugo Medina','Irene Valdez','Jorge Pinto'
];
const retosCatalog = [
  'Chequeo de extintores','Inspección de mangueras','Uso de EPP en taller',
  'Señalización de rutas','Simulacro de evacuación','Revisión de arneses',
  'Control de derrames','Bloqueo y etiquetado','Manejo de residuos','Verificación de alarmas'
];
const reportesCatalog = [
  'Acta Extintores.pdf','Checklist Mangueras.docx','Informe EPP.xlsx',
  'Plano Rutas.pdf','Bitácora Simulacro.docx','Registro Arneses.xlsx',
  'Reporte Derrames.pdf','LOTO Semana.docx','Residuos Mensual.xlsx','Prueba Alarmas.pdf'
];

function mkDia(seed: number): DiaData {
  const operarios: OperarioStat[] = baseOps.map((n, i) => ({
    id: `op-${seed}-${i}`,
    nombre: n,
    retosCompletados: ((i + seed) % 5) + 1,
    reportesSubidos: ((i + seed) % 2) === 0,
  }));
  const retos: RetoItem[] = retosCatalog.map((t, i) => ({ id: `re-${seed}-${i}`, titulo: t }));
  const reportes: ReporteItem[] = reportesCatalog.map((t, i) => ({ id: `rp-${seed}-${i}`, titulo: t }));
  return { operarios, retos, reportes };
}

const DATA: Record<string, DiaData> = {
  '2025-08-29': mkDia(0),
  '2025-08-30': mkDia(1),
  '2025-08-31': mkDia(2),
};

/* ====== util para % “aleatorio” estable ====== */
function pseudoPercent(key: string) {
  // hash simple y estable 25%..95%
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const r = Math.abs(h % 71) + 25; // 25..95
  return Math.min(95, Math.max(25, r));
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [idx, setIdx] = useState(0); // 0=29, 1=30, 2=31
  const fechaKey = FECHAS[idx];
  const dia = DATA[fechaKey];
  const nombre = (user?.email || 'usuario').split('@')[0];

  const isFirst = idx === 0;
  const isLast = idx === FECHAS.length - 1;

  // --- gráfico mensual fijo ---
  const totalPersonas = 120;
  const semanas = [
    { label: 'Semana 1', value: 60 },
    { label: 'Semana 2', value: 95 },
    { label: 'Semana 3', value: 70 },
    { label: 'Semana 4', value: 85 },
  ];
  const maxBarH = 120; // px

  return (
    <SafeAreaView style={[s.container, { paddingTop: insets.top || 8 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ===== Bienvenida ===== */}
        <Text style={[g.text.h2, { marginHorizontal: 16, marginBottom: 10 }]}>
          ¡Bienvenido, {nombre}!
        </Text>

        {/* ===== Card: Personal activo (fijo mensual) ===== */}
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={[g.text.h3, { flex: 1 }]}>Personal activo en los retos</Text>
            <Text style={[g.text.h3]}>{totalPersonas} personas</Text>
          </View>

          <View style={s.chartRow}>
            {/* eje y + barras */}
            <View style={[s.chartBox, { borderColor: colors.tabBorder, backgroundColor: colors.cardTint }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18, height: maxBarH, paddingHorizontal: 6 }}>
                {semanas.map((w) => {
                  const h = (w.value / totalPersonas) * maxBarH;
                  return (
                    <View key={w.label} style={{ alignItems: 'center' }}>
                      <View style={[s.bar, { height: h, backgroundColor: colors.primary }]} />
                      <Text style={[s.chartLabel, { color: colors.mutedText }]}>{w.label.split(' ')[1]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ===== Selector de día (flechas + número) ===== */}
        <View style={s.calWrap}>
          <Pressable
            onPress={() => !isFirst && setIdx(idx - 1)}
            disabled={isFirst}
            style={[s.arrowBtn, isFirst && { opacity: 0.4 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={s.dayBadge}>
            <Text style={s.dayText}>Agosto {FECHAS_NUM[idx]}</Text>
          </View>

          <Pressable
            onPress={() => !isLast && setIdx(idx + 1)}
            disabled={isLast}
            style={[s.arrowBtn, isLast && { opacity: 0.4 }]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* ===== Operarios (tabla) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Operarios</Text>

          <View style={[s.row, { paddingVertical: 6 }]}>
            <Text style={[s.th, { flex: 1 }]}>Operario</Text>
            <Text style={[s.th, { width: 96, textAlign: 'center' }]}>Retos</Text>
            <Text style={[s.th, { width: 100, textAlign: 'center' }]}>Reportes</Text>
          </View>

          {dia.operarios.map(op => (
            <View key={op.id} style={s.row}>
              <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{op.nombre}</Text>
              <Text style={[s.td, { width: 96, textAlign: 'center' }]}>{op.retosCompletados}</Text>
              <Text
                style={[
                  s.td,
                  { width: 100, textAlign: 'center', color: op.reportesSubidos ? colors.success : colors.danger },
                ]}
              >
                {op.reportesSubidos ? 'Sí' : 'No'}
              </Text>
            </View>
          ))}
        </View>

        {/* ===== Retos del día (porcentajes) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Retos del día</Text>
          {dia.retos.map(r => {
            const pct = pseudoPercent(`${fechaKey}:${r.titulo}:reto`);
            return (
              <View key={r.id} style={s.progressRow}>
                <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{r.titulo}</Text>
                <Text style={[s.pctTxt]}>{pct}%</Text>
                <View style={[s.progress, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
                  <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* ===== Reportes del día (porcentajes) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Reportes del día</Text>
          {dia.reportes.map(r => {
            const pct = pseudoPercent(`${fechaKey}:${r.titulo}:reporte`);
            return (
              <View key={r.id} style={s.progressRow}>
                <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{r.titulo}</Text>
                <Text style={[s.pctTxt]}>{pct}%</Text>
                <View style={[s.progress, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
                  <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: colors.brandBlue ?? colors.primary }]} />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== Estilos ===== */
function getStyles(c: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },

    card: {
      marginHorizontal: 16, marginBottom: 12, padding: 12,
      borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.tabBorder,
      shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    chartRow: { flexDirection: 'row', gap: 12 },
    chartBox: {
      flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    },
    bar: {
      width: 32, borderTopLeftRadius: 6, borderTopRightRadius: 6,
    },
    chartLabel: { fontSize: 12, marginTop: 6 },

    calWrap: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    arrowBtn: {
      width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.mutedBg, borderWidth: 1, borderColor: c.outline,
    },
    dayBadge: {
      minWidth: 160, paddingHorizontal: 16, height: 46, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.tabBorder,
      shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    dayText: { fontSize: 18, fontWeight: '900', color: c.text, letterSpacing: 0.5 },

    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    th: { fontSize: 12, fontWeight: '800', color: c.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 },
    td: { fontSize: 14, color: c.text },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    pctTxt: { width: 48, textAlign: 'right', color: c.text, fontVariant: ['tabular-nums'] },
    progress: { flex: 0.9, height: 8, borderRadius: 100, overflow: 'hidden', borderWidth: 1 },
    progressFill: { height: '100%' },
  });
}
