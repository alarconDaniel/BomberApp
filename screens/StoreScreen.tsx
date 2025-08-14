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

import HeaderOperario from '../components/HeaderOperario';
import FadeWrapper from '../components/FadeWrapper';

import {ItemTienda} from '../models/ItemTienda';
import {ServicioGet} from '../services/ServicioGet';
import {styles as global} from '../styles/globalStyles';
import StoreItemCard from '../components/StoreItemCard';

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

export default function StoreScreen() {
    const router = useRouter();
    const [items, setItems] = useState<ItemTienda[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const listarItems = async () => {
        try {
            setCargando(true);
            setError(null);

            const resultado = await ServicioGet.peticionGet(URL_LISTAR_ITEMS);
            const mapeados: ItemTienda[] = (resultado ?? []).map(toItemTienda);

            setItems(mapeados);

        } catch (e: any) {
            setError(e?.message || 'Error cargando tienda');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        listarItems();
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
                                                    onPress={() =>
                                                        router.push({
                                                            pathname: '/tienda/[id]',
                                                            params: {id: String(item.codItem)},
                                                        })
                                                    }
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
                                                    onPress={() =>
                                                        router.push({
                                                            pathname: '/tienda/[id]',
                                                            params: {id: String(item.codItem)},
                                                        })
                                                    }
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
                                                    onPress={() =>
                                                        router.push({
                                                            pathname: '/tienda/[id]',
                                                            params: { id: String(item.codItem) },
                                                        })
                                                    }
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
