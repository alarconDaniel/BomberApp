// app/(tabs)/StoreScreen.tsx
import React, {useEffect, useMemo, useState} from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    Pressable,
    StyleSheet,
    FlatList,
    ScrollView,
    Dimensions,
} from 'react-native';
import {useRouter} from 'expo-router';
import {ItemTienda} from '../../models/ItemTienda';
import FadeWrapper from '../../components/FadeWrapper';
import StoreItemCard from '../../components/StoreItemCard';
import DetailsStoreItemModal from '../../components/DetailsStoreItemModal';
import {useAuth} from '../../auth/AuthContext';
import {StatsUsuario} from '../../models/StatsUsuario';
import PurchaseSuccessOverlay from '../../components/PurchaseSuccessOverlay';
import {useToast} from '../../components/ToastProvider';
import {useTheme} from '../../theme/ThemeProvider';

const {width: SCREEN_W} = Dimensions.get('window');

type SectionKey = 'POTENCIADOR' | 'COFRE' | 'ROPA';
type Section = { key: SectionKey; title: string; items: ItemTienda[] };

function toItemTienda(raw: any): ItemTienda {
    const meta = typeof raw.metadataItem === 'string'
        ? JSON.parse(raw.metadataItem)
        : raw.metadataItem ?? {};
    return new ItemTienda(
        raw.codItem ?? raw.cod ?? 0,
        raw.nombreItem ?? raw.nombre ?? 'Item',
        raw.desripcionItem ?? raw.descripcion ?? '',
        Number(raw.precioItem ?? raw.precio ?? 0),
        String(raw.tipoItem ?? raw.tipo ?? '').toUpperCase(),
        meta
    );
}

// trae stats locales
type Stats = { codUsuario: number; racha: number; monedas: number; xp: number; nivel: number };

