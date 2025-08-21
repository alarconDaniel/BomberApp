// app/(tabs)/ranking.tsx (o donde tengas RankingScreen)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import DetailsTrophyModal from '../../components/DetailsTrophyModal'; // 👈 nuevo

type TopItem = {
    codUsuario: number;
    nombre: string;
    apellido: string;
    nickname: string | null;
    xp: number;
    nivel: number;
};

type TrophyItem = {
    codTrofeo: number;
    nombre: string;
    icono: string;
    descripcion: string; // 👈 nuevo
    holder: null | { codUsuario: number; nombre: string; nickname: string | null };
};

type RankingResumen = {
    top: TopItem[];
    me: { position: number; xp: number; nivel: number };
    mensaje: string;
    trofeos: TrophyItem[];
};

const AV_SIZE = 54;

function initials(n?: string, a?: string) {
    const i1 = (n || '').trim()[0] || '';
    const i2 = (a || '').trim()[0] || '';
    return (i1 + i2).toUpperCase() || '👤';
}

export default function RankingScreen() {
    const router = useRouter();
    const { fetchJson, baseUrl } = useAuth();
    const [data, setData] = useState<RankingResumen | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // Estado del modal de trofeo
    const [selectedTrophy, setSelectedTrophy] = useState<TrophyItem | null>(null);
    const [trophyOpen, setTrophyOpen] = useState(false);

    const openTrophy = (t: TrophyItem) => {
        setSelectedTrophy(t);
        setTrophyOpen(true);
    };
    const closeTrophy = () => {
        setTrophyOpen(false);
        setTimeout(() => setSelectedTrophy(null), 200);
    };

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            setErr(null);
            const r = await fetchJson<RankingResumen>('/ranking/resumen');
            setData(r);
        } catch (e: any) {
            setErr(e?.message || 'No se pudo cargar el ranking');
        } finally {
            setLoading(false);
        }
    }, [fetchJson]);

    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
    useEffect(() => { /* refresh on mount */ }, []);

    if (loading) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ marginTop: 12 }}>Invocando la tabla del destino…</Text>
                </View>
            </FadeWrapper>
        );
    }

    if (err || !data) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 }}>
                    <Text style={{ textAlign: 'center', marginBottom: 12 }}>{err || 'Ups, no hay ranking disponible.'}</Text>
                    <Pressable onPress={cargar} style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}>
                        <Text>Reintentar</Text>
                    </Pressable>
                </View>
            </FadeWrapper>
        );
    }

    const top = data.top ?? [];
    const me = data.me;

    return (
        <FadeWrapper>
            <ScrollView
                style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40 }}
                contentContainerStyle={{ paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10, backgroundColor: '#fff' }}>
                    <Text style={{ fontSize: 22, fontWeight: '900' }}>Ranking Global</Text>
                    <Text style={{ marginTop: 4, color: '#6B7280' }}>Los 5 con más XP total</Text>
                </View>

                {/* Top 5 */}
                <View style={{ marginTop: 6, paddingHorizontal: 16, gap: 12 }}>
                    {top.map((t, idx) => (
                        <View
                            key={t.codUsuario}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#F9FAFB',
                                borderRadius: 16,
                                padding: 12,
                                shadowColor: '#000',
                                shadowOpacity: 0.05,
                                shadowOffset: { width: 0, height: 4 },
                                shadowRadius: 6,
                                elevation: 2,
                                borderWidth: 1,
                                borderColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#A16207' : '#E5E7EB'
                            }}
                        >
                            {/* posición */}
                            <View style={{ width: 34, alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '800' }}>{idx + 1}</Text>
                            </View>

                            {/* avatar */}
                            <View
                                style={{
                                    width: AV_SIZE,
                                    height: AV_SIZE,
                                    borderRadius: AV_SIZE / 2,
                                    backgroundColor: '#EEF2FF',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: '#C7D2FE',
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#4F46E5' }}>
                                    {initials(t.nombre, t.apellido)}
                                </Text>
                            </View>

                            {/* info */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                                    {t.nickname?.trim() || `${t.nombre} ${t.apellido}`}
                                </Text>
                                <Text style={{ color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
                                    Nivel {t.nivel} • {t.xp} XP
                                </Text>
                            </View>

                            {/* medalla */}
                            <View style={{ width: 40, alignItems: 'flex-end' }}>
                                {idx === 0 && <FontAwesome5 name="crown" size={20} color="#F59E0B" />}
                                {idx === 1 && <FontAwesome5 name="medal" size={20} color="#94A3B8" />}
                                {idx === 2 && <FontAwesome5 name="medal" size={20} color="#A16207" />}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Tu posición */}
                <View
                    style={{
                        marginTop: 18,
                        marginHorizontal: 16,
                        padding: 16,
                        backgroundColor: '#EFF6FF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#BFDBFE'
                    }}
                >
                    <Text style={{ fontSize: 16 }}>
                        Estás en la <Text style={{ fontWeight: '800' }}>posición #{me.position}</Text> — Nivel {me.nivel} • {me.xp} XP
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 14, color: '#111' }}>
                        {data.mensaje}
                    </Text>
                </View>

                {/* Trofeos */}
                <View style={{ marginTop: 24, paddingHorizontal: 16, marginBottom: 32 }}>
                    <Text style={{ fontWeight: '900', fontSize: 20 }}>Trofeos en juego</Text>
                    <Text style={{ color: '#6B7280', marginTop: 4 }}>El trono cambia de manos… si te lo ganas 😉</Text>

                    <View style={{ marginTop: 14, gap: 12 }}>
                        {data.trofeos.map((t) => {
                            const uri = t.icono.startsWith('http') ? t.icono : `${baseUrl}${t.icono}`;
                            return (
                                <Pressable
                                    onPress={() => openTrophy(t)} // 👈 abrir modal
                                    key={t.codTrofeo}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 14,
                                        padding: 12,
                                        shadowColor: '#000',
                                        shadowOpacity: 0.04,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 4,
                                        elevation: 1,
                                        borderWidth: 1,
                                        borderColor: '#E5E7EB',
                                    }}
                                >
                                    {/* Icono trofeo */}
                                    <View
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            backgroundColor: '#E5E7EB',
                                            marginRight: 12,
                                        }}
                                    >
                                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>

                                    {/* Nombre trofeo + holder */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                                            {t.nombre}
                                        </Text>
                                        <Text style={{ color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
                                            {t.holder
                                                ? `Lo tiene: ${t.holder.nickname?.trim() || t.holder.nombre}`
                                                : 'Sin dueño — ¿te atreves?'}
                                        </Text>
                                    </View>

                                    <FontAwesome5 name="trophy" size={18} color="#F59E0B" />
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Modal de trofeo */}
            <DetailsTrophyModal
                visible={trophyOpen}
                trophy={selectedTrophy}
                onClose={closeTrophy}
                baseUrl={baseUrl}
            />
        </FadeWrapper>
    );
}
