// app/(admin)/(tabs)/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useFocusEffect } from 'expo-router';

import { fetchReporteTitles } from './lib/reportes';
import { fetchFullNameFromUsuariosList } from './lib/perfil';

/* ===== Tipos UI ===== */
type OperarioStat = { id: string; nombre: string; retosCompletados: number; reportesSubidos: boolean };
type RetoItem = { id: string; titulo: string };
type ReporteItem = { id: string; titulo: string };
type DiaData = { operarios: OperarioStat[]; retos: RetoItem[]; reportes: ReporteItem[] };

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
      minWidth: 200, paddingHorizontal: 16, height: 46, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.tabBorder,
      shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    },
    dayText: { fontSize: 18, fontWeight: '900', color: c.text, letterSpacing: 0.5, textTransform: 'capitalize' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    th: { fontSize: 12, fontWeight: '800', color: c.mutedText, textTransform: 'uppercase', letterSpacing: 0.6 },
    td: { fontSize: 14, color: c.text },

    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    pctTxt: { width: 48, textAlign: 'right', color: c.text, fontVariant: ['tabular-nums'] },
    progress: { flex: 0.9, height: 8, borderRadius: 100, overflow: 'hidden', borderWidth: 1 },
    progressFill: { height: '100%' },
  });
}

/* ===== Tipo para progreso de retos del día ===== */
type RetoProgreso = {
  codReto: number;
  titulo: string;
  completados: number;
  total: number;
  pct: number;
  mi?: { asignado: boolean; completado: boolean; enProgreso: boolean };
};

/* ===== UTILIDADES DE FECHA EN ZONA LOCAL (sin UTC) ===== */
const pad = (n: number) => String(n).padStart(2, '0');
function toYmdLocal(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function genFechasUltimosDiasLocal(diasAtras = 60, today = new Date()): string[] {
  const arr: string[] = [];
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (let i = diasAtras - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i); arr.push(toYmdLocal(d));
  }
  return arr;
}