export default function StoreScreen() {
    const toast = useToast();
    const [successInfo, setSuccessInfo] = useState<{ name: string; qty: number } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const [stats, setStats] = useState<StatsUsuario>({ codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0 });

    const { fetchJson } = useAuth();
    const [comprando, setComprando] = useState(false);

    const { colors, isDark, utils } = useTheme() as any;
    const s = useMemo(() => makeStyles(colors, isDark, utils), [colors, isDark, utils]);

    const listarStats = async () => {
        try {
            const data = await fetchJson<Stats>('/mis-stats/listar');
            if (data) setStats(data);
        } catch {}
    };

    const router = useRouter();
    const [items, setItems] = useState<ItemTienda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Para los detalles
    const [selected, setSelected] = useState<ItemTienda | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const openDetails = (it: ItemTienda) => {
        setSelected(it);
        setDetailsOpen(true);
    };
    const closeDetails = () => {
        setDetailsOpen(false);
        setTimeout(() => setSelected(null), 200);
    };

    const handleBuy = async (it: ItemTienda, qty: number) => {
        try {
            setComprando(true);
            await fetchJson('/item-tienda/comprar', { method: 'POST', body: JSON.stringify({ codItem: it.codItem, cantidad: qty }) });
            await listarStats();
            closeDetails();
            setTimeout(() => {
                setSuccessInfo({ name: it.nombreItem, qty });
                setShowSuccess(true);
            }, 240);
        } catch (e: any) {
            alert(e?.message ?? 'No se pudo completar la compra');
        } finally {
            setComprando(false);
        }
    };

    const listarItems = async () => {
        try {
            setCargando(true);
            setError(null);
            const resultado = await fetchJson<any[]>('/item-tienda/listar');
            const mapeados: ItemTienda[] = (resultado ?? []).map(toItemTienda);
            setItems(mapeados);
        } catch (e: any) {
            setError(e?.message || 'Error cargando tienda');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        Promise.all([listarItems(), listarStats()]).then();
    }, []);

    const sections: Section[] = useMemo(() => {
        const by = (tipo: SectionKey) => items.filter((it) => String(it.tipoItem).toUpperCase() === tipo);
        return [
            { key: 'POTENCIADOR', title: 'Artículos', items: by('POTENCIADOR') },
            { key: 'COFRE', title: 'Cofres', items: by('COFRE') },
            { key: 'ROPA', title: 'Ropa', items: by('ROPA') },
        ];
    }, [items]);

    if (cargando) {
        return (
            <View style={[s.center, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[s.muted, { marginTop: 16 }]}>Cargando tienda…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[s.center, { backgroundColor: colors.bg }]}>
                <Text style={[s.text, { marginBottom: 12, paddingHorizontal: 60 }]}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable onPress={listarItems} style={s.retryBtn}>
                    <Text style={s.text}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 62, paddingBottom: 32 }}
                >
                    {sections.map((sec) => {
                        if (!sec.items.length) return null;

                        return (
                            <View key={sec.key} style={{ marginTop: sec.key === 'POTENCIADOR' ? 0 : 16 }}>
                                {/* Header de sección */}
                                <View style={s.sectionHeader}>
                                    <Text style={s.sectionTitle}>{sec.title}</Text>
                                    {/* barra a la derecha del título — un poco más clara en dark */}
                                    <View style={s.sectionBar} />
                                </View>

                                {/* barra/“regleta” extra para Artículos (quedaba muy sutil) */}
                                {sec.key === 'POTENCIADOR' ? <View style={s.sectionBar2} /> : null}

                                {/* Lista por sección */}
                                {sec.key === 'ROPA' ? (
                                    <FlatList
                                        numColumns={2}
                                        scrollEnabled={false}
                                        keyExtractor={(it) => `${sec.key}-${it.codItem}`}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ padding: 12 }}
                                        columnWrapperStyle={{ gap: 12 }}
                                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                                        data={sec.items}
                                        renderItem={({ item }) => (
                                            <StoreItemCard
                                                item={item}
                                                onPress={() => openDetails(item)}
                                                accentColor={sec.key === 'POTENCIADOR' ? '#3B5BDB' : sec.key === 'COFRE' ? '#0EA5E9' : '#10B981'}
                                                variant={sec.key}
                                            />
                                        )}
                                    />
                                ) : (
                                    <FlatList
                                        horizontal
                                        keyExtractor={(it) => `${sec.key}-${it.codItem}`}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingHorizontal: sec.key === 'POTENCIADOR' ? SCREEN_W * 0.04 : 12 }}
                                        ItemSeparatorComponent={() => <View style={{ width: sec.key === 'POTENCIADOR' ? SCREEN_W * 0.04 : 12 }} />}
                                        data={sec.items}
                                        renderItem={({ item }) => (
                                            <StoreItemCard
                                                item={item}
                                                onPress={() => openDetails(item)}
                                                accentColor={sec.key === 'POTENCIADOR' ? '#3B5BDB' : sec.key === 'COFRE' ? '#0EA5E9' : '#10B981'}
                                                variant={sec.key}
                                            />
                                        )}
                                    />
                                )}
                            </View>
                        );
                    })}
                </ScrollView>

                <DetailsStoreItemModal
                    visible={detailsOpen}
                    item={selected}
                    onClose={closeDetails}
                    onBuy={handleBuy}
                    userCoins={stats.monedas}
                    buying={comprando}
                    accentColor={
                        selected
                            ? (String(selected.tipoItem).toUpperCase() === 'POTENCIADOR'
                                ? '#3B5BDB'
                                : String(selected.tipoItem).toUpperCase() === 'COFRE'
                                    ? '#0EA5E9'
                                    : '#10B981')
                            : '#3B5BDB'
                    }
                />
                <PurchaseSuccessOverlay
                    visible={showSuccess}
                    itemName={successInfo?.name ?? ''}
                    qty={successInfo?.qty ?? 1}
                    onClose={() => setShowSuccess(false)}
                    autoCloseMs={1800}
                />
            </View>
        </FadeWrapper>
    );
}

/* ---------- estilos dependientes del tema ---------- */
const makeStyles = (
    c: import('../../theme/ThemeProvider').Palette,
    isDark: boolean,
    utils?: { accentStripe?: (c?: string) => string }
) =>
    StyleSheet.create({
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        text: { color: c.text },
        muted: { color: c.sub },

        retryBtn: {
            padding: 12,
            backgroundColor: c.cardTint,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: c.divider,
        },

        sectionHeader: {
            paddingHorizontal: 16,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
        },
        sectionTitle: {
            fontSize: 22,
            fontWeight: '800',
            color: c.text,
        },

        // barra a la derecha del título
        // en dark la hacemos más clara mezclando acento+cardTint (queda visible pero suave)
        sectionBar: {
            height: 6,
            borderRadius: 999,
            marginLeft: 10,
            flex: 1,
            backgroundColor: utils?.accentStripe
                ? utils.accentStripe(c.primary)
                : (isDark ? c.cardTint : c.divider),
        },

        // regleta extra que tenías (más clara y con borde leve)
        sectionBar2: {
            height: 18,
            borderRadius: 8,
            backgroundColor: c.cardTint,
            borderWidth: 1,
            borderColor: c.divider,
            marginHorizontal: 16,
            marginBottom: 8,
        },
    });
