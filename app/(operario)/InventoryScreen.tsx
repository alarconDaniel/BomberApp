// app/(operario)/InventoryScreen.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    SectionList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    Alert,
} from 'react-native';

import {useAuth} from '../../auth/AuthContext';
import {ItemInventario, InventarioResponse} from '../../models/ItemInventario';
import FadeWrapper from '../../components/operario/FadeWrapper';
import DetailsInventoryItemModal from '../../components/operario/DetailsInventoryItemModal';
import {useTheme} from '../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../theme/GlobalStyles';
import ChestOpenModal from '../../components/operario/ChestOpenModal';
import {Image} from 'expo-image';
import {resolveItemIconFromBd} from '../../config/icons/itemIcons';

type SectionKey = 'POTENCIADOR' | 'COFRE' | 'ROPA';
type Section = { key: SectionKey; title: string; items: ItemInventario[] };

// Cada fila de la grilla es un arreglo de ítems (máx COLS)
type Row = ItemInventario[];

export default function InventoryScreen() {
    const {fetchJson} = useAuth();
    const {colors, isDark} = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);

    const [items, setItems] = useState<ItemInventario[]>([]);
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
    }>({visible: false, size: 'pequeno', rewards: []});

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
    const TITLE_TOP = Math.round(height * 0.05);

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
    const handleOpenChest = useCallback(
        async (it: ItemInventario) => {
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
                const resp = await fetchJson<any>('/item-inventario/abrir-cofre', {
                    method: 'POST',
                    body: JSON.stringify({codItemInventario: it.cod}),
                });

                setDetailsOpen(false);
                setTimeout(() => {
                    setOpenModal({
                        visible: true,
                        size: resp?.chest?.size ?? 'pequeno',
                        rewards: Array.isArray(resp?.rewards) ? resp.rewards : [],
                    });
                }, 180);

                await listarInventario();
            } catch (e: any) {
                Alert.alert('No se pudo abrir', e?.message ?? 'Error al abrir cofre');
            } finally {
                setOpening(false);
            }
        },
        [fetchJson, listarInventario],
    );

    const styles = StyleSheet.create({
        centerBox: {
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingHorizontal: 16,
            flex: 1,
            backgroundColor: colors.bg,
        },
        titleWrap: {
            paddingHorizontal: H_PADDING,
            paddingTop: 18,
            paddingBottom: 8,
            backgroundColor: colors.bg,
        },
        sectionHeaderWrap: {
            paddingHorizontal: H_PADDING,
            paddingTop: 12,
            paddingBottom: 4,
            backgroundColor: colors.bg, // para sticky
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            paddingHorizontal: H_PADDING,
            marginBottom: ROW_GAP,
        },
        cell: {
            width: CARD_W,
            marginRight: GAP,
            alignItems: 'center',
        },
        cellLast: {
            marginRight: 0,
        },
        imageBox: {
            backgroundColor: colors.imageBg,
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
            justifyContent: 'center',
            alignItems: 'center',
            width: CARD_W,
            height: CARD_W / CARD_RATIO,
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
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            elevation: 3,
        },
        cardLabel: {marginTop: 6, textAlign: 'center', color: colors.text},
        empty: {textAlign: 'center', marginTop: 40},
    });

    // --- Secciones base ---
    const sectionsBase: Section[] = useMemo(() => {
        const by = (tipo: SectionKey) =>
            items.filter((it) => String(it.item.tipo).toUpperCase() === tipo);
        return [
            {key: 'POTENCIADOR', title: 'Artículos', items: by('POTENCIADOR')},
            {key: 'COFRE', title: 'Cofres', items: by('COFRE')},
            {key: 'ROPA', title: 'Ropa', items: by('ROPA')}, // limitada a 3 desde backend
        ];
    }, [items]);

    // --- Util: partir un array en filas de tamaño n ---
    const chunk = (arr: ItemInventario[], n: number): Row[] => {
        const out: Row[] = [];
        for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
        return out;
    };

    // --- Secciones para SectionList: filtra vacías y arma filas ---
    const sectionsForList = useMemo(
        () =>
            sectionsBase
                .filter((s) => s.items.length > 0) // ⬅️ no mostrar secciones vacías
                .map((s) => ({
                    key: s.key,
                    title: s.title,
                    data: chunk(s.items, COLS), // Row[]
                })),
        [sectionsBase, COLS],
    );

    const allEmpty = sectionsForList.length === 0;

    if (cargando) {
        return (
            <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[g.text.caption, g.text.muted]}>Cargando inventario…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerBox}>
                <Text
                    style={[
                        g.text.bodyStrong,
                        g.text.danger,
                        {textAlign: 'center', marginBottom: 12, paddingHorizontal: 60},
                    ]}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable
                    onPress={listarInventario}
                    style={{padding: 12, backgroundColor: colors.mutedBg, borderRadius: 8}}>
                    <Text style={g.text.body}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <SectionList
                sections={sectionsForList}
                keyExtractor={(row, index) => `row-${index}`}
                stickySectionHeadersEnabled
                ListHeaderComponent={
                    <View style={styles.titleWrap}>
                        <Text style={[g.text.h1, {textAlign: 'center', marginTop: TITLE_TOP}]}>
                            Inventario {items.length ? `(${items.length})` : ''}
                        </Text>
                    </View>
                }
                renderSectionHeader={({section}) => (
                    <View style={styles.sectionHeaderWrap}>
                        <Text style={g.text.h3}>{section.title}</Text>
                    </View>
                )}
                renderItem={({item: row}) => {
                    // row es ItemInventario[] (máx COLS)
                    const fillers = Array(Math.max(0, COLS - row.length)).fill(null);
                    return (
                        <View style={styles.row}>
                            {row.map((it, idx) => {
                                const isLast = idx === row.length - 1 && fillers.length === 0;
                                return (
                                    <Pressable
                                        key={it.cod}
                                        style={[styles.cell, isLast && styles.cellLast]}
                                        onPress={() => openDetails(it)}>
                                        <View style={styles.imageBox}>
                                            <Image
                                                source={resolveItemIconFromBd(it.item.icon, isDark)}
                                                style={{width: '70%', height: '70%'}}
                                                contentFit="contain"
                                                cachePolicy="memory-disk"
                                                transition={120}
                                                recyclingKey={String(it.cod)}
                                            />
                                            <View style={styles.badge}>
                                                <Text style={g.text.captionStrong}>x{it.cantidad}</Text>
                                            </View>
                                        </View>
                                        <Text style={[g.text.captionStrong, styles.cardLabel]} numberOfLines={2}>
                                            {it.item.nombre}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                            {/* “fillers” invisibles para completar la fila y que las tarjetas mantengan el espaciado */}
                            {fillers.map((_, i) => (
                                <View
                                    // eslint-disable-next-line react/no-array-index-key
                                    key={`filler-${i}`}
                                    style={[styles.cell, i === fillers.length - 1 && styles.cellLast]}
                                    pointerEvents="none"
                                />
                            ))}
                        </View>
                    );
                }}
                contentContainerStyle={{paddingBottom: 8, backgroundColor: colors.bg}}
                ListEmptyComponent={
                    allEmpty ? (
                        <Text style={[g.text.body, g.text.muted, styles.empty]}>
                            Todavía no tienes items, ¡cómpralos en la tienda!
                        </Text>
                    ) : (
                        // Esto no debería mostrarse, pero lo dejamos por si alguna sección queda sin filas renderizables
                        <Text style={[g.text.body, g.text.muted, styles.empty]}>Sin ítems todavía</Text>
                    )
                }
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            {/* 👇 Modal de inventario */}
            <DetailsInventoryItemModal
                visible={detailsOpen}
                item={selected ?? undefined}
                onClose={closeDetails}
                accentColor={colors.primary}
                showDate={true}
                // @ts-ignore
                onOpenChest={
                    selected && String(selected.item?.tipo).toUpperCase() === 'COFRE'
                        ? () => handleOpenChest(selected)
                        : undefined
                }
                opening={opening}
            />

            <ChestOpenModal
                visible={openModal.visible}
                size={openModal.size}
                rewards={openModal.rewards}
                onClose={() => setOpenModal((s) => ({...s, visible: false}))}
            />
        </FadeWrapper>
    );
}
