import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, FlatList, Pressable, ActivityIndicator, TextInput, Alert
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useFocusEffect } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';

import { fetchRetos, deleteReto, type RetoDTO, type TipoReto } from './lib/retos';
import FadeWrapper from "../../components/admin/FadeWrapper";

type TipoUI = 'all' | TipoReto; // 'all' | 'quiz' | 'form' | 'archivo'

export default function RetosScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const { fetchJson } = useAuth();

  const [loading, setLoading] = useState(false);
  const [retos, setRetos] = useState<RetoDTO[]>([]);
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<TipoUI>('all');
  const [openFiltro, setOpenFiltro] = useState(false);

  const iconFor: Record<string, keyof typeof Ionicons.glyphMap> = {
    quiz: 'help-circle',
    form: 'checkbox',     // Checklist
    archivo: 'document',  // Subida de archivo
  };

  const labelFor: Record<TipoUI, string> = {
    all: 'Todos',
    quiz: 'Quiz',
    form: 'Checklist',
    archivo: 'Archivo',
  };

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRetos(fetchJson);
      setRetos(Array.isArray(data) ? data : []);
    } catch (e: any) {
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

  useEffect(() => { cargar(); }, [cargar]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const tipoUIFrom = (r: RetoDTO): TipoReto => {
    const t = (r.tipo ?? (r as any).tipoReto ?? (r as any).tipo_reto) as TipoReto | undefined;
    const cfg = (r as any)?.config ?? (r as any)?.metadataReto ?? (r as any)?.metadata_reto;
    let kind: string | undefined;
    if (cfg) { try { kind = (typeof cfg === 'string' ? JSON.parse(cfg) : cfg)?.kind; } catch {} }
    if (t === 'quiz') return 'quiz';
    if (t === 'archivo') return 'archivo';
    if (t === 'form') return kind === 'archivo' ? 'archivo' : 'form';
    return 'form';
  };

  const dataFiltrada = useMemo(() => {
    const q = query.trim().toLowerCase();
    return retos.filter(r => {
      const tipo = tipoUIFrom(r);
      const okTipo = (filtro === 'all') || (tipo === filtro);
      const okTxt = !q || `${r.nombreReto ?? ''} ${r.descripcionReto ?? ''}`.toLowerCase().includes(q);
      return okTipo && okTxt;
    });
  }, [retos, filtro, query]);

  const abrirCrear = () => router.push('/(modals)/reto/crear-reto');

  const fetchDetalle = async (id: number | string) => {
    const paths = [
      `/reto/detalle/${id}`,
      `/reto/get/${id}`,
      `/reto/${id}`,
      `/reto/buscar/${id}`,
      `/retos/detalle/${id}`,
      `/retos/${id}`,
      `/reto/config/${id}`,
      `/reto/metadata/${id}`,
    ];
    for (const p of paths) {
      try {
        const resp = await fetchJson<any>(p, { method: 'GET', headers: { Accept: 'application/json' } });
        if (resp) return resp;
      } catch {}
    }
    return null;
  };

  // Dentro de RetosScreen
  const abrirEditar = async (item: RetoDTO) => {
    try {
      setLoading(true);
      const resp = await fetchDetalle(item.codReto);
      const raw = resp?.data ?? resp?.reto ?? resp ?? {};
      const cfg = raw?.metadataReto ?? raw?.metadata_reto ?? raw?.config ?? (item as any)?.metadataReto ?? (item as any)?.config;

      let tipoResolved: TipoReto = (raw?.tipo ?? raw?.tipoReto ?? raw?.tipo_reto ?? item.tipo) as TipoReto;
      try {
        const parsed = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
        if ((tipoResolved === 'form' || !tipoResolved) && parsed?.kind === 'archivo') {
          tipoResolved = 'archivo';
        } else if (!tipoResolved) {
          tipoResolved = 'form';
        }
      } catch {}

      const merged = {
        ...item,
        tipo: tipoResolved,
        metadataReto: cfg,
        config: cfg,
        esAutomaticoReto: raw?.esAutomaticoReto ?? raw?.es_automatico_reto ?? (item as any)?.esAutomaticoReto,
        activo: raw?.activo ?? (item as any)?.activo,
        cargo: raw?.cargo ?? (item as any)?.cargo,
        tiempoEstimadoSegReto: Number(raw?.tiempoEstimadoSegReto ?? item.tiempoEstimadoSegReto ?? 0),
        fechaInicioReto: raw?.fechaInicioReto ?? raw?.fecha_inicio_reto ?? item.fechaInicioReto,
        fechaFinReto: raw?.fechaFinReto ?? raw?.fecha_fin_reto ?? item.fechaFinReto,
        descripcionReto: raw?.descripcionReto ?? raw?.descripcion_reto ?? item.descripcionReto,
        nombreReto: raw?.nombreReto ?? raw?.nombre_reto ?? item.nombreReto,
      };

      router.push({
        pathname: '/(modals)/reto/editar-reto',
        params: { item: JSON.stringify(merged) },
      });
    } catch {
      router.push({
        pathname: '/(modals)/reto/editar-reto',
        params: { item: JSON.stringify(item) },
      });
    } finally {
      setLoading(false);
    }
  };


  const borrar = async (item: RetoDTO) => {
    Alert.alert('Confirmar', `¿Borrar el reto "${item.nombreReto}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          let exito = false;
          try {
            setLoading(true);
            await deleteReto(fetchJson, item.codReto, item.nombreReto);
            await cargar();
            exito = true;
          } catch (e: any) {
            Alert.alert('Error','No se pudo borrar');
          } finally {
            setLoading(false);
            if(exito){
              Alert.alert('Información', `El reto "${item.nombreReto}" se eliminó exitosamente.`);
            }
          }

        }
      }
    ]);
  };

  return (
      <FadeWrapper>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, marginTop: 15, paddingBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[g.text.h1, { flex: 1}]}>Retos</Text>

        <Pressable
          onPress={abrirCrear}
          style={{
            height: 40, paddingHorizontal: 12, borderRadius: 10,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.primary
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={[g.text.onPrimary, { marginLeft: 6, fontWeight: '700' }]}>Crear reto</Text>
        </Pressable>
      </View>

      {/* Filtro + buscador */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ marginTop: 6, position: 'relative' }}>
          <Pressable
            onPress={() => setOpenFiltro(v => !v)}
            style={{
              height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder,
              backgroundColor: colors.card, paddingHorizontal: 10,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {filtro !== 'all' && <Ionicons name={iconFor[filtro as TipoReto]} size={16} color={colors.text} />}
              <Text style={g.text.bodyStrong}>{labelFor[filtro]}</Text>
            </View>
            <Ionicons name={openFiltro ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
          </Pressable>

          {openFiltro && (
            <View
              style={{
                position: 'absolute', left: 0, right: 0, top: 46,
                borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder,
                backgroundColor: colors.card, overflow: 'hidden', zIndex: 50
              }}
            >
              {(['all', 'quiz', 'form', 'archivo'] as TipoUI[]).map((t, idx, arr) => (
                <Pressable
                  key={t}
                  onPress={() => { setFiltro(t); setOpenFiltro(false); }}
                  style={{
                    paddingHorizontal: 12, height: 42, flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'space-between',
                    borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                    borderBottomColor: colors.tabBorder
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {t !== 'all' && <Ionicons name={iconFor[t as TipoReto]} size={16} color={colors.text} />}
                    <Text style={g.text.body}>{labelFor[t]}</Text>
                  </View>
                  {filtro === t && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row', gap: 8, marginTop: 10,
            borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10,
            backgroundColor: colors.card, paddingHorizontal: 10, height: 40, alignItems: 'center'
          }}
        >
          <Ionicons name="search" size={16} color={colors.mutedText} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar reto…"
            placeholderTextColor={colors.mutedText}
            style={{ flex: 1, color: colors.text }}
          />
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={dataFiltrada}
          keyExtractor={(item) => String(item.codReto)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 10 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: colors.mutedText, marginTop: 20 }}>
              No hay retos
            </Text>
          }
          renderItem={({ item }) => {
            const tipo = tipoUIFrom(item);
            return (
              <View
                style={{
                  borderRadius: 12, borderWidth: 1, borderColor: colors.tabBorder,
                  backgroundColor: colors.card, padding: 12, marginBottom: 10
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[g.text.bodyStrong, { flex: 1 }]} numberOfLines={1}>
                    {item.nombreReto}
                  </Text>
                  {tipo ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name={iconFor[tipo]} size={16} color={colors.mutedText} />
                      <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        {labelFor[tipo]}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {!!item.descripcionReto && (
                  <Text style={{ color: colors.mutedText, marginTop: 4 }} numberOfLines={2}>
                    {item.descripcionReto}
                  </Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => abrirEditar(item)}
                    style={{ paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardTint, borderWidth: 1, borderColor: colors.tabBorder }}
                  >
                    <Text style={g.text.bodyStrong}>Editar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => borrar(item)}
                    style={{ paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardTint, borderWidth: 1, borderColor: colors.tabBorder, flexDirection: 'row', gap: 6 }}
                  >
                    <Ionicons name="trash" size={16} color={colors.danger} />
                    <Text style={[g.text.bodyStrong, { color: colors.danger }]}>Borrar</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}


    </SafeAreaView>
        </FadeWrapper>
  );
}
