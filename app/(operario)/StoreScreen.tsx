// app/(operario)/StoreScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet, FlatList, ScrollView, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ItemTienda } from '../../models/ItemTienda';
import FadeWrapper from '../../components/operario/FadeWrapper';
import StoreItemCard from '../../components/operario/StoreItemCard';
import DetailsStoreItemModal from '../../components/operario/DetailsStoreItemModal';
import { useAuth } from '../../auth/AuthContext';
import { StatsUsuario } from '../../models/StatsUsuario';
import PurchaseSuccessOverlay from '../../components/operario/PurchaseSuccessOverlay';
import { useToast } from '../../components/operario/ToastProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const { width: SCREEN_W } = Dimensions.get('window');

type SectionKey = 'POTENCIADOR' | 'COFRE' | 'ROPA';
type Section = { key: SectionKey; title: string; items: ItemTienda[] };

function toItemTienda(raw: any): ItemTienda {
    const meta = typeof raw.metadataItem === 'string' ? JSON.parse(raw.metadataItem) : (raw.metadataItem ?? {});
    const iconoPath = raw.iconoPath; // 👈 toma la ruta/slug de la BD

    return new ItemTienda(
        raw.codItem ?? raw.cod ?? 0,
        raw.nombreItem ?? raw.nombre ?? 'Item',
        raw.desripcionItem ?? raw.descripcion ?? '',
        Number(raw.precioItem ?? raw.precio ?? 0),
        String(raw.tipoItem ?? raw.tipo ?? '').toUpperCase(),
        meta,
        !!raw.yaPosee,
        iconoPath, // 👈 NUEVO
    );
}

