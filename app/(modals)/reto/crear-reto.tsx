// app/(modals)/reto/crear-reto.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../../components/FadeWrapper';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

// 👇 Path correcto hacia tu util compartido de retos
import { createReto, type RetoDTO } from '../../(admin)/lib/retos';

const MAX_DESC = 255 as const;

const cargos = ['Operario', 'Mantenimiento', 'Supervisor'] as const;
type Cargo = (typeof cargos)[number];

const tiposReto = ['Opción múltiple', 'Emparejar', 'Rellenar'] as const;
type TipoReto = (typeof tiposReto)[number];

type ParUI = { id: string; izquierda: string; derecha: string };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export default function CrearRetoModal() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);
  const s = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const { fetchJson } = useAuth();

  const { mode = 'create', item } = useLocalSearchParams<{ mode?: string; item?: string }>();
  const isEdit = String(mode) === 'edit';
  const itemParsed: RetoDTO | null = useMemo(() => {
    try { return item ? JSON.parse(item) : null; } catch { return null; }
  }, [item]);

  // Form base
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargo, setCargo] = useState<Cargo>('Operario');
  const [tipo, setTipo] = useState<TipoReto | null>(null);

  // Opción múltiple
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState<{ id: string; texto: string; correcta?: boolean }[]>([
    { id: 'a', texto: '' },
    { id: 'b', texto: '' },
    { id: 'c', texto: '' },
    { id: 'd', texto: '' },
  ]);
  const [multiple, setMultiple] = useState(true);

  // Emparejar
  const [pares, setPares] = useState<ParUI[]>([
    { id: 'p1', izquierda: '', derecha: '' },
    { id: 'p2', izquierda: '', derecha: '' },
  ]);

  // Rellenar
  const [fillWord, setFillWord] = useState('');
  const [fillHint, setFillHint] = useState('');

  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isEdit && itemParsed) {
      setNombre(itemParsed.nombreReto || '');
      setDescripcion(itemParsed.descripcionReto || '');
    }
  }, [isEdit, itemParsed]);

  const crear = async () => {
    if (!nombre.trim()) { Alert.alert('Falta información', 'El nombre del reto es obligatorio'); return; }

    const hoy = new Date(); const fin = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
    const payload = {
      nombreReto: nombre.trim(),
      descripcionReto: descripcion.trim() || null,
      tiempoEstimadoSegReto: 0,
      fechaInicioReto: isoDate(hoy),
      fechaFinReto: isoDate(fin),
    };

    try {
      setCargando(true);
      await createReto(fetchJson, payload);
      Alert.alert('OK', 'Reto creado correctamente');
      router.back();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('403')) Alert.alert('Sin permisos', 'No puedes crear retos.');
      else if (msg.includes('401')) Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
      else Alert.alert('Error', msg || 'No se pudo crear el reto');
    } finally {
      setCargando(false);
    }
  };

  const guardarCambios = () => {
    Alert.alert('Pendiente', 'La edición se implementará en el siguiente paso.');
  };

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header modal */}
        <View style={{ paddingHorizontal: 18, paddingTop: insets.top + 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[g.text.h2, { flex: 1 }]}>{isEdit ? 'Editar reto' : 'Crear reto'}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[s.card, { marginTop: 8 }]}>
            <Text style={g.text.smallStrong}>Nombre del tema</Text>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre de tema"
              placeholderTextColor={colors.mutedText}
              style={[s.input, { marginTop: 6 }]}
            />

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Descripción del tema</Text>
            <View style={[s.textAreaWrap, { marginTop: 6 }]}>
              <TextInput
                value={descripcion}
                onChangeText={(t) => t.length <= MAX_DESC && setDescripcion(t)}
                placeholder="Sobre qué trata el tema"
                placeholderTextColor={colors.mutedText}
                multiline
                style={s.textArea}
              />
              <Text style={[g.text.caption, { position: 'absolute', right: 8, bottom: 6 }]}>{MAX_DESC - descripcion.length}</Text>
            </View>

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Seleccione el cargo</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {cargos.map((c) => (
                <Radio key={c} label={c} selected={cargo === c} onPress={() => setCargo(c)} c={colors} g={g} />
              ))}
            </View>

            <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Escoja tipo de reto</Text>
            <View style={s.chipsRow}>
              {tiposReto.map((t) => (
                <Chip key={t} label={t} active={tipo === t} onPress={() => setTipo(t as any)} c={colors} g={g} />
              ))}
            </View>

            {tipo === 'Opción múltiple' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “Opción múltiple”</Text>
                <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Pregunta</Text>
                <TextInput
                  value={pregunta}
                  onChangeText={setPregunta}
                  placeholder="Escribe la pregunta"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />

                <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Opciones</Text>
                {opciones.map((o, idx) => (
                  <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Pressable
                      onPress={() => setOpciones(prev => prev.map(p => p.id === o.id ? { ...p, correcta: !p.correcta } : p))}
                      style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}
                    >
                      {o.correcta ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                    </Pressable>
                    <TextInput
                      value={o.texto}
                      onChangeText={(t) => setOpciones(prev => prev.map(p => p.id === o.id ? { ...p, texto: t } : p))}
                      placeholder={`Opción ${idx + 1}`}
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                  </View>
                ))}

                <Pressable onPress={() => setMultiple(m => !m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <View style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                    {multiple ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </View>
                  <Text style={g.text.body}>Permitir múltiples respuestas correctas</Text>
                </Pressable>
              </View>
            )}

            {tipo === 'Emparejar' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “Emparejar”</Text>
                {pares.map((p) => (
                  <View key={p.id} style={s.pairRow}>
                    <TextInput
                      value={p.izquierda}
                      onChangeText={(t) => setPares(prev => prev.map(x => x.id === p.id ? { ...x, izquierda: t } : x))}
                      placeholder="Izquierda"
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                    <Ionicons name="swap-horizontal" size={18} color={colors.mutedText} />
                    <TextInput
                      value={p.derecha}
                      onChangeText={(t) => setPares(prev => prev.map(x => x.id === p.id ? { ...x, derecha: t } : x))}
                      placeholder="Derecha"
                      placeholderTextColor={colors.mutedText}
                      style={[s.input, { flex: 1 }]}
                    />
                    <Square onPress={() => setPares(prev => (prev.length > 2 ? prev.filter(x => x.id !== p.id) : prev))} danger c={colors} title="Quitar par" />
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setPares(prev => [...prev, { id: `p${Date.now()}`, izquierda: '', derecha: '' }])}
                  activeOpacity={0.9}
                  style={[s.addBtn, { borderColor: colors.outline, backgroundColor: colors.mutedBg }]}
                >
                  <Text style={g.text.bodyStrong}>Añadir par</Text>
                </TouchableOpacity>
              </View>
            )}

            {tipo === 'Rellenar' && (
              <View style={s.panel}>
                <Text style={s.panelTitle}>Configurar “Rellenar”</Text>
                <Text style={[g.text.smallStrong, { marginBottom: 6 }]}>Respuesta</Text>
                <TextInput
                  value={fillWord}
                  onChangeText={setFillWord}
                  placeholder="Palabra correcta"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />
                <Text style={[g.text.smallStrong, { marginTop: 10, marginBottom: 6 }]}>Pista (opcional)</Text>
                <TextInput
                  value={fillHint}
                  onChangeText={setFillHint}
                  placeholder="Pista para ayudar"
                  placeholderTextColor={colors.mutedText}
                  style={s.input}
                />
              </View>
            )}

            {/* Acciones */}
            <View style={{ marginTop: 14, gap: 10 }}>
              {!isEdit ? (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={crear}
                  disabled={cargando}
                  activeOpacity={0.9}
                >
                  {cargando ? <ActivityIndicator color="#fff" /> : <Text style={g.text.onPrimary}>Guardar reto</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary, opacity: 0.7 }]}
                  onPress={guardarCambios}
                  activeOpacity={0.9}
                >
                  <Text style={g.text.onPrimary}>Guardar cambios</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primarySoft }]}
                onPress={() => Alert.alert('Preview', 'Aquí puedes disparar la vista previa como antes.')}
              >
                <Text style={[g.text.bodyStrong]}>Probar reto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes & estilos ---------- */
