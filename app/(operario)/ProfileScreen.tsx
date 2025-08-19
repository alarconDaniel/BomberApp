import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {Animated, ActivityIndicator, Image, Pressable, Text, View, ScrollView} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { PerfilResumen } from '../../models/PerfilResumen';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import LevelUpOverlay from '../../components/LevelUpOverlay';

const AVATAR_SIZE = 110;

function initials(nombre?: string, apellido?: string) {
    const n = (nombre || '').trim();
    const a = (apellido || '').trim();
    const i1 = n ? n[0] : '';
    const i2 = a ? a[0] : '';
    return (i1 + i2).toUpperCase() || '👤';
}

export default function ProfileScreen() {

    const router = useRouter();

    const lastLevelRef = useRef<number | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState<number>(0);

    const shake = useRef(new Animated.Value(0)).current;
    const spark = useRef(new Animated.Value(0)).current;
    const lastNickRef = useRef<string | null>(null);

    const fmtRecompensa = (r?: string) => (r ? (r.trim().startsWith('+') ? r.trim() : `+ ${r.trim()}`) : '');

    const triggerNickCelebrate = useCallback(() => {
        // Shake
        shake.setValue(0);
        Animated.sequence([
            Animated.timing(shake, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();

        // Sparkle
        spark.setValue(0);
        Animated.sequence([
            Animated.timing(spark, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.timing(spark, { toValue: 0, delay: 120, duration: 420, useNativeDriver: true }),
        ]).start();
    }, [shake, spark]);

    const { fetchJson, baseUrl } = useAuth();
    const [data, setData] = useState<PerfilResumen | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const shakeStyle = {
        transform: [{
            translateX: shake.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, -3, 3, -3, 0],
            })
        }]
    };

    const starStyle = {
        position: 'absolute' as const,
        right: -12,
        top: -8,
        opacity: spark,
        transform: [
            { scale: spark.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.4] }) },
            { rotate: spark.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) },
        ],
    };

    const cargar = async () => {
        try {
            setLoading(true);
            setErr(null);
            const r = await fetchJson<PerfilResumen>('/mi-perfil/resumen');
            setData(r);
        } catch (e: any) {
            setErr(e?.message || 'No se pudo cargar el perfil');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // --- Nickname cambiado → animación ---
        const currentNick = data?.usuario.nickname ?? null;
        const prevNick = lastNickRef.current;

        if (currentNick && prevNick && currentNick !== prevNick) {
            triggerNickCelebrate();
        }
        lastNickRef.current = currentNick;

        // --- Nivel subió → overlay de level up ---
        const lvl = data?.stats?.nivel;
        const prevLvl = lastLevelRef.current;

        if (typeof lvl === 'number') {
            if (prevLvl !== null && lvl > prevLvl) {
                setNewLevel(lvl);
                setShowLevelUp(true);
                // opcional: haptics aquí
            }
            lastLevelRef.current = lvl;
        }
    }, [data?.usuario.nickname, data?.stats?.nivel, triggerNickCelebrate]);

    useFocusEffect(useCallback(() => { cargar(); }, []));

    const nickname = data?.usuario.nickname || 'Sin nick';
    const fullname = useMemo(
        () => `${data?.usuario.nombre ?? ''} ${data?.usuario.apellido ?? ''}`.trim(),
        [data?.usuario.nombre, data?.usuario.apellido]
    );

    if (loading) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" />
                    <Text style={{ marginTop: 16 }}>Cargando perfil…</Text>
                </View>
            </FadeWrapper>
        );
    }
    if (err || !data) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
                    <Text style={{ textAlign: 'center', marginBottom: 12 }}>
                        {err || 'Uy, algo pasó cargando el perfil.'}
                    </Text>
                    <Pressable onPress={cargar} style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}>
                        <Text>Reintentar</Text>
                    </Pressable>
                </View>
            </FadeWrapper>
        );
    }

    const { stats, logros } = data;
    const pct = Math.min(1, Math.max(0, stats.progreso));



    return (
        <FadeWrapper>
            {/* Scroll con header sticky */}
            <ScrollView
                style={{ flex: 1, backgroundColor: '#fff' }}
                contentContainerStyle={{ paddingBottom: 40 }}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={false}
            >
                {/* === Sticky Header: Avatar + Nick + Nombre === */}
                <View style={{ backgroundColor: '#fff', paddingTop: 56, paddingBottom: 16 }}>
                    {/* Lápiz editar arriba a la derecha */}
                    <View style={{ alignItems: 'flex-end', paddingHorizontal: 20 }}>
                        <Pressable onPress={() => router.push('/(modals)/editar-perfil')}>
                            <FontAwesome5 name="pen" size={16} color="#333" />
                        </Pressable>
                    </View>

                    {/* Avatar */}
                    <View style={{ alignItems: 'center' }}>
                        <View
                            style={{
                                width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                                backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
                                borderWidth: 3, borderColor: '#C7D2FE'
                            }}
                        >
                            <Text style={{ fontSize: 40, fontWeight: '800', color: '#4F46E5' }}>
                                {initials(data.usuario.nombre, data.usuario.apellido)}
                            </Text>
                        </View>

                        {/* Nickname animado */}
                        <View style={{ marginTop: 12, alignItems: 'center', position: 'relative' }}>
                            <Animated.Text style={[{ fontWeight: '700', fontSize: 18, color: '#111' }, shakeStyle]}>
                                {nickname}
                            </Animated.Text>
                            <Animated.View style={{
                                position: 'absolute', right: -12, top: -8, opacity: spark,
                                transform: [
                                    { scale: spark.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.4] }) },
                                    { rotate: spark.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '25deg'] }) },
                                ],
                            }}>
                                <FontAwesome5 name="star" size={14} color="#F59E0B" />
                            </Animated.View>
                        </View>

                        {/* Nombre completo */}
                        <Text style={{ marginTop: 2, fontSize: 14, color: '#555' }}>{fullname}</Text>
                    </View>
                </View>

                {/* === Contenido scrolleable === */}

                {/* Nivel + XP */}
                <View
                    style={{
                        marginTop: 8, marginHorizontal: 18, padding: 16,
                        backgroundColor: '#F3F4F6', borderRadius: 14,
                        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 2
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={{ fontSize: 16, color: '#111' }}>Nivel</Text>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                borderWidth: 2, borderColor: '#A5B4FC', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: '#EEF2FF'
                            }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: '#4338CA' }}>{stats.nivel}</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 14, color: '#111' }}>EXP {stats.xp}</Text>
                    </View>

                    {/* Barra de progreso */}
                    <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                        <Animated.View
                            style={{
                                width: `${Math.round(pct * 100)}%`,
                                height: '100%',
                                backgroundColor: '#6366F1',
                            }}
                        />
                    </View>

                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                        a {stats.faltante} EXP para llegar al nivel {stats.nivel + 1}
                    </Text>
                </View>

                {/* Resumen */}
                <View style={{ marginTop: 18, paddingHorizontal: 18 }}>
                    <Text style={{ fontWeight: '800', fontSize: 18 }}>Resumen</Text>

                    {/* Racha */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                        <View style={{ backgroundColor: '#ffcfbf', padding: 10, borderRadius: 12 }}>
                            <FontAwesome5 name="fire" size={24} color="#fc4103" />
                        </View>
                        <Text style={{ marginLeft: 12, fontSize: 16 }}>
                            <Text style={{ fontWeight: '700' }}>{stats.racha}</Text> días de racha
                        </Text>
                    </View>

                    {/* Monedas */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                        <View style={{ backgroundColor: '#fff3bd', padding: 10, borderRadius: 12 }}>
                            <FontAwesome5 name="coins" size={24} color="#cca700" />
                        </View>
                        <Text style={{ marginLeft: 12, fontSize: 16 }}>
                            <Text style={{ fontWeight: '700' }}>{stats.monedas}</Text> denigues
                        </Text>
                    </View>
                </View>

                {/* Logros — estilo como tu mock */}
                <View style={{ marginTop: 22, paddingHorizontal: 18, marginBottom: 36 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', fontSize: 18 }}>Logros</Text>
                        <Pressable
                            onPress={() => router.push('/(modals)/logros')}
                            style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#E5E7EB', borderRadius: 999 }}
                        >
                            <Text style={{ fontSize: 12 }}>Ver todos</Text>
                        </Pressable>
                    </View>

                    <View style={{ marginTop: 12, gap: 14 }}>
                        {logros.map((l) => {
                            const uri = l.icono.startsWith('http') ? l.icono : `${baseUrl}${l.icono}`;
                            return (
                                <Pressable
                                    key={l.codLogro}
                                    onPress={() => router.push('/(modals)/logros')}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 14,
                                        padding: 12,
                                        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1
                                    }}
                                >
                                    {/* Icono grande a la izquierda */}
                                    <View style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E7EB' }}>
                                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>

                                    {/* Centro: nombre + subtítulo (usamos nombre y debajo una versión “explicada”) */}
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={{ fontWeight: '800', fontSize: 16 }} numberOfLines={1}>
                                            {l.nombre}
                                        </Text>
                                        <Text style={{ color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
                                            {/* subtítulo simple; si quieres algo específico, trae `descripcion` en /mi-perfil/resumen */}
                                            {l.nombre}
                                        </Text>
                                    </View>

                                    {/* Derecha: recompensa tipo “+ 83 xp” */}
                                    <Text style={{ fontWeight: '800', fontSize: 16, color: '#111' }}>
                                        {fmtRecompensa(l.recompensa)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </FadeWrapper>
    );
}