export default function StoreScreen() {
    const { colors } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);

    const toast = useToast();
    const [successInfo, setSuccessInfo] = useState<{ name: string; qty: number } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [stats, setStats] = useState<StatsUsuario>({ codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0 });
    const { fetchJson } = useAuth();
    const [comprando, setComprando] = useState(false);

    const router = useRouter();
    const [items, setItems] = useState<ItemTienda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selected, setSelected] = useState<ItemTienda | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const openDetails = (it: ItemTienda) => { setSelected(it); setDetailsOpen(true); };
    const closeDetails = () => { setDetailsOpen(false); setTimeout(() => setSelected(null), 200); };

    const listarStats = useCallback(async () => {
        try {
            const data = await fetchJson<StatsUsuario>('/mis-stats/listar');
            if (data) setStats(data);
        } catch { /* noop */ }
    }, [fetchJson]);

    const listarItems = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            const resultado = await fetchJson<any>('/item-tienda/listar');
            console.log('[tienda] raw:', JSON.stringify(resultado)?.slice(0, 1200));
            const arr = Array.isArray(resultado) ? resultado : resultado?.items ?? [];
            const mapeados: ItemTienda[] = (arr ?? []).map(toItemTienda);
            console.log('mapeados:', JSON.stringify(mapeados)?.slice(0, 1200));
            setItems(mapeados);
        } catch (e: any) {
            setError(e?.message || 'Error cargando tienda');
        } finally {
            setCargando(false);
        }
    }, [fetchJson]);

    // 🔁 Igual que ProfileScreen: recarga al enfocar la pantalla
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            (async () => {
                await Promise.all([listarItems(), listarStats()]);
            })();
            return () => { isActive = false; };
        }, [listarItems, listarStats])
    );

    const handleBuy = async (it: ItemTienda, qty: number) => {
        try {
            setComprando(true);
            const isRopa = String(it.tipoItem).toUpperCase() === 'ROPA';
            const cantidad = isRopa ? 1 : qty;

            await fetchJson('/item-tienda/comprar', { method: 'POST', body: JSON.stringify({ codItem: it.codItem, cantidad }) });

            // Refresca stats e items para que 'yaPosee' se vea en caliente
            await Promise.all([listarStats(), listarItems()]);

            closeDetails();
            setTimeout(() => {
                setSuccessInfo({ name: it.nombreItem, qty: cantidad });
                setShowSuccess(true);
            }, 240);
        } catch (e: any) {
            alert(e?.message ?? 'No se pudo completar la compra');
        } finally {
            setComprando(false);
        }
    };

    const sections: Section[] = useMemo(() => {
        const by = (tipo: SectionKey) => items.filter((it) => String(it.tipoItem).toUpperCase() === tipo);
        return [
            { key: 'POTENCIADOR', title: 'Artículos', items: by('POTENCIADOR') },
            { key: 'COFRE', title: 'Cofres', items: by('COFRE') },
            { key: 'ROPA', title: 'Ropa', items: by('ROPA') }, // ya viene limitada a 3 desde backend
        ];
    }, [items]);

    const s = useMemo(() => StyleSheet.create({
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
        retryBtn: { padding: 12, backgroundColor: colors.mutedBg, borderRadius: 8 },
        sectionHeader: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
        sectionBar: { height: 6, borderRadius: 999, backgroundColor: colors.mutedBg, marginLeft: 10, flex: 1 },
        sectionBar2: { height: 18, outlineColor: colors.outline, outlineWidth: 2, backgroundColor: colors.mutedBg, flex: 1 },
    }), [colors]);

    if (cargando) {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color={colors.primary}/>
                <Text style={[g.text.caption, {marginTop: 16}]}>Cargando tienda…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={s.center}>
                <Text style={[g.text.body, {marginBottom: 12, paddingHorizontal: 60}]}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable onPress={listarItems} style={s.retryBtn}>
                    <Text style={g.text.body}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    const accent = (k: SectionKey) =>
        k === 'POTENCIADOR' ? colors.storeAccentPotenciador
            : k === 'COFRE'     ? colors.storeAccentCofre
                :                     colors.storeAccentRopa;

    return (
        <FadeWrapper>
            <View style={{flex: 1, backgroundColor: colors.bg}}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingTop: 62, paddingBottom: 32}}>
                    {sections.map((sec) => {
                        if (!sec.items.length) return null;

                        if (sec.key === 'POTENCIADOR') {
                            return (
                                <View key={sec.key}>
                                    <View style={s.sectionHeader}>
                                        <Text style={[g.text.h1, {marginVertical: 2}]}>{sec.title}</Text>
                                        <View style={s.sectionBar}/>
                                    </View>
                                    <View style={s.sectionBar2}/>
                                    <FlatList
                                        horizontal
                                        keyExtractor={(it) => `${sec.key}-${it.codItem}`}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{paddingHorizontal: SCREEN_W*0.04}}
                                        ItemSeparatorComponent={() => <View style={{width: SCREEN_W*0.04}}/>}
                                        data={sec.items}
                                        renderItem={({item}) => (
                                            <StoreItemCard item={item} onPress={() => openDetails(item)} accentColor={accent(sec.key)} variant={sec.key}/>
                                        )}
                                    />
                                </View>
                            );
                        }

                        if (sec.key === 'COFRE') {
                            return (
                                <View key={sec.key} style={{marginTop: 16}}>
                                    <View style={s.sectionHeader}>
                                        <Text style={[g.text.h1, {marginTop: 6, marginBottom: 8}]}>{sec.title}</Text>
                                        <View style={s.sectionBar}/>
                                    </View>
                                    <FlatList
                                        style={{alignSelf: 'center'}}
                                        horizontal
                                        keyExtractor={(it) => `${sec.key}-${it.codItem}`}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{paddingHorizontal: 12}}
                                        ItemSeparatorComponent={() => <View style={{width: 12}}/>}
                                        data={sec.items}
                                        renderItem={({item}) => (
                                            <StoreItemCard item={item} onPress={() => openDetails(item)} accentColor={accent(sec.key)} variant={sec.key}/>
                                        )}
                                    />
                                </View>
                            );
                        }

                        // ROPA
                        return (
                            <View key={sec.key} style={{marginTop: 16}}>
                                <View style={s.sectionHeader}>
                                    <Text style={[g.text.h1, {marginVertical: 2}]}>{sec.title}</Text>
                                    <View style={s.sectionBar}/>
                                </View>
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
                                        <StoreItemCard item={item} onPress={() => openDetails(item)} accentColor={accent(sec.key)} variant={sec.key}/>
                                    )}
                                />
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
                                ? colors.storeAccentPotenciador
                                : String(selected.tipoItem).toUpperCase() === 'COFRE'
                                    ? colors.storeAccentCofre
                                    : colors.storeAccentRopa)
                            : colors.storeAccentPotenciador
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
