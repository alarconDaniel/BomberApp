// InventoryScreen.tsx
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
} from 'react-native';
import type {RouteProp} from '@react-navigation/native';

import {useAuth} from '../../auth/AuthContext';
import {ItemInventario, InventarioResponse} from '../../models/ItemInventario';
import FadeWrapper from '../../components/FadeWrapper';
import DetailsInventoryItemModal from "../../components/DetailsInventoryItemModal";

type InventoryScreenRoute = RouteProp<
    Record<string, { cod_usuario?: number }>,
    string
>;
type Props = { route?: InventoryScreenRoute };

export default function InventoryScreen({route}: Props) {
    const {fetchJson} = useAuth();

    const [items, setItems] = useState<ItemInventario[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const mounted = useRef(true);

    const [selected, setSelected] = useState<ItemInventario | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

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

            // ahora esperamos { usuario, items, total }
            const resp = await fetchJson<InventarioResponse>('/item-inventario/listar');

            console.log('Respuesta inventario:', resp);

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


    const renderItem = useCallback(
        ({item}: { item: ItemInventario }) => (
            <Pressable
                style={[styles.card, {width: CARD_W, marginHorizontal: GAP / 2}]}
                onPress={() => openDetails(item)}
            >
                <View style={[styles.imageBox, {width: CARD_W, height: CARD_W / CARD_RATIO}]}>
                    <View style={[styles.cross, {transform: [{rotate: '45deg'}]}]}/>
                    <View style={[styles.cross, {transform: [{rotate: '-45deg'}]}]}/>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>x{item.cantidad}</Text>
                    </View>
                </View>
                <Text style={styles.cardLabel}>
                    {item.item.nombre}
                </Text>
            </Pressable>
        ),
        [CARD_W, GAP, CARD_RATIO]
    );

    // === Estados cargando/error ===
    if (cargando) {
        return (
            <View style={[styles.centerBox, {flex: 1}]}>
                <ActivityIndicator size="large" />
                <Text style={styles.hint}>Cargando inventario…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centerBox, {flex: 1}]}>
                <Text style={[styles.error, {marginBottom: 12, paddingHorizontal: 60}]}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable
                    onPress={listarInventario}
                    style={{padding: 12, backgroundColor: '#e5e7eb', borderRadius: 8}}
                >
                    <Text>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={[styles.screen, {paddingHorizontal: H_PADDING}]}>
                <Text style={[styles.title, {marginTop: TITLE_TOP}]}>Inventario {items.length ? `(${items.length})` : ''}</Text>

                <FlatList
                    data={items}
                    keyExtractor={(it) => String(it.cod)}
                    renderItem={renderItem}
                    numColumns={COLS}
                    columnWrapperStyle={{justifyContent: 'center', marginBottom: ROW_GAP}}
                    contentContainerStyle={{paddingTop: GRID_TOP_OFFSET, paddingBottom: 8}}
                    ListEmptyComponent={<Text style={styles.empty}>Sin ítems todavía</Text>}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                />
            </View>

            {/* 👇 Modal de inventario */}
            <DetailsInventoryItemModal
                visible={detailsOpen}
                item={selected ?? undefined}
                onClose={closeDetails}
                accentColor="#3B82F6"
                showDate={true} // cámbialo a false si no quieres mostrar la fecha
            />
        </FadeWrapper>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingTop: 18,
        paddingBottom: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 40,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 0,
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
        backgroundColor: '#D9D9D9',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cross: {position: 'absolute', width: '140%', height: 2, backgroundColor: '#777'},
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: '#BDBDBD',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        elevation: 3,
    },
    badgeText: {fontSize: 12, fontWeight: '700', color: '#1E1E1E'},
    cardLabel: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    empty: {textAlign: 'center', marginTop: 40, color: '#666'},
    error: {color: '#c00', fontWeight: '600', textAlign: 'center'},
    hint: {color: '#555', textAlign: 'center'},
});