export default function HomeScreen() {
  const { user, fetchJson, baseUrl } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  // ===== Calendario (local) =====
  const [todayKey, setTodayKey] = useState<string>(toYmdLocal(new Date()));
  const fechas = useMemo(() => genFechasUltimosDiasLocal(60, new Date()), [todayKey]);
  const [idx, setIdx] = useState<number>(fechas.length - 1); // hoy

  useEffect(() => {
    if (idx > fechas.length - 1) setIdx(fechas.length - 1);
    if (idx < 0) setIdx(0);
  }, [fechas.length]);

  const fechaKey = fechas[idx];
  const fechaObj = useMemo(() => {
    const [Y, M, D] = fechaKey.split('-').map(Number);
    return new Date(Y, (M ?? 1) - 1, D ?? 1);
  }, [fechaKey]);

  const etiquetaFecha = useMemo(
    () =>
      new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(fechaObj),
    [fechaObj]
  );

  const isFirst = idx === 0;
  const isLast = idx === fechas.length - 1;

  // ===== Datos UI =====
  const [operariosDia, setOperariosDia] = useState<OperarioStat[]>([]);
  const [opsLoading, setOpsLoading] = useState<boolean>(true);

  const [repTitles, setRepTitles] = useState<string[]>([]);
  const [repLoading, setRepLoading] = useState<boolean>(true);

  const [retosDia, setRetosDia] = useState<RetoProgreso[]>([]);
  const [retosDiaLoading, setRetosDiaLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);

  const [fullName, setFullName] = useState<string>('Usuario');

  /** === Loaders factorados === */
  // Operarios por día (API real)
  const loadOperarios = useCallback(async (fecha: string) => {
    setOpsLoading(true);
    try {
      const data = await fetchJson<any>(`/reto/operarios-dia?fecha=${encodeURIComponent(fecha)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const norm: OperarioStat[] = arr.map((x: any, i: number) => ({
        id: String(x.codUsuario ?? x.id ?? i),
        nombre: String(x.nombre ?? ''),
        retosCompletados: Number(x.retosCompletados ?? x.retos ?? 0),
        reportesSubidos: !!(x.reportesSubidos ?? x.tieneReporte ?? x.reportes),
      }));
      setOperariosDia(norm);
    } catch {
      setOperariosDia([]);
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

  const loadFullName = useCallback(async () => {
    try {
      const name = await fetchFullNameFromUsuariosList(fetchJson, user);
      setFullName(name);
    } catch {}
  }, [fetchJson, user]);

  const loadProgreso = useCallback(async (fecha: string) => {
    setRetosDiaLoading(true);
    try {
      const data = await fetchJson<any>(`/reto/progreso-dia?fecha=${encodeURIComponent(fecha)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const norm: RetoProgreso[] = arr.map((x: any) => ({
        codReto: Number(x.codReto ?? x.cod_reto ?? 0),
        titulo: String(x.titulo ?? x.nombreReto ?? x.nombre_reto ?? ''),
        completados: Number(x.completados ?? 0),
        total: Number(x.total ?? 0),
        pct: Math.max(0, Math.min(100, Number(x.pct ?? 0))), // pct del backend (no se usa para mostrar)
        mi: x.mi
          ? {
              asignado: !!x.mi.asignado,
              completado: !!x.mi.completado,
              enProgreso: !!x.mi.enProgreso,
            }
          : undefined,
      }));
      setRetosDia(norm);
    } catch {
      setRetosDia([]);
    } finally {
      setRetosDiaLoading(false);
    }
  }, [fetchJson]);

  const refetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadOperarios(fechaKey),
      loadReportes(),
      loadFullName(),
      loadProgreso(fechaKey),
    ]);
    setRefreshing(false);
  }, [loadOperarios, loadReportes, loadFullName, loadProgreso, fechaKey]);

  /** === Montaje y cambios de fecha === */
  useEffect(() => { loadReportes(); }, [loadReportes]);
  useEffect(() => { loadFullName(); }, [loadFullName]);
  useEffect(() => { if (fechaKey) { loadOperarios(fechaKey); loadProgreso(fechaKey); } }, [fechaKey, loadOperarios, loadProgreso]);

  /** === Re-carga cuando la pestaña vuelve a foco + polling === */
  useFocusEffect(
    useCallback(() => {
      const nowKey = toYmdLocal(new Date());
      if (nowKey !== todayKey) setTodayKey(nowKey);

      loadOperarios(fechaKey);
      loadReportes();
      loadFullName();
      loadProgreso(fechaKey);

      const t = setInterval(() => {
        loadProgreso(fechaKey);
        loadOperarios(fechaKey);
      }, 20000);
      return () => clearInterval(t);
    }, [todayKey, fechaKey, loadOperarios, loadReportes, loadFullName, loadProgreso])
  );

  // demo gráfico (tu gráfica mensual permanece como la dejaste)
  const semanas = [
    { label: 'Semana 1', value: 0 },
    { label: 'Semana 2', value: 0 },
    { label: 'Semana 3', value: 0 },
    { label: 'Semana 4', value: 0 },
  ];
  const maxBarH = 120;

  return (
    <SafeAreaView style={[s.container, { paddingTop: insets.top || 8 }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}
      >
        {/* ===== Bienvenida ===== */}
        <Text style={[g.text.h2, { marginHorizontal: 16, marginBottom: 10 }]}>
          ¡Bienvenido, {fullName}!
        </Text>

        {/* ===== Card: Participación semanal + contador operarios ===== */}
        <View style={s.card}>
          <View style={s.headerRow}>
            <Text style={[g.text.h3, { flex: 1 }]}>Participación semanal</Text>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.mutedBg }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {operariosDia.length} operarios
              </Text>
            </View>
          </View>

          <Text style={{ textAlign: 'center', marginBottom: 8, color: colors.mutedText, fontWeight: '800' }}>
            {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fechaObj).toUpperCase()}
          </Text>

          <View style={s.chartRow}>
            <View style={[s.chartBox, { borderColor: colors.tabBorder, backgroundColor: colors.cardTint }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18, height: maxBarH, paddingHorizontal: 6 }}>
                {semanas.map((w) => {
                  const h = operariosDia.length > 0 ? (w.value / operariosDia.length) * maxBarH : 0;
                  return (
                    <View key={w.label} style={{ alignItems: 'center' }}>
                      <Text style={{ marginBottom: 4, fontSize: 12, color: colors.mutedText }}>{w.value}</Text>
                      <View style={[s.bar, { height: h, backgroundColor: colors.primary }]} />
                      <Text style={[s.chartLabel, { color: colors.mutedText }]}>{w.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* ===== Selector de día (últimos 60 días, local) ===== */}
        <View style={s.calWrap}>
          <Pressable onPress={() => !isFirst && setIdx(idx - 1)} disabled={isFirst} style={[s.arrowBtn, isFirst && { opacity: 0.4 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={s.dayBadge}>
            <Text style={s.dayText}>{etiquetaFecha}</Text>
          </View>

          <Pressable onPress={() => !isLast && setIdx(idx + 1)} disabled={isLast} style={[s.arrowBtn, isLast && { opacity: 0.4 }]}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* ===== Operarios ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Operarios</Text>

          <View style={[s.row, { paddingVertical: 6 }]}>
            <Text style={[s.th, { flex: 1 }]}>Operario</Text>
            <Text style={[s.th, { width: 96, textAlign: 'center' }]}>Retos</Text>
            <Text style={[s.th, { width: 100, textAlign: 'center' }]}>Reportes</Text>
          </View>

          {operariosDia.map(op => (
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

          {!opsLoading && operariosDia.length === 0 && (
            <Text style={[s.td, { marginTop: 6, color: colors.mutedText }]}>
              Sin operarios
            </Text>
          )}
        </View>

        {/* ===== Retos del día (progreso respecto a #operarios) ===== */}
        <View style={s.card}>
          <Text style={[g.text.h3, { marginBottom: 8 }]}>Retos del día</Text>

          {retosDiaLoading && (
            <Text style={[s.td, { color: colors.mutedText }]}>Cargando retos…</Text>
          )}

          {!retosDiaLoading && retosDia.length === 0 && (
            <Text style={[s.td, { color: colors.mutedText }]}>Sin retos</Text>
          )}

          {retosDia.map(r => {
            const totalOperarios = operariosDia.length;
            const pctDisp = totalOperarios > 0
              ? Math.min(100, Math.round((r.completados / totalOperarios) * 100))
              : 0;
            const miDone = !!r.mi?.completado;

            return (
              <View key={r.codReto} style={s.progressRow}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {miDone ? (
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  ) : r.mi?.enProgreso ? (
                    <Ionicons name="time" size={16} color={colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={16} color={colors.mutedText} />
                  )}
                  <Text style={[s.td, { flexShrink: 1 }]} numberOfLines={1}>{r.titulo}</Text>
                </View>

                <Text style={[s.pctTxt]}>{pctDisp}%</Text>
                <View style={[s.progress, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
                  <View style={[s.progressFill, { width: `${pctDisp}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
