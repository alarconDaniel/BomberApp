// app/(modals)/vestir-avatar.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    Alert,
    useWindowDimensions,
    Dimensions,
    Image, // 👈 Opción B: Image de React Native
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';
import { useMarkModalOnClose } from '../../navigation/useMarkModalOnClose';
import { markModalClosed } from '../../navigation/ModalTracker';
import { resolveAvatarBase } from '../../config/icons/avatarBase';
import type { StyleProp, ImageStyle } from 'react-native';


import type { ItemInventario, InventarioResponse } from '../../models/ItemInventario';

type Slot = 'cabeza' | 'torso' | 'piernas' | 'pies' | 'extra';
const SLOT_ORDER: Slot[] = ['piernas', 'torso', 'extra', 'cabeza', 'pies']; // Z-order simple

const GET_EQUIPPED_ENDPOINT = '/avatar/ropa/equipada';
const SAVE_EQUIPPED_ENDPOINT = '/avatar/ropa/guardar';

type SlotsState = Record<Slot, number | null>;
const emptySlots = (): SlotsState => ({
    cabeza: null, torso: null, piernas: null, pies: null, extra: null,
});

function getSlot(it: ItemInventario): Slot {
    const slotFromApi = (it as any)?.item?.slot || (it as any)?.item?.slot_item;
    if (slotFromApi && typeof slotFromApi === 'string') {
        const s = slotFromApi.toLowerCase();
        if (s === 'cabeza' || s === 'torso' || s === 'piernas' || s === 'pies' || s === 'extra') return s as Slot;
    }

    return 'extra';
}

