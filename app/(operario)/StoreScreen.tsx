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
import {FontAwesome5} from '@expo/vector-icons';
import {ItemTienda} from "../../models/ItemTienda";
import FadeWrapper from "../../components/FadeWrapper";
import StoreItemCard from "../../components/StoreItemCard";
import DetailsStoreItemModal from "../../components/DetailsStoreItemModal";
import {useAuth} from "../../auth/AuthContext";
import {StatsUsuario} from "../../models/StatsUsuario";
import PurchaseSuccessOverlay from '../../components/PurchaseSuccessOverlay';
import { useToast } from '../../components/ToastProvider';

// import DetailsStoreItemModal from '../components/DetailsStoreItemModal';

// import HeaderOperario from '../components/HeaderOperario';
// import FadeWrapper from '../components/FadeWrapper';

// import {ItemTienda} from '../models/ItemTienda';
// import {ServicioGet} from '../services/ServicioGet';
// import {styles as global} from '../styles/globalStyles';
// import StoreItemCard from '../components/StoreItemCard';

const {width: SCREEN_W} = Dimensions.get('window');

// Ajusta estos valores a lo que te entregue tu API
const URL_LISTAR_ITEMS = 'http://192.168.20.20:3550/item-tienda/listar';

type SectionKey = 'POTENCIADOR' | 'COFRE' | 'ROPA';
type Section = { key: SectionKey; title: string; items: ItemTienda[] };

function toItemTienda(raw: any): ItemTienda {
    const meta =
        typeof raw.metadataItem === 'string'
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
    const [successInfo, setSuccessInfo] = useState<{name: string; qty: number} | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const [stats, setStats] = useState<StatsUsuario>({codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0});

    const {fetchJson, baseUrl} = useAuth();
    const [comprando, setComprando] = useState(false);

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
        // opcional: limpia el item luego de la animación
        setTimeout(() => setSelected(null), 200);
    };


    const handleBuy = async (it: ItemTienda, qty: number) => {
        try {
            setComprando(true);
            await fetchJson('/item-tienda/comprar', { method:'POST', body: JSON.stringify({ codItem: it.codItem, cantidad: qty }) });
            await listarStats();

            // 1) cierra el details primero
            closeDetails();

            // 2) espera su fade (tu setTimeout de 200ms) y luego muestra overlay
            setTimeout(() => {
                setSuccessInfo({ name: it.nombreItem, qty });
                setShowSuccess(true);
            }, 240);
        } catch (e: any) {
            // tu toast/error aquí
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
        const by = (tipo: SectionKey) =>
            items.filter((it) => String(it.tipoItem).toUpperCase() === tipo);
        return [
            {key: 'POTENCIADOR', title: 'Artículos', items: by('POTENCIADOR')},
            {key: 'COFRE', title: 'Cofres', items: by('COFRE')},
            {key: 'ROPA', title: 'Ropa', items: by('ROPA')},
        ];
    }, [items]);

    if (cargando) {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large"/>
                <Text style={{marginTop: 16}}>Cargando tienda…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={s.center}>
                <Text style={{marginBottom: 12, paddingHorizontal: 60}}>
                    Uy, se cayó esto: {error}
                </Text>
                <Pressable onPress={listarItems} style={s.retryBtn}>
                    <Text>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <FadeWrapper>
            <View style={{flex: 1}}>

                <ScrollView showsVerticalScrollIndicator={false}
                            contentContainerStyle={{paddingTop: 62, paddingBottom: 32}}>
                    {sections.map((sec) => {
                            if (!sec.items.length) return null;

                            if (sec.key == "POTENCIADOR") {
                                return (
                                    <View key={sec.key}>
                                        <View style={s.sectionHeader}>
                                            <Text style={s.sectionTitle}>{sec.title}</Text>
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
                                                <StoreItemCard
                                                    item={item}
                                                    onPress={() => openDetails(item)}
                                                    // toques de UI distintos por sección
                                                    accentColor={
                                                        sec.key === 'POTENCIADOR'
                                                            ? '#3B5BDB'
                                                            : sec.key === 'COFRE'
                                                                ? '#0EA5E9'
                                                                : '#10B981'
                                                    }
                                                    variant={sec.key}
                                                />
                                            )}
                                        />
                                    </View>
                                )
                            }
                            if (sec.key == "COFRE") {
                                return (
                                    <View key={sec.key} style={{marginTop: 16}}>
                                        {/* Sección / título */}
                                        <View style={s.sectionHeader}>
                                            <Text style={s.sectionTitle}>{sec.title}</Text>
                                            <View style={s.sectionBar}/>
                                        </View>

                                        {/* Lista horizontal por sección */}
                                        <FlatList
                                            style={{alignSelf: 'center'}}
                                            horizontal
                                            keyExtractor={(it) => `${sec.key}-${it.codItem}`}
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={{paddingHorizontal: 12}}
                                            ItemSeparatorComponent={() => <View style={{width: 12}}/>}
                                            data={sec.items}
                                            renderItem={({item}) => (
                                                <StoreItemCard
                                                    item={item}
                                                    onPress={() => openDetails(item)}
                                                    // toques de UI distintos por sección
                                                    accentColor={
                                                        sec.key === 'POTENCIADOR'
                                                            ? '#3B5BDB'
                                                            : sec.key === 'COFRE'
                                                                ? '#0EA5E9'
                                                                : '#10B981'
                                                    }
                                                    variant={sec.key}
                                                />
                                            )}
                                        />
                                    </View>
                                );
                            }
                            if (sec.key == "ROPA"){
                                return (
                                    <View key={sec.key} style={{marginTop: 16}}>
                                        {/* Sección / título */}
                                        <View style={s.sectionHeader}>
                                            <Text style={s.sectionTitle}>{sec.title}</Text>
                                            <View style={s.sectionBar}/>
                                        </View>

                                        {/* Lista horizontal por sección */}
                                        <FlatList
                                            numColumns={2}
                                            scrollEnabled={false}              // 👈 clave para quitar el warning
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
                                                    accentColor={
                                                        sec.key === 'POTENCIADOR'
                                                            ? '#3B5BDB'
                                                            : sec.key === 'COFRE'
                                                                ? '#0EA5E9'
                                                                : '#10B981'
                                                    }
                                                    variant={sec.key}
                                                />
                                            )}
                                        />
                                    </View>
                                );
                            }
                        }
                    )
                    }
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
                    autoCloseMs={1800}  // opcional
                />
            </View>
        </FadeWrapper>
    );
}

const s = StyleSheet.create({
    center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    retryBtn: {
        padding: 12,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
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
        color: '#111827',
    },
    sectionBar: {
        height: 6,
        borderRadius: 999,
        backgroundColor: '#E5E7EB',
        marginLeft: 10,
        flex: 1,
    },
    sectionBar2: {
        height: 18,
        outlineColor: '#a5afc4',
        outlineWidth: 2,
        backgroundColor: '#E5E7EB',
        flex: 1,
    },
});
