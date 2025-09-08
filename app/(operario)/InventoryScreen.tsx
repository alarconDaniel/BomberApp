// app/(operario)/InventoryScreen.tsx
import React, {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    Alert,
} from 'react-native';
import type {RouteProp} from '@react-navigation/native';

import {useAuth} from '../../auth/AuthContext';
import {ItemInventario, InventarioResponse} from '../../models/ItemInventario';
import FadeWrapper from '../../components/operario/FadeWrapper';
import DetailsInventoryItemModal from "../../components/operario/DetailsInventoryItemModal";
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import ChestOpenModal from '../../components/operario/ChestOpenModal';
import { Image } from 'expo-image';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';


export default function InventoryScreen() {
    const {fetchJson} = useAuth();
    const { colors, isDark } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);

    const [items, setItems] = useState<ItemInventario[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const mounted = useRef(true);

    const [selected, setSelected] = useState<ItemInventario | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const [opening, setOpening] = useState(false);
    const [openModal, setOpenModal] = useState<{
        visible: boolean;
        size: 'pequeno' | 'medio' | 'grande';
        rewards: { codItem: number; nombre: string; tipo: string; cantidad: number }[];
    }>({ visible: false, size: 'pequeno', rewards: [] });

    const openDetails = (it: ItemInventario) => {
        setSelected(it);
        setDetailsOpen(true);
    };
    const closeDetails = () => {
        setDetailsOpen(false);
        setTimeout(() => setSelected(null), 200);
    };

    const {width, height} = useWindowDimensions();

    // Layout
    const H_PADDING = 16;
    const GAP = 16;
    const ROW_GAP = 24;
    const CARD_RATIO = 0.75;
    const TITLE_TOP = Math.round(height * 0.08);
    const GRID_TOP_OFFSET = 24;

    const COLS = useMemo(() => {
        if (width >= 1100) return 6;
        if (width >= 900) return 5;
        if (width >= 680) return 4;
        return 3;
    }, [width]);

    const CARD_W = useMemo(() => {
        const totalGaps = GAP * (COLS - 1);
        const totalHorizontal = width - H_PADDING * 2 - totalGaps;
        return Math.floor(totalHorizontal / COLS);
    }, [width, H_PADDING, GAP, COLS]);

    const listarInventario = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);

            const resp = await fetchJson<InventarioResponse>('/item-inventario/listar');

            const arr = Array.isArray((resp as any)?.items) ? resp.items : [];
            if (mounted.current) {
                setItems(arr);
                setTotal(resp?.total ?? arr.length);
            }
        } catch (e: any) {
            if (mounted.current) setError(e?.message || 'Error de red cargando inventario');
        } finally {
            if (mounted.current) setCargando(false);
        }
    }, [fetchJson]);

    useEffect(() => {
        mounted.current = true;
        listarInventario();
        return () => {
            mounted.current = false;
        };
    }, [listarInventario]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await listarInventario();
        setRefreshing(false);
    }, [listarInventario]);

    // 🧩 COFRES: handler de apertura
    const handleOpenChest = useCallback(async (it: ItemInventario) => {
        try {
            if (!it?.item?.tipo || String(it.item.tipo).toUpperCase() !== 'COFRE') {
                Alert.alert('No es un cofre', 'Este ítem no se puede abrir.');
                return;
            }
            if (Number(it.cantidad) <= 0) {
                Alert.alert('Sin cofres', 'No te queda cantidad de este cofre.');
                return;
            }
            setOpening(true);
            // POST al backend
            const resp = await fetchJson<any>('/item-inventario/abrir-cofre', {
                method: 'POST',
                body: JSON.stringify({ codItemInventario: it.cod }),
            });

            // Cierra detalle y muestra modal de apertura
            setDetailsOpen(false);
            setTimeout(() => {
                setOpenModal({
                    visible: true,
                    size: resp?.chest?.size ?? 'pequeno',
                    rewards: Array.isArray(resp?.rewards) ? resp.rewards : [],
                });
            }, 180);

            // Refresca inventario (para ver cantidad actualizada y nuevos ítems)
            await listarInventario();
        } catch (e: any) {
            Alert.alert('No se pudo abrir', e?.message ?? 'Error al abrir cofre');
        } finally {
            setOpening(false);
        }
    }, [fetchJson, listarInventario]);

    const styles = StyleSheet.create({
        screen: {
            flex: 1,
            paddingTop: 18,
            paddingBottom: 16,
            backgroundColor: colors.bg,
        },
        centerBox: {
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingHorizontal: 16,
        },
        card: {
            alignItems: 'center',
        },
        imageBox: {
            backgroundColor: colors.imageBg,
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
            justifyContent: 'center',
            alignItems: 'center',
        },
        cross: {position: 'absolute', width: '140%', height: 2, backgroundColor: colors.outline},
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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            elevation: 3,
        },
        cardLabel: {
            marginTop: 6,
            textAlign: 'center',
            color: colors.text,
        },
        empty: {textAlign: 'center', marginTop: 40},
    });

    if (cargando) {
        return (
            <View style={[styles.centerBox, {flex: 1, backgroundColor: colors.bg}]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[g.text.caption, g.text.muted]}>Cargando inventario…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centerBox, {flex: 1, backgroundColor: colors.bg}]}>
                <Text
                    style={[g.text.bodyStrong, g.text.danger, {textAlign: 'center', marginBottom: 12, paddingHorizontal: 60}]}
                >
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable
                    onPress={listarInventario}
                    style={{padding: 12, backgroundColor: colors.mutedBg, borderRadius: 8}}
                >
                    <Text style={g.text.body}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={[styles.screen, {paddingHorizontal: H_PADDING}]}>
                <Text style={[g.text.h1, {textAlign: 'center', marginTop: TITLE_TOP}]}>
                    Inventario {items.length ? `(${items.length})` : ''}
                </Text>

                <FlatList
                    data={items}
                    keyExtractor={(it) => String(it.cod)}
                    renderItem={({item}) => (
                        <Pressable
                            style={[styles.card, {width: CARD_W, marginHorizontal: GAP / 2}]}
                            onPress={() => openDetails(item)}
                        >
                            <View style={[styles.imageBox, {width: CARD_W, height: CARD_W / CARD_RATIO}]}>
                                {/* reemplaza las cruces por la imagen */}
                                 <Image
                                   source={resolveItemIconFromBd(item.item.icon, isDark)}
                                   style={{ width: '70%', height: '70%' }}
                                   contentFit="contain"
                                   cachePolicy="memory-disk"
                                   transition={120}
                                   recyclingKey={String(item.cod)}
                                 />

                                <View style={styles.badge}>
                                    <Text style={g.text.captionStrong}>x{item.cantidad}</Text>
                                </View>
                            </View>
                            <Text style={[g.text.captionStrong, styles.cardLabel]}>
                                {item.item.nombre}
                            </Text>
                        </Pressable>
                    )}
                    numColumns={COLS}
                    columnWrapperStyle={{justifyContent: 'center', marginBottom: ROW_GAP}}
                    contentContainerStyle={{paddingTop: GRID_TOP_OFFSET, paddingBottom: 8}}
                    ListEmptyComponent={<Text style={[g.text.body, g.text.muted, styles.empty]}>Sin ítems todavía</Text>}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                />
            </View>

            {/* 👇 Modal de inventario */}
            <DetailsInventoryItemModal
                visible={detailsOpen}
                item={selected ?? undefined}
                onClose={closeDetails}
                accentColor={colors.primary}
                showDate={true}
                // 🧩 COFRES: pasamos props especiales vía any (ver componente abajo)
                // @ts-ignore
                onOpenChest={selected && String(selected.item?.tipo).toUpperCase() === 'COFRE'
                    ? () => handleOpenChest(selected)
                    : undefined}
                opening={opening}
            />

            <ChestOpenModal
                visible={openModal.visible}
                size={openModal.size}
                rewards={openModal.rewards}
                onClose={() => setOpenModal(s => ({ ...s, visible: false }))}
            />
        </FadeWrapper>
    );
}
