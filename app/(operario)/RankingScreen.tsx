// app/(operario)/RankingScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import DetailsTrophyModal from '../../components/DetailsTrophyModal';
import { useTheme } from '../../theme/ThemeProvider';

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
    descripcion: string;
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
    const { colors } = useTheme();
    const [data, setData] = useState<RankingResumen | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 12, color: colors.text }}>Invocando la tabla del destino…</Text>
                </View>
            </FadeWrapper>
        );
    }

    if (err || !data) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, backgroundColor: colors.bg }}>
                    <Text style={{ textAlign: 'center', marginBottom: 12, color: colors.text }}>{err || 'Ups, no hay ranking disponible.'}</Text>
                    <Pressable onPress={cargar} style={{ backgroundColor: colors.mutedBg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}>
                        <Text style={{ color: colors.text }}>Reintentar</Text>
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
                style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 40 }}
                contentContainerStyle={{ paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10, backgroundColor: colors.bg }}>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Ranking Global</Text>
                    <Text style={{ marginTop: 4, color: colors.mutedText }}>Los 5 con más XP total</Text>
                </View>

                {/* Top 5 */}
                <View style={{ marginTop: 6, paddingHorizontal: 16, gap: 12 }}>
                    {top.map((t, idx) => (
                        <View
                            key={t.codUsuario}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: colors.cardTint,
                                borderRadius: 16,
                                padding: 12,
                                shadowColor: '#000',
                                shadowOpacity: 0.05,
                                shadowOffset: { width: 0, height: 4 },
                                shadowRadius: 6,
                                elevation: 2,
                                borderWidth: 1,
                                // Mantengo el código de medallas: oro/plata/bronce
                                borderColor: idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#A16207' : colors.divider
                            }}
                        >
                            {/* posición */}
                            <View style={{ width: 34, alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{idx + 1}</Text>
                            </View>

                            {/* avatar */}
                            <View
                                style={{
                                    width: AV_SIZE,
                                    height: AV_SIZE,
                                    borderRadius: AV_SIZE / 2,
                                    backgroundColor: colors.brandBlueSoft,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 2,
                                    borderColor: colors.brandBlueBorder,
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
                                    {initials(t.nombre, t.apellido)}
                                </Text>
                            </View>

                            {/* info */}
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }} numberOfLines={1}>
                                    {t.nickname?.trim() || `${t.nombre} ${t.apellido}`}
                                </Text>
                                <Text style={{ color: colors.mutedText, marginTop: 2 }} numberOfLines={1}>
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
                        backgroundColor: colors.brandBlueSoft,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.brandBlueBorder
                    }}
                >
                    <Text style={{ fontSize: 16, color: colors.text }}>
                        Estás en la <Text style={{ fontWeight: '800', color: colors.text }}>posición #{me.position}</Text> — Nivel {me.nivel} • {me.xp} XP
                    </Text>
                    <Text style={{ marginTop: 6, fontSize: 14, color: colors.text }}>
                        {data.mensaje}
                    </Text>
                </View>

                {/* Trofeos */}
                <View style={{ marginTop: 24, paddingHorizontal: 16, marginBottom: 32 }}>
                    <Text style={{ fontWeight: '900', fontSize: 20, color: colors.text }}>Trofeos en juego</Text>
                    <Text style={{ color: colors.mutedText, marginTop: 4 }}>El trono cambia de manos todos los dias a las 10PM… si te lo ganas 😉</Text>

                    <View style={{ marginTop: 14, gap: 12 }}>
                        {data.trofeos.map((t) => {
                            const uri = t.icono.startsWith('http') ? t.icono : `${baseUrl}${t.icono}`;
                            return (
                                <Pressable
                                    onPress={() => openTrophy(t)}
                                    key={t.codTrofeo}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: colors.cardTint,
                                        borderRadius: 14,
                                        padding: 12,
                                        shadowColor: '#000',
                                        shadowOpacity: 0.04,
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowRadius: 4,
                                        elevation: 1,
                                        borderWidth: 1,
                                        borderColor: colors.divider,
                                    }}
                                >
                                    {/* Icono trofeo */}
                                    <View
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            backgroundColor: colors.imageBg,
                                            marginRight: 12,
                                        }}
                                    >
                                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>

                                    {/* Nombre trofeo + holder */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }} numberOfLines={1}>
                                            {t.nombre}
                                        </Text>
                                        <Text style={{ color: colors.mutedText, marginTop: 2 }} numberOfLines={1}>
                                            {t.holder
                                                ? `Lo tiene: ${t.holder.nickname?.trim() || t.holder.nombre}`
                                                : 'Sin dueño — ¿te atreves?'}
                                        </Text>
                                    </View>

                                    <FontAwesome5 name="trophy" size={18} color={colors.warning} />
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
