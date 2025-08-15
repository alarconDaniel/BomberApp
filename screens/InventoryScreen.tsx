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
} from 'react-native';
import Constants from 'expo-constants';
import type { RouteProp } from '@react-navigation/native';

/** =======================
 *  CONFIG ROBUSTA DE HOST
 *  ======================= */
const PORT = 3550;

/** Intenta deducir el host del bundler de Expo/Metro */
function resolveDevHost(): string | null {
    // Expo moderno
    const expoHost =
        (Constants.expoConfig?.hostUri as string | undefined) ||
        // compatibilidad con manifest antiguos
        (Constants as any)?.manifest?.debuggerHost ||
        (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

    if (expoHost) {
        const h = expoHost.split(':')[0];
        if (h && h !== 'localhost') return h;
    }

    // React Native CLI / fallback
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    const match = scriptURL?.match(/\/\/(.*?):\d+/);
    const host = match?.[1];
    return host ?? null;
}

/** Devuelve el BASE_URL correcto para iOS/Android/emulador/dispositivo */
function resolveBaseUrl(): string {
    const host = resolveDevHost();

    // Emulador Android: si el host es "localhost" o no viene, usa 10.0.2.2
    if (Platform.OS === 'android' && (!host || host === 'localhost')) {
        return `http://10.0.2.2:${PORT}`;
    }

    // iOS simulador: "localhost" funciona; dispositivo físico: Expo suele dar IP LAN
    return `http://${host ?? 'localhost'}:${PORT}`;
}

/** ===============
 *  TIPADOS BÁSICOS
 *  =============== */
type Item = { id: number; name: string; count: number };

type InventoryScreenRoute = RouteProp<
    Record<string, { cod_usuario?: number }>,
    string
>;

type Props = {
    route?: InventoryScreenRoute;
};

const DEFAULT_USER_ID = 1;

/** ========================
 *  COMPONENTE PRINCIPAL
 *  ======================== */
export default function InventoryScreen({ route }: Props) {
    const BASE_URL = useMemo(resolveBaseUrl, []);
    const userId = route?.params?.cod_usuario ?? DEFAULT_USER_ID;

    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const mounted = useRef(true);

    const mapRows = (data: any): Item[] => {
        const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        return arr.map((row: any, i: number) => ({
            id: row.cod_item_inventario ?? row.id ?? i,
            name: row.nombre_item ?? `Item ${row.cod_item ?? '?'}`,
            count: row.cantidad_item ?? row.count ?? 0,
        }));
    };

    const fetchWithTimeout = async (url: string, ms = 10000, signal?: AbortSignal) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: signal ?? controller.signal });
            return res;
        } finally {
            clearTimeout(timeout);
        }
    };

    const load = useCallback(async () => {
        setErrorMsg(null);
        const controller = new AbortController();
        try {
            // 1) Intento principal: por usuario
            const urlByUser = `${BASE_URL}/item-inventario/usuario/${userId}`;
            console.log('[INV] GET', urlByUser);
            let res = await fetchWithTimeout(urlByUser, 10000, controller.signal);

            // 2) Fallback si 404/500: /listar
            if (!res.ok) {
                const urlListar = `${BASE_URL}/item-inventario/listar`;
                console.log('[INV] fallback GET', urlListar, 'status=', res.status);
                res = await fetchWithTimeout(urlListar, 10000, controller.signal);
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();
            const mapped = mapRows(json);
            if (mounted.current) setItems(mapped);
        } catch (e: any) {
            console.warn('[INV] error', e?.message || e);
            if (mounted.current) setErrorMsg(e?.message || 'Error de red');
        } finally {
            if (mounted.current) setLoading(false);
        }
        return () => controller.abort();
    }, [BASE_URL, userId]);

    useEffect(() => {
        mounted.current = true;
        load();
        return () => {
            mounted.current = false;
        };
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const renderItem = useCallback(
        ({ item }: { item: Item }) => (
            <Pressable style={styles.card} onPress={() => { /* detalle o acción */ }}>
                <View style={styles.placeholder}>
                    <View style={[styles.cross, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.cross, { transform: [{ rotate: '-45deg' }] }]} />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>x{item.count}</Text>
                    </View>
                </View>
                <Text style={styles.cardLabel}>{item.name}</Text>
            </Pressable>
        ),
        []
    );

    const contentEmpty =
        !loading && !errorMsg ? <Text style={styles.empty}>Sin ítems todavía</Text> : null;

    return (
        <View style={styles.screen}>
            <Text style={styles.title}>Inventario</Text>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.hint}>
                        Consultando inventario en {BASE_URL} (usuario {userId})
                    </Text>
                </View>
            ) : errorMsg ? (
                <View style={styles.center}>
                    <Text style={styles.error}>No se pudo cargar el inventario.</Text>
                    <Text style={styles.hint}>
                        {`Revísalo:\n• Backend en puerto ${PORT}\n• Mismo Wi-Fi si usas teléfono\n• Firewall permite ${PORT}\n• URL base: ${BASE_URL}`}
                    </Text>
                    <Pressable onPress={onRefresh} style={[styles.retryBtn]}>
                        <Text style={styles.retryTxt}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(it, i) => String(it.id ?? i)}
                    renderItem={renderItem}
                    numColumns={3}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={contentEmpty}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
}

/** ========================
 *  ESTILOS (wireframe-like)
 *  ======================== */
const CARD = 84;

const styles = StyleSheet.create({
    screen: { flex: 1, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 90 },
    title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
    row: { justifyContent: 'space-between', marginBottom: 24 },
    listContent: { paddingBottom: 24 },
    card: { width: CARD, alignItems: 'center' },
    placeholder: {
        width: CARD,
        height: CARD * 1.3,
        backgroundColor: '#D9D9D9',
        borderRadius: 6,
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
        backgroundColor: '#BDBDBD',
        borderRadius: 999,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 26,
        alignItems: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#1E1E1E' },
    cardLabel: { marginTop: 6, fontSize: 12, fontWeight: '600' },
    empty: { textAlign: 'center', marginTop: 40, color: '#666' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    error: { color: '#c00', fontWeight: '600', textAlign: 'center' },
    hint: { color: '#555', textAlign: 'center' },
    retryBtn: {
        marginTop: 12,
        backgroundColor: '#007bff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryTxt: { color: '#fff', fontWeight: '600' },
});
