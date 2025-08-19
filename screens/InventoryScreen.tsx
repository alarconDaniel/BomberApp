import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    NativeModules,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import Constants from 'expo-constants';
import type { RouteProp } from '@react-navigation/native';

const PORT = 3550;

function resolveDevHost(): string | null {
    const expoHost =
        (Constants.expoConfig?.hostUri as string | undefined) ||
        (Constants as any)?.manifest?.debuggerHost ||
        (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

    if (expoHost) {
        const h = expoHost.split(':')[0];
        if (h && h !== 'localhost') return h;
    }

    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    const match = scriptURL?.match(/\/\/(.*?):\d+/);
    const host = match?.[1];
    return host ?? null;
}

function resolveBaseUrl(): string {
    const host = resolveDevHost();
    if (Platform.OS === 'android' && (!host || host === 'localhost')) {
        return `http://10.0.2.2:${PORT}`;
    }
    return `http://${host ?? 'localhost'}:${PORT}`;
}

type Item = { id: number; name: string; count: number };

type InventoryScreenRoute = RouteProp<
    Record<string, { cod_usuario?: number }>,
    string
>;

type Props = { route?: InventoryScreenRoute };

const DEFAULT_USER_ID = 1;

export default function InventoryScreen({ route }: Props) {
    const BASE_URL = useMemo(resolveBaseUrl, []);
    const userId = route?.params?.cod_usuario ?? DEFAULT_USER_ID;

    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const mounted = useRef(true);

    const { width, height } = useWindowDimensions();

    const H_PADDING = 16;
    const GAP = 16;
    const ROW_GAP = 24;
    const CARD_RATIO = 0.75;
    const TITLE_TOP = Math.max(120, Math.round(height * 0.25));
    // ↓ aquí se bajan las cartas un poco
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

    const mapRows = (data: any): Item[] => {
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        return arr.map((row: any, i: number) => ({
            id: row.cod_item_inventario ?? row.id ?? i,
            name: row.nombre_item ?? `Item ${row.cod_item ?? '?'}`,
            count: row.cantidad_item ?? row.count ?? 0,
        }));
    };

    const fetchWithTimeout = async (url: string, ms = 10000, extSignal?: AbortSignal) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        const onExternalAbort = () => controller.abort();
        extSignal?.addEventListener('abort', onExternalAbort, { once: true });

        try {
            const res = await fetch(url, { signal: controller.signal });
            return res;
        } finally {
            clearTimeout(timeout);
            extSignal?.removeEventListener?.('abort', onExternalAbort as any);
        }
    };

    const load = useCallback(
        async (signal?: AbortSignal) => {
            setErrorMsg(null);
            try {
                const urlByUser = `${BASE_URL}/item-inventario/usuario/${userId}`;
                let res = await fetchWithTimeout(urlByUser, 10000, signal);

                if (!res.ok) {
                    const urlListar = `${BASE_URL}/item-inventario/listar`;
                    res = await fetchWithTimeout(urlListar, 10000, signal);
                }
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const json = await res.json();
                const mapped = mapRows(json);
                if (mounted.current) setItems(mapped);
            } catch (e: any) {
                if (mounted.current) setErrorMsg(e?.message || 'Error de red');
            } finally {
                if (mounted.current) setLoading(false);
            }
        },
        [BASE_URL, userId]
    );

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        load(controller.signal);
        return () => {
            mounted.current = false;
            controller.abort();
        };
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const controller = new AbortController();
        await load(controller.signal).finally(() => controller.abort());
        setRefreshing(false);
    }, [load]);

    const renderItem = useCallback(
        ({ item }: { item: Item }) => (
            <Pressable
                style={[styles.card, { width: CARD_W, marginHorizontal: GAP / 2 }]}
                onPress={() => {}}
            >
                <View style={[styles.imageBox, { width: CARD_W, height: CARD_W / CARD_RATIO }]}>
                    <View style={[styles.cross, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.cross, { transform: [{ rotate: '-45deg' }] }]} />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>x{item.count}</Text>
                    </View>
                </View>
                <Text style={styles.cardLabel} numberOfLines={1}>
                    {item.name}
                </Text>
            </Pressable>
        ),
        [CARD_W, GAP, CARD_RATIO]
    );

    const contentEmpty =
        !loading && !errorMsg ? <Text style={styles.empty}>Sin ítems todavía</Text> : null;

    return (
        <View style={[styles.screen, { paddingHorizontal: H_PADDING }]}>
            <Text style={[styles.title, { marginTop: TITLE_TOP - 90 }]}>Inventario</Text>

            {loading ? (
                <View style={[styles.centerBox, { paddingTop: GRID_TOP_OFFSET }]}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.hint}>
                        Consultando inventario en {BASE_URL} (usuario {userId})
                    </Text>
                </View>
            ) : errorMsg ? (
                <View style={[styles.centerBox, { paddingTop: GRID_TOP_OFFSET }]}>
                    <Text style={styles.error}>No se pudo cargar el inventario.</Text>
                    <Text style={styles.hint}>
                        {`Revísalo:\n• Backend en puerto ${PORT}\n• Mismo Wi-Fi si usas teléfono\n• Firewall permite ${PORT}\n• URL base: ${BASE_URL}\n• Error: ${errorMsg}`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(it, i) => String(it.id ?? i)}
                    renderItem={renderItem}
                    numColumns={COLS}
                    columnWrapperStyle={{ justifyContent: 'center', marginBottom: ROW_GAP }}
                    contentContainerStyle={{ paddingTop: GRID_TOP_OFFSET, paddingBottom: 8 }}
                    ListEmptyComponent={contentEmpty}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}
        </View>
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
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

    cross: { position: 'absolute', width: '140%', height: 2, backgroundColor: '#777' },

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
    badgeText: { fontSize: 12, fontWeight: '700', color: '#1E1E1E' },

    cardLabel: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    empty: { textAlign: 'center', marginTop: 40, color: '#666' },
    error: { color: '#c00', fontWeight: '600', textAlign: 'center' },
    hint: { color: '#555', textAlign: 'center' },
});

