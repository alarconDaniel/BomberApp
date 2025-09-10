// app/(modals)/logros.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, FlatList, Image, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { Logro } from '../../models/Logro';
import { useTheme } from '../../theme/ThemeProvider';
import {useMarkModalOnClose} from "../../navigation/useMarkModalOnClose";
import {markModalClosed} from "../../navigation/ModalTracker";
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveLogroIconFromBd } from '../../config/icons/logroIcons';

export default function LogrosModalScreen() {
    useMarkModalOnClose();

    const router = useRouter();
    const { fetchJson, baseUrl } = useAuth();
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

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

    const s = useMemo(
        () =>
            StyleSheet.create({
                safe: { flex: 1, backgroundColor: isDark ? colors.bg : '#f8fafc' },
                headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
                backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                contentTitle: { textAlign: 'center', marginTop: 8, marginBottom: 4 },

                listContent: { paddingHorizontal: 12, paddingBottom: 24 },
                gridItem: { width: 104, margin: 8, alignItems: 'center' },
                iconWrap: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: isDark ? colors.imageBg : '#F1F5F9' },
                icon: { width: '100%', height: '100%' },
                iconLocked: { opacity: 0.35 },
                lockOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(128,128,128,0.15)' },
                name: { textAlign: 'center', marginTop: 6 },
                date: { marginTop: 2, color: isDark ? colors.success : '#0f766e' },

                center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
                retry: { marginTop: 8, backgroundColor: isDark ? colors.mutedBg : '#EEE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

                // mini-modal interno
                popBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
                popCard: { width: '86%', backgroundColor: isDark ? colors.card : 'white', borderRadius: 14, padding: 16 },
                popTitle: {},
                popDesc: { marginTop: 6 },
                popReward: { marginTop: 8 },
                popHint: { marginTop: 6 },
                popDate: { marginTop: 6, color: isDark ? colors.success : '#0f766e' },
                popClose: { marginTop: 12, alignSelf: 'flex-end', backgroundColor: isDark ? colors.primary : '#111827', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },

                popIconWrap: { alignItems: 'center', marginBottom: 10 },
                popIcon:     { width: 112, height: 112, borderRadius: 16, backgroundColor: isDark ? colors.imageBg : '#F1F5F9' },

            }),
        [colors, isDark]
    );

    const renderItem = ({ item }: { item: Logro }) => {
        return (
            <Pressable style={s.gridItem} onPress={() => setSelected(item)}>
                <View style={s.iconWrap}>
                    <Image
                        source={resolveLogroIconFromBd(item.icono, isDark)}
                        style={[s.icon, item.bloqueado && s.iconLocked]}
                        resizeMode="cover"
                    />
                    {item.bloqueado && <View style={s.lockOverlay} />}
                </View>
                <Text style={[g.text.captionStrong, s.name]} numberOfLines={2}>{item.nombre}</Text>
                {item.bloqueado ? (
                    <Text style={[g.text.caption, g.text.muted]}>Bloqueado</Text>
                ) : (
                    <Text style={[g.text.caption, s.date]}>Obtenido: {item.fechaFormateada}</Text>
                )}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.headerRow}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
            </View>

            <Text style={[g.text.h1, s.contentTitle, {paddingBottom: 12}]}>Todos los logros</Text>

            {loading ? (
                <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={[g.text.caption, { marginTop: 8 }]}>Cargando…</Text></View>
            ) : err ? (
                <View style={s.center}>
                    <Text style={[g.text.body, { textAlign: 'center', marginBottom: 8 }]}>{err}</Text>
                    <Pressable onPress={() => router.back()} style={s.retry}><Text style={g.text.body}>Ok</Text></Pressable>
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

                            {/* 👇 NUEVO: icono grande del logro */}
                            <View style={s.popIconWrap}>
                                <Image
                                    source={resolveLogroIconFromBd(selected.icono, isDark)}
                                    style={s.popIcon}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text style={[g.text.title, s.popTitle]}>{selected.nombre}</Text>
                            <Text style={[g.text.body, g.text.secondary, s.popDesc]}>{selected.descripcion}</Text>
                            <Text style={[g.text.smallStrong, s.popReward]}>
                                Recompensa: {selected.recompensa}
                            </Text>

                            {selected.bloqueado && (
                                <Text style={[g.text.caption, g.text.muted, s.popHint]}>
                                    Sigue completando retos para desbloquearlo 🔓
                                </Text>
                            )}

                            {!selected.bloqueado && !!selected.fechaFormateada && (
                                <Text style={[g.text.caption, s.popDate]}>
                                    Obtenido el {selected.fechaFormateada}
                                </Text>
                            )}

                            <Pressable onPress={() => setSelected(null)} style={s.popClose}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>Listo</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Modal>
            )}

        </SafeAreaView>
    );
}