function Radio({ label, selected, onPress, c, g }: { label: string; selected: boolean; onPress: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 18, height: 18, borderRadius: 9, borderWidth: 2,
        borderColor: selected ? c.primary : c.inputBorder, alignItems: 'center', justifyContent: 'center',
        marginRight: 8
      }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
      </View>
      <Text style={g.text.body}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress, c, g }: { label: string; active?: boolean; onPress?: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        {
          paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1,
          justifyContent: 'center',
        },
        active ? { backgroundColor: c.primary, borderColor: c.primary }
               : { backgroundColor: c.mutedBg, borderColor: c.outline },
      ]}
    >
      <Text style={[g.text.smallStrong, active ? g.text.onPrimary : {}]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Square({ onPress, danger = false, c, title }: { onPress?: () => void; danger?: boolean; c: any; title?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: danger ? c.danger : c.mutedBg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: danger ? c.danger : c.outline
      }}
    >
      <Ionicons name={danger ? 'trash' : 'create'} size={16} color={danger ? '#fff' : c.text} />
    </Pressable>
  );
}

function getStyles(c: import('../../../theme/ThemeProvider').Palette) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 18,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.tabBorder,
      backgroundColor: c.card,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    input: {
      borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10,
      paddingHorizontal: 12, height: 40, backgroundColor: c.card, color: c.text,
    },
    textAreaWrap: {
      position: 'relative', borderWidth: 1, borderColor: c.inputBorder,
      borderRadius: 10, backgroundColor: c.card,
    },
    textArea: {
      minHeight: 140, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24,
      color: c.text, textAlignVertical: 'top',
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    panel: {
      marginTop: 12, padding: 12, backgroundColor: c.cardTint, borderRadius: 12,
      borderWidth: 1, borderColor: c.tabBorder,
    },
    panelTitle: { fontWeight: '800', color: c.text, marginBottom: 8 },
    check: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.inputBorder,
    },
    pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    addBtn: {
      marginTop: 8, alignSelf: 'flex-start',
      paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1,
    },
    primaryBtn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
}
