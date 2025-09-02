// app/(admin)/(tabs)/HomeScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

type OperarioDTO = {
  id: number | string;
  nombre: string;
  retosCompletados: number;
  reporteSubido: boolean; // <- del backend
};

type RetoDiaDTO = {
  codReto: number | string;
  titulo: string;
  totalAsignados: number;
  completados: number;
};

type ReporteDiaDTO = {
  id: number | string;
  titulo: string;
  totalEsperados: number;
  subidos: number;
};

type DashboardDia = {
  fecha: string;
  operarios: OperarioDTO[];
  retos: RetoDiaDTO[];
  reportes: ReporteDiaDTO[];
};

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, delta: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

function getStyles(c: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    card: {
      marginHorizontal: 16, marginBottom: 12, padding: 12,
      borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderColor: c.tabBorder,
      shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    calWrap: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    arrowBtn: {
      width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.mutedBg, borderWidth: 1, borderColor: c.outline,
    },
    dayBadge: {
      minWidth: 180, paddingHorizontal: 16, height: 46, borderRadius: 14,
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
    tagOk: { color: c.success, fontWeight: '700' },
    tagNo: { color: c.danger, fontWeight: '700' },
  });
}

export default function HomeScreen() {
  const { user, fetchJson } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const todayISO = useMemo(() => toISO(new Date()), []);
  const [offset, setOffset] = useState(0);
  const fecha = useMemo(() => addDays(todayISO, offset), [todayISO, offset]);

  const [nombreUI] = useState<string>(() => {
    const n = (user as any)?.nombreUsuario ?? (user as any)?.nombre ?? '';
    const a = (user as any)?.apellidoUsuario ?? (user as any)?.apellido ?? '';
    const byEmail = (user as any)?.correoUsuario ?? (user as any)?.email ?? '';
    const fallback = byEmail ? String(byEmail).split('@')[0] : 'Usuario';
    const full = `${String(n || '').trim()} ${String(a || '').trim()}`.trim();
    return full || fallback;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardDia | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ajusta la ruta si tu módulo quedó en otra url (p.ej. /actividad/dia)
      const resp = await fetchJson<Partial<DashboardDia>>(`/dashboard/dia?fecha=${fecha}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const operarios = Array.isArray(resp?.operarios) ? resp!.operarios!.map((o: any) => ({
        id: o.id ?? o.codUsuario ?? o.cod_usuario ?? String(Math.random()),
        nombre: o.nombre ?? o.nombreUsuario ?? o.nombre_usuario ?? o.fullname ?? '—',
        retosCompletados: Number(o.retosCompletados ?? o.retos ?? 0),
        reporteSubido: Boolean(o.reporteSubido ?? o.reporte ?? false),
      })) : [];

      const retos = Array.isArray(resp?.retos) ? resp!.retos!.map((r: any) => ({
        codReto: r.codReto ?? r.cod_reto ?? r.id ?? String(Math.random()),
        titulo: r.titulo ?? r.nombreReto ?? r.nombre_reto ?? '—',
        totalAsignados: Number(r.totalAsignados ?? r.asignados ?? 0),
        completados: Number(r.completados ?? r.hechos ?? 0),
      })) : [];

      const reportes = Array.isArray(resp?.reportes) ? resp!.reportes!.map((rp: any) => ({
        id: rp.id ?? rp.cod ?? String(Math.random()),
        titulo: rp.titulo ?? rp.nombre ?? '—',
        totalEsperados: Number(rp.totalEsperados ?? rp.esperados ?? 0),
        subidos: Number(rp.subidos ?? rp.hechos ?? 0),
      })) : [];

      setData({
        fecha: resp?.fecha ?? fecha,
        operarios,
        retos,
        reportes,
      });
    } catch (e: any) {
      setError(String(e?.message || 'No se pudo cargar /dashboard/dia'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchJson, fecha]);

  useEffect(() => { load(); }, [load]);

  const isFirst = false; // puedes limitar el rango si quieres
  const isLast = false;

  return (
    <SafeAreaView style={[s.container, { paddingTop: insets.top || 8 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Bienvenida */}
        <Text style={[g.text.h2, { marginHorizontal: 16, marginBottom: 10 }]}>
          ¡Bienvenido, {nombreUI}!
        </Text>

        {/* Selector de día */}
        <View style={s.calWrap}>
          <Pressable onPress={() => setOffset(o => o - 1)} disabled={isFirst} style={[s.arrowBtn, isFirst && { opacity: 0.4 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={s.dayBadge}>
            <Text style={s.dayText}>{fecha}</Text>
          </View>

          <Pressable onPress={() => setOffset(o => o + 1)} disabled={isLast} style={[s.arrowBtn, isLast && { opacity: 0.4 }]}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Estado de carga / error */}
        {loading && (
          <View style={[s.card, { alignItems: 'center' }]}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8, color: colors.mutedText }}>Cargando datos del día…</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={[s.card]}>
            <Text style={[s.td, { color: colors.danger }]}>Error: {error}</Text>
          </View>
        )}

        {/* Operarios */}
        {!loading && !error && (
          <View style={s.card}>
            <Text style={[g.text.h3, { marginBottom: 8 }]}>Operarios</Text>

            <View style={[s.row, { paddingVertical: 6 }]}>
              <Text style={[s.th, { flex: 1 }]}>Operario</Text>
              <Text style={[s.th, { width: 96, textAlign: 'center' }]}>Retos</Text>
              <Text style={[s.th, { width: 100, textAlign: 'center' }]}>Reportes</Text>
            </View>

            {(data?.operarios ?? []).map(op => (
              <View key={String(op.id)} style={s.row}>
                <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{op.nombre}</Text>
                <Text style={[s.td, { width: 96, textAlign: 'center' }]}>{op.retosCompletados}</Text>
                <Text style={[s.td, { width: 100, textAlign: 'center' }, op.reporteSubido ? s.tagOk : s.tagNo]}>
                  {op.reporteSubido ? 'Sí' : 'No'}
                </Text>
              </View>
            ))}

            {(data?.operarios?.length ?? 0) === 0 && (
              <Text style={[s.td, { marginTop: 6, color: colors.mutedText }]}>
                Sin operarios
              </Text>
            )}
          </View>
        )}

        {/* Retos del día */}
        {!loading && !error && (
          <View style={s.card}>
            <Text style={[g.text.h3, { marginBottom: 8 }]}>Retos del día</Text>

            {(data?.retos ?? []).map(r => {
              const base = Math.max(0, Math.min(100, r.totalAsignados > 0 ? Math.round((r.completados / r.totalAsignados) * 100) : 0));
              return (
                <View key={String(r.codReto)} style={s.progressRow}>
                  <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{r.titulo}</Text>
                  <Text style={[s.pctTxt]}>{base}%</Text>
                  <View style={[s.progress, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
                    <View style={[s.progressFill, { width: `${base}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
              );
            })}

            {(data?.retos?.length ?? 0) === 0 && (
              <Text style={[s.td, { color: colors.mutedText }]}>Sin retos</Text>
            )}
          </View>
        )}

        {/* Reportes del día */}
        {!loading && !error && (
          <View style={s.card}>
            <Text style={[g.text.h3, { marginBottom: 8 }]}>Reportes del día</Text>

            {(data?.reportes ?? []).map(r => {
              const pct = Math.max(0, Math.min(100, r.totalEsperados > 0 ? Math.round((r.subidos / r.totalEsperados) * 100) : 0));
              return (
                <View key={String(r.id)} style={s.progressRow}>
                  <Text style={[s.td, { flex: 1 }]} numberOfLines={1}>{r.titulo}</Text>
                  <Text style={[s.pctTxt]}>{pct}%</Text>
                  <View style={[s.progress, { backgroundColor: colors.mutedBg, borderColor: colors.outline }]}>
                    <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: colors.brandBlue ?? colors.primary }]} />
                  </View>
                </View>
              );
            })}

            {(data?.reportes?.length ?? 0) === 0 && (
              <Text style={[s.td, { color: colors.mutedText }]}>Sin reportes</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
