import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, FlatList, Image, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { Logro } from '../../models/Logro';

export default function LogrosModalScreen() {
    const router = useRouter();
    const { fetchJson, baseUrl } = useAuth();

    const [items, setItems] = useState<Logro[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [selected, setSelected] = useState<Logro | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true); setErr(null);
                const data = await fetchJson<any[]>('/mis-logros/todos');
                setItems((data ?? []).map(Logro.fromJSON));
            } catch (e: any) {
                setErr(e?.message || 'No se pudo cargar los logros');
            } finally { setLoading(false); }
        })();
    }, [fetchJson]);

    const s = StyleSheet.create({
        safe: { flex: 1, backgroundColor: '#f8fafc' },
        headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
        backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        backTxt: { fontSize: 16 },
        title: { textAlign: 'center', fontSize: 24, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },

        listContent: { paddingHorizontal: 12, paddingBottom: 24 },
        gridItem: { width: 104, margin: 8, alignItems: 'center' },
        iconWrap: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9' },
        icon: { width: '100%', height: '100%' },
        iconLocked: { opacity: 0.35 },
        lockOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(128,128,128,0.15)' },
        name: { textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: '600' },
        date: { marginTop: 2, fontSize: 10, color: '#0f766e' },
        lockedText: { marginTop: 2, fontSize: 10, color: '#6b7280' },

        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
        retry: { marginTop: 8, backgroundColor: '#EEE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

        // mini-modal interno
        popBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
        popCard: { width: '86%', backgroundColor: 'white', borderRadius: 14, padding: 16 },
        popTitle: { fontSize: 16, fontWeight: '800' },
        popDesc: { marginTop: 6, fontSize: 13, color: '#374151' },
        popReward: { marginTop: 8, fontSize: 12, fontWeight: '700' },
        popHint: { marginTop: 6, fontSize: 12, color: '#6b7280' },
        popDate: { marginTop: 6, fontSize: 12, color: '#0f766e' },
        popClose: { marginTop: 12, alignSelf: 'flex-end', backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
        popCloseTxt: { color: 'white', fontWeight: '700' },
    });

    const renderItem = ({ item }: { item: Logro }) => {
        const uri = item.icono.startsWith('http') ? item.icono : `${baseUrl}${item.icono}`;
        return (
            <Pressable style={s.gridItem} onPress={() => setSelected(item)}>
                <View style={s.iconWrap}>
                    <Image source={{ uri }} style={[s.icon, item.bloqueado && s.iconLocked]} />
                    {item.bloqueado && <View style={s.lockOverlay} />}
                </View>
                <Text style={s.name} numberOfLines={2}>{item.nombre}</Text>
                {item.bloqueado ? (
                    <Text style={s.lockedText}>Bloqueado</Text>
                ) : (
                    <Text style={s.date}>Obtenido: {item.fechaFormateada}</Text>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            {/* Header: volver (mismo patrón de privacy.tsx) */}
            <View style={s.headerRow}>
                <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} />
                    <Text style={s.backTxt}>Volver</Text>
                </Pressable>
            </View>

            <Text style={s.title}>Todos los logros</Text>

            {loading ? (
                <View style={s.center}><ActivityIndicator size="large" /><Text style={{ marginTop: 8 }}>Cargando…</Text></View>
            ) : err ? (
                <View style={s.center}>
                    <Text style={{ textAlign: 'center', marginBottom: 8 }}>{err}</Text>
                    <Pressable onPress={() => router.back()} style={s.retry}><Text>Ok</Text></Pressable>
                </View>
            ) : (
                <FlatList
                    contentContainerStyle={s.listContent}
                    data={items}
                    numColumns={3}
                    keyExtractor={(it) => String(it.codLogro)}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Mini-modal con detalle del logro */}
            {selected && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setSelected(null)}>
                    <Pressable style={s.popBackdrop} onPress={() => setSelected(null)}>
                        <View style={s.popCard}>
                            <Text style={s.popTitle}>{selected.nombre}</Text>
                            <Text style={s.popDesc}>{selected.descripcion}</Text>
                            <Text style={s.popReward}>Recompensa: {selected.recompensa}</Text>
                            {selected.bloqueado && <Text style={s.popHint}>Sigue completando retos para desbloquearlo 🔓</Text>}
                            {!selected.bloqueado && !!selected.fechaFormateada && (
                                <Text style={s.popDate}>Obtenido el {selected.fechaFormateada}</Text>
                            )}
                            <Pressable onPress={() => setSelected(null)} style={s.popClose}><Text style={s.popCloseTxt}>Listo</Text></Pressable>
                        </View>
                    </Pressable>
                </Modal>
            )}
        </SafeAreaView>
    );
}