export default function VestirAvatarModal() {
    useMarkModalOnClose();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);
    const { fetchJson } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ItemInventario[]>([]);
    const [error, setError] = useState<string | null>(null);


    const [box, setBox] = useState({ w: 0, h: 0 });

    const SLOT_FRAMES: Record<Slot, { x: number; y: number; w: number; h: number }> = {
        cabeza: { x: 0.1535, y: 0.00000001, w: 0.67, h: 0.4 },
        torso:  { x: 0.29, y: 0.33, w: 0.40, h: 0.30 },
        piernas:{ x: 0.28, y: 0.62, w: 0.44, h: 0.28 },
        pies:   { x: 0.32, y: 0.88, w: 0.36, h: 0.12 },
        extra:  { x: 0.70, y: 0.25, w: 0.26, h: 0.26 },
    };

    const layerStyleFor = (slot: Slot): StyleProp<ImageStyle> => {
        const r = SLOT_FRAMES[slot];
        if (!r || !box.w || !box.h) return s.layerImg; // RegisteredStyle<ImageStyle>

        return [
            s.layerImg,
            {
                width:  box.w * r.w,
                height: box.h * r.h,
                left:   box.w * r.x,
                top:    box.h * r.y,
            } as ImageStyle,
        ];
    };


    // Persistido (BD)
    const [savedSlots, setSavedSlots] = useState<SlotsState>(emptySlots());
    // Borrador (preview)
    const [draftSlots, setDraftSlots] = useState<SlotsState>(emptySlots());
    const [working, setWorking] = useState(false);

    const [selected, setSelected] = useState<ItemInventario | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const openDetails = (it: ItemInventario) => { setSelected(it); setDetailsOpen(true); };
    const closeDetails = () => { setDetailsOpen(false); setTimeout(() => setSelected(null), 200); };

    // Grid responsive
    const COLS = useMemo(() => {
        if (width >= 1100) return 6;
        if (width >= 900) return 5;
        if (width >= 680) return 4;
        return 3;
    }, [width]);
    const GRID_GAP = 14;
    const H_PADDING = 16;
    const CARD_RATIO = 0.8;
    const CARD_W = useMemo(() => {
        const totalGaps = GRID_GAP * (COLS);
        const totalHorizontal = width - H_PADDING * 3 - totalGaps;
        return Math.floor(totalHorizontal / COLS);
    }, [width, COLS]);

    const s = StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        header: {
            paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        },
        backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        actions: { flexDirection: 'row', gap: 8 },
        actionBtn: {
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
            borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card,
        },
        actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
        actionTxt: { ...g.text.smallStrong },

        avatarWrap: { marginTop: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
        avatarBox: {
            marginTop:20,
            width: 290, height: 290, borderRadius: 16,
            backgroundColor: isDark ? colors.card : '#eef2ff',
            borderWidth: 2, borderColor: isDark ? colors.divider : '#c7d2fe',
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        },
        baseImg: { position: 'absolute', width: '88%', height: '88%', top: '6%', left: '6%' },
        layerImg: { position: 'absolute' },

        shelfCard: {
            marginTop: 18, marginHorizontal: 16, padding: 12, borderRadius: 14,
            backgroundColor: isDark ? colors.card : '#f3f4f6',
            borderWidth: 1, borderColor: isDark ? colors.divider : 'rgba(15,23,42,0.08)',
        },
        gridThumb: {
            width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, overflow: 'hidden', backgroundColor: colors.imageBg,
        },
        equippedDot: {
            position: 'absolute', bottom: 6, right: 6, width: 12, height: 12, borderRadius: 6,
            backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.card,
        },
        empty: { textAlign: 'center', marginTop: 20 },
    });

    const listarRopa = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const resp = await fetchJson<InventarioResponse>('/item-inventario/listar');
            const arr = Array.isArray((resp as any)?.items) ? resp.items : [];
            const ropa = arr.filter((it) => String(it?.item?.tipo ?? '').toUpperCase() === 'ROPA');
            setItems(ropa);
        } catch (e: any) {
            setError(e?.message || 'No se pudo cargar la ropa del inventario');
        } finally {
            setLoading(false);
        }
    }, [fetchJson]);

    const cargarEquipados = useCallback(async () => {
        try {
            const r = await fetchJson<{ slots: SlotsState }>(GET_EQUIPPED_ENDPOINT);
            const slots = r?.slots ?? emptySlots();
            setSavedSlots(slots);
            setDraftSlots(slots); // arranca borrador = guardado
        } catch {
            setSavedSlots(emptySlots());
            setDraftSlots(emptySlots());
        }
    }, [fetchJson]);

    useEffect(() => {
        listarRopa();
        cargarEquipados();
    }, [listarRopa, cargarEquipados]);

    // Helpers visuales
    const equippedDraftSet = useMemo(() => {
        const set = new Set<number>();
        (Object.values(draftSlots) as (number | null)[]).forEach((v) => { if (v != null) set.add(v); });
        return set;
    }, [draftSlots]);

    const layeredItemsForDraft = useMemo(() => {
        const mapByCod = new Map<string, ItemInventario>();
        items.forEach((it) => mapByCod.set(String(it.cod), it));
        const result: ItemInventario[] = [];
        for (const slot of SLOT_ORDER) {
            const cod = draftSlots[slot];
            if (cod != null) {
                const it = mapByCod.get(String(cod));
                if (it) result.push(it);
            }
        }
        return result;
    }, [items, draftSlots]);

    // Acciones UI: aplicar en borrador
    const equiparDraft = useCallback((it: ItemInventario) => {
        const slot = getSlot(it);
        setDraftSlots((prev) => {
            const copy: SlotsState = { ...prev };
            copy[slot] = Number(it.cod);
            return copy;
        });
    }, []);

    const quitarDraft = useCallback((it: ItemInventario) => {
        const slot = getSlot(it);
        setDraftSlots((prev) => ({ ...prev, [slot]: null }));
    }, []);

    const descartarCambios = useCallback(() => {
        setDraftSlots(savedSlots);
    }, [savedSlots]);

    const guardarCambios = useCallback(async () => {
        setWorking(true);
        const next = { ...draftSlots };
        try {
            // optimista
            setSavedSlots(next);
            setDraftSlots(next);

            const r = await fetchJson(SAVE_EQUIPPED_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ slots: next }),
            });

            const slots = (r?.slots ?? next) as SlotsState;
            setSavedSlots(slots);
            setDraftSlots(slots);
            Alert.alert('Guardado ✅', 'Tu outfit quedó grabado. La moda no incomoda.');
        } catch (e: any) {
            // rollback básico
            setDraftSlots(savedSlots);
            Alert.alert('Ups', e?.message || 'No se pudo guardar. Verifica tu conexión.');
        } finally {
            setWorking(false);
        }
    }, [draftSlots, savedSlots, fetchJson]);


    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>

                <View style={s.actions}>
                    <Pressable disabled={working} onPress={descartarCambios} style={s.actionBtn}>
                        <Text style={s.actionTxt}>{working ? '...' : 'Descartar'}</Text>
                    </Pressable>
                    <Pressable disabled={working} onPress={guardarCambios} style={[s.actionBtn, s.actionPrimary]}>
                        <Text style={g.text.onPrimary}>{working ? 'Guardando…' : 'Guardar'}</Text>
                    </Pressable>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[g.text.caption, { marginTop: 10 }]}>Cargando ropita…</Text>
                </View>
            ) : error ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                    <Text style={[g.text.bodyStrong, { textAlign: 'center', marginBottom: 12 }]}>{error}</Text>
                    <Pressable onPress={listarRopa} style={{ padding: 12, backgroundColor: colors.mutedBg, borderRadius: 8 }}>
                        <Text style={g.text.body}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : (
                <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
                    {/* Avatar / Preview */}
                    <View style={{ alignItems: 'center', marginTop: 8, paddingHorizontal: 16 }}>
                        <View
                            style={s.avatarBox}
                            onLayout={(e) => {
                                const { width, height } = e.nativeEvent.layout;
                                setBox({ w: width, h: height });
                            }}
                        >
                            <Image source={resolveAvatarBase(isDark)} style={s.baseImg} resizeMode="contain" />

                            {layeredItemsForDraft.map((it) => {
                                const slot = getSlot(it);
                                return (
                                    <Image
                                        key={`layer-${it.cod}`}
                                        source={resolveItemIconFromBd(it.item.icon, isDark)}
                                        style={layerStyleFor(slot)}
                                        resizeMode="contain"
                                    />
                                );
                            })}
                        </View>

                        <Text style={[g.text.caption, { marginTop: 8, color: colors.mutedText }]}>
                            Prueba tu outfit. Solo se guarda al presionar <Text style={{ fontWeight: '900' }}>Guardar</Text>.
                        </Text>
                    </View>

                    {/* Estante */}
                    <View style={s.shelfCard}>
                        <Text style={[g.text.h3]}>Tu ropa</Text>

                        <FlatList
                            data={items}
                            keyExtractor={(it) => String(it.cod)}
                            numColumns={COLS}
                            columnWrapperStyle={{ justifyContent: 'center', marginBottom: GRID_GAP }}
                            contentContainerStyle={{ paddingTop: 12 }}
                            ListEmptyComponent={<Text style={[g.text.body, g.text.muted, s.empty, {marginBottom: 30}]}>Sin prendas todavía</Text>}
                            renderItem={({ item }) => {
                                const img = resolveItemIconFromBd(item.item.icon, isDark);
                                const isEquippedDraft = equippedDraftSet.has(Number(item.cod));
                                const cardH = Math.floor(CARD_W / CARD_RATIO);
                                return (
                                    <Pressable style={{ width: CARD_W, marginHorizontal: GRID_GAP / 2 }} onPress={() => openDetails(item)}>
                                        <View style={[s.gridThumb, { width: CARD_W, height: cardH }]}>
                                            <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                                            {isEquippedDraft && <View style={s.equippedDot} />}
                                        </View>
                                        <Text style={[g.text.captionStrong, { textAlign: 'center', marginTop: 6 }]} numberOfLines={3}>
                                            {item.item.nombre}
                                        </Text>
                                    </Pressable>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* Modal Detalles */}
            <ClothingDetailsModal
                visible={detailsOpen}
                item={selected ?? undefined}
                equipped={!!(selected && equippedDraftSet.has(Number(selected.cod)))}
                working={working}
                onClose={() => setDetailsOpen(false)}
                onEquip={equiparDraft}
                onUnequip={quitarDraft}
                accentColor={colors.primary}
            />
        </SafeAreaView>
    );
}

/* ===== Modal de detalles ===== */
type DetailsProps = {
    visible: boolean;
    item?: ItemInventario | null;
    equipped?: boolean;
    working?: boolean;
    onClose: () => void;
    onEquip: (it: ItemInventario) => void;
    onUnequip: (it: ItemInventario) => void;
    accentColor?: string;
};

function ClothingDetailsModal({
                                  visible, item, equipped = false, working = false, onClose, onEquip, onUnequip, accentColor,
                              }: DetailsProps) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);
    if (!visible || !item) return null;

    const nombre = item.item?.nombre ?? 'Prenda';
    const descripcion = item.item?.descripcion || 'Sin descripción.';
    const cantidad = Number(item.cantidad ?? 0);
    const localImg = resolveItemIconFromBd(item.item.icon, isDark);

    const s = StyleSheet.create({
        backdrop: { ...StyleSheet.absoluteFillObject },
        center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 16 },
        card: {
            width: Math.min(420, Math.floor((Dimensions.get('window').width ?? 360) * 0.92)),
            borderRadius: 16, backgroundColor: colors.card, padding: 16,
            borderWidth: 1, borderColor: colors.divider, shadowColor: '#000',
            shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 10,
        },
        mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        iconWrap: { width: 92, height: 92, borderRadius: 12, backgroundColor: colors.imageBg, alignItems: 'center', justifyContent: 'center' },
        footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        btn: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
        cancelBtn: { borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card },
        actionBtn: { backgroundColor: colors.primary, opacity: working ? 0.6 : 1 },
        removeBtn: { backgroundColor: isDark ? '#7c3aed' : '#111827', opacity: working ? 0.6 : 1 },
        pill: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: accentColor || colors.primary },
    });

    return (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.center}>
                <Pressable style={s.card} onPress={() => {}}>
                    <Text style={[g.text.title, { marginBottom: 18 }]} numberOfLines={2}>{nombre}</Text>

                    <View style={s.mediaRow}>
                        <View style={s.iconWrap}>
                            <Image source={localImg} style={{ width: 92, height: 92, borderRadius: 12 }} resizeMode="contain" />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={[g.text.body, g.text.secondary]} numberOfLines={5}>{descripcion}</Text>
                            <View style={{ marginTop: 8 }}>
                                <Text style={g.text.bodyStrong}>
                                    Cantidad: <Text style={{ fontWeight: '900' }}>x{cantidad}</Text>
                                </Text>
                                <View style={s.pill}>
                                    <Text style={[g.text.smallStrong, { color: accentColor || colors.primary }]}>
                                        Tipo: ROPA — equípala para tu avatar (borrador hasta guardar)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={s.footer}>
                        <Pressable onPress={onClose} style={[s.btn, s.cancelBtn]}>
                            <Text style={g.text.smallStrong}>Cerrar</Text>
                        </Pressable>

                        {equipped ? (
                            <Pressable onPress={() => !working && onUnequip(item)} disabled={working} style={[s.btn, s.removeBtn]}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>{working ? 'Procesando…' : 'Quitar (borrador)'}</Text>
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => !working && onEquip(item)} disabled={working || cantidad <= 0} style={[s.btn, s.actionBtn]}>
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {working ? 'Procesando…' : cantidad > 0 ? 'Equipar (borrador)' : 'Sin stock'}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </View>
        </View>
    );
}
