// app/(modals)/vestir-avatar.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    useWindowDimensions, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { useAuth } from '../../auth/AuthContext';
import { Image } from 'expo-image';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';
import { useMarkModalOnClose } from '../../navigation/useMarkModalOnClose';
import { markModalClosed } from '../../navigation/ModalTracker';

// Tipos ya usados en Inventory
import type { ItemInventario, InventarioResponse } from '../../models/ItemInventario';

// 🔧 Ajusta estos endpoints si tu backend usa otros nombres
const EQUIP_ENDPOINT = '/avatar/ropa/equipar';
const UNEQUIP_ENDPOINT = '/avatar/ropa/quitar';
// Opcional: cargar estado actual de ropa equipada
const GET_EQUIPPED_ENDPOINT = '/avatar/ropa/equipada';

type EquippedMap = Record<string, boolean>; // key: codItemInventario string

export default function VestirAvatarModal() {
    useMarkModalOnClose();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);
    const { fetchJson } = useAuth();
    const { width } = useWindowDimensions();

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<ItemInventario[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [equipped, setEquipped] = useState<EquippedMap>({});
    const [working, setWorking] = useState(false);

    // Detalle
    const [selected, setSelected] = useState<ItemInventario | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const openDetails = (it: ItemInventario) => { setSelected(it); setDetailsOpen(true); };
    const closeDetails = () => { setDetailsOpen(false); setTimeout(() => setSelected(null), 200); };

    // Layout responsive simple
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
        header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
        backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        avatarWrap: {
            marginTop: 8,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
        },
        avatarBox: {
            width: 240,
            height: 240,
            borderRadius: 16,
            backgroundColor: isDark ? colors.card : '#eef2ff',
            borderWidth: 2,
            borderColor: isDark ? colors.divider : '#c7d2fe',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        },
        baseAvatar: { fontSize: 56, fontWeight: '900', color: isDark ? colors.primary : '#4f46e5' },
        layerImg: { position: 'absolute', width: '90%', height: '90%' },
        shelfCard: {
            marginTop: 18,
            marginHorizontal: 16,
            padding: 12,
            borderRadius: 14,
            backgroundColor: isDark ? colors.card : '#f3f4f6',
            borderWidth: 1,
            borderColor: isDark ? colors.divider : 'rgba(15,23,42,0.08)',
        },
        gridCard: { alignItems: 'center' },
        gridThumb: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            overflow: 'hidden',
            backgroundColor: colors.imageBg,
        },
        badge: {
            position: 'absolute',
            top: 6,
            right: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor: colors.mutedBg,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: colors.card,
            zIndex: 10,
            elevation: 3,
        },
        equippedDot: {
            position: 'absolute',
            bottom: 6,
            right: 6,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.card,
        },
        empty: { textAlign: 'center', marginTop: 20 },
    });

    // Cargar inventario y filtrar ropa
    const listarRopa = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const resp = await fetchJson<InventarioResponse>('/item-inventario/listar');
            const arr = Array.isArray((resp as any)?.items) ? resp.items : [];

            const ropa = arr.filter((it) =>
                String(it?.item?.tipo ?? '').toUpperCase() === 'ROPA'
            );

            setItems(ropa);
        } catch (e: any) {
            setError(e?.message || 'No se pudo cargar la ropa del inventario');
        } finally {
            setLoading(false);
        }
    }, [fetchJson]);

    // Estado actual equipado (opcional; si tu backend no lo tiene, omite el fetch y deja vacío)
    const cargarEquipados = useCallback(async () => {
        try {
            const r = await fetchJson<{ equipped: number[] | string[] }>(GET_EQUIPPED_ENDPOINT);
            const map: EquippedMap = {};
            (r?.equipped ?? []).forEach((cod) => { map[String(cod)] = true; });
            setEquipped(map);
        } catch {
            // Silencioso: si no existe el endpoint, seguimos sin estado remoto
        }
    }, [fetchJson]);

    useEffect(() => {
        listarRopa();
        cargarEquipados();
    }, [listarRopa, cargarEquipados]);

    const initials = (nombre?: string, apellido?: string) => {
        const n = (nombre || '').trim();
        const a = (apellido || '').trim();
        return ((n ? n[0] : '') + (a ? a[0] : '')).toUpperCase() || '👤';
    };

    // Para demo simple usamos iniciales; si tienes capas de avatar reales, pinta aquí tus layers
    // a partir de `equipped`.

    const equipar = useCallback(async (it: ItemInventario) => {
        try {
            setWorking(true);
            await fetchJson(EQUIP_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ codItemInventario: it.cod }),
            });
            setEquipped((m) => ({ ...m, [String(it.cod)]: true }));
            Alert.alert('Listo', '¡Prenda equipada! Prepárate para el combate en Zenless Zone Zero 😎');
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No se pudo equipar la prenda');
        } finally {
            setWorking(false);
        }
    }, [fetchJson]);

    const quitar = useCallback(async (it: ItemInventario) => {
        try {
            setWorking(true);
            await fetchJson(UNEQUIP_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ codItemInventario: it.cod }),
            });
            setEquipped((m) => {
                const copy = { ...m };
                delete copy[String(it.cod)];
                return copy;
            });
            Alert.alert('Hecho', 'Prenda removida.');
        } catch (e: any) {
            Alert.alert('Ups', e?.message || 'No se pudo quitar la prenda');
        } finally {
            setWorking(false);
        }
    }, [fetchJson]);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
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
                <KeyboardAvoidingView
                    behavior={Platform.select({ ios: 'padding', android: undefined })}
                    style={{ flex: 1 }}
                >
                    {/* Avatar grande al centro */}
                    <View style={s.avatarWrap}>
                        <View style={s.avatarBox}>
                            {/* Base del avatar (usa tus iniciales o imagen base) */}
                            <Text style={s.baseAvatar}>AV</Text>

                            {/* Capas de ropa equipadas (render simbólico). Si quieres slots, itera por slots específicos */}
                            {items.filter((it) => equipped[String(it.cod)]).map((it) => (
                                <Image
                                    key={`layer-${it.cod}`}
                                    source={resolveItemIconFromBd(it.item.icon, isDark)}
                                    style={s.layerImg}
                                    contentFit="contain"
                                    cachePolicy="memory-disk"
                                    transition={120}
                                />
                            ))}
                        </View>
                        <Text style={[g.text.caption, { marginTop: 8, color: colors.mutedText }]}>
                            Toca una prenda para ver detalles y equiparla
                        </Text>
                    </View>

                    {/* Estante inferior con grilla (como tu mock) */}
                    <View style={s.shelfCard}>
                        <Text style={[g.text.h3]}>Tu ropa</Text>

                        <FlatList
                            data={items}
                            keyExtractor={(it) => String(it.cod)}
                            numColumns={COLS}
                            columnWrapperStyle={{ justifyContent: 'center', marginBottom: GRID_GAP }}
                            contentContainerStyle={{ paddingTop: 12 }}
                            ListEmptyComponent={<Text style={[g.text.body, g.text.muted, s.empty]}>Sin prendas todavía</Text>}
                            renderItem={({ item }) => {
                                const img = resolveItemIconFromBd(item.item.icon, isDark);
                                const isEquipped = !!equipped[String(item.cod)];
                                const cardH = Math.floor(CARD_W / CARD_RATIO);
                                return (
                                    <Pressable
                                        style={{ width: CARD_W, marginHorizontal: GRID_GAP / 2 }}
                                        onPress={() => openDetails(item)}
                                    >
                                        <View style={[s.gridThumb, { width: CARD_W, height: cardH }]}>
                                            <Image
                                                source={img}
                                                style={{ width: '100%', height: '100%' }}
                                                contentFit="contain"
                                                cachePolicy="memory-disk"
                                                transition={120}
                                                recyclingKey={`ropa-${item.cod}`}
                                            />
                                            {isEquipped && <View style={s.equippedDot} />}
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

            {/* Panel de detalles de la prenda */}
            <ClothingDetailsModal
                visible={detailsOpen}
                item={selected ?? undefined}
                onClose={closeDetails}
                onEquip={equipar}
                onUnequip={quitar}
                working={working}
                equipped={!!(selected && equipped[String(selected.cod)])}
                accentColor={colors.primary}
            />
        </SafeAreaView>
    );
}

/* ===== Modal interno de detalles (muy parecido a tu DetailsInventoryItemModal) ===== */
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
                                  visible,
                                  item,
                                  equipped = false,
                                  working = false,
                                  onClose,
                                  onEquip,
                                  onUnequip,
                                  accentColor,
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
            borderRadius: 16,
            backgroundColor: colors.card,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.divider,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 12,
            elevation: 10,
        },
        mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
        iconWrap: {
            width: 92,
            height: 92,
            borderRadius: 12,
            backgroundColor: colors.imageBg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
        btn: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
        },
        cancelBtn: {
            borderWidth: 1.5,
            borderColor: colors.inputBorder,
            backgroundColor: colors.card,
        },
        actionBtn: {
            backgroundColor: colors.primary,
            opacity: working ? 0.6 : 1,
        },
        removeBtn: {
            backgroundColor: isDark ? '#7c3aed' : '#111827',
            opacity: working ? 0.6 : 1,
        },
        pill: {
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            alignSelf: 'flex-start',
            borderWidth: 1.5,
            borderColor: accentColor || colors.primary,
        },
    });

    return (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        >
            <Pressable style={s.backdrop} onPress={onClose} />
            <View style={s.center}>
                <Pressable style={s.card} onPress={() => {}}>
                    <Text style={[g.text.title, { marginBottom: 18 }]} numberOfLines={2}>
                        {nombre}
                    </Text>

                    <View style={s.mediaRow}>
                        <View style={s.iconWrap}>
                            <Image
                                source={localImg}
                                style={{ width: 92, height: 92, borderRadius: 12 }}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                                transition={120}
                            />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={[g.text.body, g.text.secondary]} numberOfLines={5}>
                                {descripcion}
                            </Text>
                            <View style={{ marginTop: 8 }}>
                                <Text style={g.text.bodyStrong}>
                                    Cantidad: <Text style={{ fontWeight: '900' }}>x{cantidad}</Text>
                                </Text>
                                <View style={s.pill}>
                                    <Text style={[g.text.smallStrong, { color: accentColor || colors.primary }]}>
                                        Tipo: ROPA — equípala para mostrarla en tu avatar
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
                            <Pressable
                                onPress={() => !working && onUnequip(item)}
                                disabled={working}
                                style={[s.btn, s.removeBtn]}
                            >
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {working ? 'Procesando…' : 'Quitar'}
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                onPress={() => !working && onEquip(item)}
                                disabled={working || cantidad <= 0}
                                style={[s.btn, s.actionBtn]}
                            >
                                <Text style={[g.text.smallStrong, g.text.onPrimary]}>
                                    {working ? 'Procesando…' : cantidad > 0 ? 'Equipar' : 'Sin stock'}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </Pressable>
            </View>
        </View>
    );
}
