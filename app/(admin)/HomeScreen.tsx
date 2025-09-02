// app/(admin)/(tabs)/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useFocusEffect } from 'expo-router';

import { fetchOperarioNames } from './lib/operarios';
import { fetchReporteTitles } from './lib/reportes';
import { fetchRetoTitles } from './lib/retos';
import { fetchFullNameFromUsuariosList } from './lib/perfil'; // 👈 NUEVO

/* ===== Tipos UI del dashboard ===== */
type OperarioStat = { id: string; nombre: string; retosCompletados: number; reportesSubidos: boolean };
type RetoItem = { id: string; titulo: string };
type ReporteItem = { id: string; titulo: string };
type DiaData = { operarios: OperarioStat[]; retos: RetoItem[]; reportes: ReporteItem[] };

/* ===== Fechas fijas (solo para demo de calendario) ===== */
const FECHAS = ['2025-08-29', '2025-08-30', '2025-08-31'];
const FECHAS_NUM = [29, 30, 31];

/* ===== Helpers ===== */
function pseudoPercent(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const r = Math.abs(h % 71) + 25; // 25..95
  return Math.min(95, Math.max(25, r));
}

function mkDia(seed: number, nombres: string[], reporteTitles: string[], retoTitles: string[]): DiaData {
  const operarios: OperarioStat[] = nombres.map((n, i) => ({
    id: `op-${seed}-${i}`,
    nombre: n,
    retosCompletados: ((i + seed) % 5) + 1,
    reportesSubidos: ((i + seed) % 2) === 0,
  }));

  const retos: RetoItem[] = (retoTitles || []).map((t, i) => ({ id: `re-${seed}-${i}`, titulo: t }));

  const reportes: ReporteItem[] = (reporteTitles || []).map((t, i) => ({
    id: `rp-${seed}-${i}`,
    titulo: t,
  }));

  return { operarios, retos, reportes };
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
    chartBox: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    bar: { width: 32, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
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

export default function HomeScreen() {
  const { user, fetchJson, baseUrl } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [idx, setIdx] = useState(0); // 0=29, 1=30, 2=31
  const fechaKey = FECHAS[idx];

  const [opsNames, setOpsNames] = useState<string[]>([]);
  const [opsLoading, setOpsLoading] = useState<boolean>(true);

  const [repTitles, setRepTitles] = useState<string[]>([]);
  const [repLoading, setRepLoading] = useState<boolean>(true);

  const [retoTitles, setRetoTitles] = useState<string[]>([]);
  const [retoLoading, setRetoLoading] = useState<boolean>(true);

  // 👇 Nombre y apellido mostrados
  const [fullName, setFullName] = useState<string>('Usuario');

  /** === Cargas factoricadas para reusar en focus === */
  const loadOperarios = useCallback(async () => {
    setOpsLoading(true);
    try {
      const nombres = await fetchOperarioNames(fetchJson);
      setOpsNames(nombres);
    } catch {
      setOpsNames([]);
    } finally {
      setOpsLoading(false);
    }
  }, [fetchJson]);

  const loadReportes = useCallback(async () => {
    setRepLoading(true);
    try {
      const titulos = await fetchReporteTitles(fetchJson, baseUrl);
      setRepTitles(titulos);
    } catch {
      setRepTitles([]);
    } finally {
      setRepLoading(false);
    }
  }, [fetchJson, baseUrl]);

  const loadRetos = useCallback(async () => {
    setRetoLoading(true);
    try {
      const titulos = await fetchRetoTitles(fetchJson);
      setRetoTitles(titulos);
    } catch {
      setRetoTitles([]);
    } finally {
      setRetoLoading(false);
    }
  }, [fetchJson]);

  const loadFullName = useCallback(async () => {
    try {
      const name = await fetchFullNameFromUsuariosList(fetchJson, user);
      setFullName(name);
    } catch {
      // deja el valor anterior
    }
  }, [fetchJson, user]);

  /** === Montaje inicial === */
  useEffect(() => { loadOperarios(); }, [loadOperarios]);
  useEffect(() => { loadReportes(); }, [loadReportes]);
  useEffect(() => { loadRetos(); }, [loadRetos]);
  useEffect(() => { loadFullName(); }, [loadFullName]); // 👈 carga el nombre

  /** === Re-carga cuando la pestaña vuelve a foco === */
  useFocusEffect(
    useCallback(() => {
      loadOperarios();
      loadReportes();
      loadRetos();
      loadFullName(); // 👈 refresca nombre también
      return () => {};
    }, [loadOperarios, loadReportes, loadRetos, loadFullName])
  );

  // construye datos del día con listas reales
  const dia = useMemo(
    () => mkDia(idx, opsNames, repTitles, retoTitles),
    [idx, opsNames, repTitles, retoTitles]
  );

  const isFirst = idx === 0;
  const isLast = idx === FECHAS.length - 1;

  // gráfico mensual (fijo)
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
          ¡Bienvenido, {fullName}!
        </Text>

        {/* ===== Card: Personal activo (fijo mensual) ===== */}
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={[g.text.h3, { flex: 1 }]}>Personal activo en los retos</Text>
            <Text style={[g.text.h3]}>{totalPersonas} personas</Text>
          </View>

          <View style={s.chartRow}>
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

        {/* ===== Selector de día ===== */}
        <View style={s.calWrap}>
          <Pressable onPress={() => !isFirst && setIdx(idx - 1)} disabled={isFirst} style={[s.arrowBtn, isFirst && { opacity: 0.4 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={s.dayBadge}>
            <Text style={s.dayText}>Agosto {FECHAS_NUM[idx]}</Text>
          </View>

          <Pressable onPress={() => !isLast && setIdx(idx + 1)} disabled={isLast} style={[s.arrowBtn, isLast && { opacity: 0.4 }]}>
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

          {opsLoading && (
            <Text style={[s.td, { marginTop: 6, color: colors.mutedText }]}>
              Cargando operarios (rol 2)…
            </Text>
          )}

          {!opsLoading && dia.operarios.length === 0 && (
            <Text style={[s.td, { marginTop: 6, color: colors.mutedText }]}>
              Sin operarios
            </Text>
          )}
        </View>

        {/* ===== Retos del día (desde API) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Retos del día</Text>

          {retoLoading && (
            <Text style={[s.td, { color: colors.mutedText }]}>Cargando retos…</Text>
          )}

          {!retoLoading && dia.retos.length === 0 && (
            <Text style={[s.td, { color: colors.mutedText }]}>Sin retos</Text>
          )}

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

        {/* ===== Reportes del día (títulos REALES) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Reportes del día</Text>

          {repLoading && (
            <Text style={[s.td, { color: colors.mutedText }]}>Cargando reportes…</Text>
          )}

          {!repLoading && dia.reportes.length === 0 && (
            <Text style={[s.td, { color: colors.mutedText }]}>Sin reportes</Text>
          )}

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
