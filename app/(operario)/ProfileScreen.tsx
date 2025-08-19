import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { PerfilResumen } from '../../models/PerfilResumen';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

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

    const shake = useRef(new Animated.Value(0)).current;
    const spark = useRef(new Animated.Value(0)).current;
    const lastNickRef = useRef<string | null>(null);

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
        const current = data?.usuario.nickname ?? null;
        const prev = lastNickRef.current;
        if (current && prev && current !== prev) {
            triggerNickCelebrate();
        }
        lastNickRef.current = current;
    }, [data?.usuario.nickname, triggerNickCelebrate]);

    const nickname = data?.usuario.nickname || 'Sin nick';
    const fullname = useMemo(
        () => `${data?.usuario.nombre ?? ''} ${data?.usuario.apellido ?? ''}`.trim(),
        [data?.usuario.nombre, data?.usuario.apellido]
    );

    useFocusEffect( useCallback(() => { cargar(); }, []) );

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
            <View style={{ flex: 1, paddingTop: 64 }}>
                {/* Header: avatar + lápiz */}
                <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
                    <View style={{ alignSelf: 'flex-end' }}>
                        <Pressable onPress={() => router.push('/(modals)/editar-perfil')} /* ... */>
                            <FontAwesome5 name="pen" size={16} color="#333" />
                        </Pressable>
                    </View>

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

                    {/* Nickname */}
                    <View style={{ marginTop: 12, alignItems: 'center', position: 'relative' }}>
                        <Animated.Text style={[{ fontWeight: '700', fontSize: 18, color: '#111' }, shakeStyle]}>
                            {nickname}
                        </Animated.Text>
                        <Animated.View style={starStyle}>
                            <FontAwesome5 name="star" size={14} color="#F59E0B" />
                        </Animated.View>
                    </View>
                    {/* Nombre completo */}
                    <Text style={{ marginTop: 2, fontSize: 14, color: '#555' }}>
                        {fullname}
                    </Text>
                </View>

                {/* Nivel + XP */}
                <View
                    style={{
                        marginTop: 18, marginHorizontal: 18, padding: 16,
                        backgroundColor: '#F3F4F6', borderRadius: 14,
                        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 2
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Nivel redondo */}
                        <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12
                        }}>
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
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#6366F1',
                                transform: [{ scaleX: Math.max(0, Math.min(1, pct)) }],
                                transformOrigin: 'left', // si tu versión lo soporta; si no, añade origin con wrapper
                            }}
                        />
                    </View>

                    {/* Mensaje faltante */}
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

                {/* Logros */}
                <View style={{ marginTop: 22, paddingHorizontal: 18, marginBottom: 36 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', fontSize: 18 }}>Logros</Text>
                        <Pressable
                            // TODO: navega a tu listado general de logros
                            onPress={() => {}}
                            style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#E5E7EB', borderRadius: 999 }}
                        >
                            <Text style={{ fontSize: 12 }}>Ver todos</Text>
                        </Pressable>
                    </View>

                    <View style={{ marginTop: 12, gap: 10 }}>
                        {logros.map((l) => (
                            <View key={l.codLogro}
                                  style={{
                                      flexDirection: 'row', alignItems: 'center',
                                      backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
                                      shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1
                                  }}>
                                {/* Icono del logro */}
                                <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {/* Si guardas rutas absolutas, úsala directo; si son relativas al backend, prefix con baseUrl */}
                                    <Image
                                        source={{ uri: l.icono.startsWith('http') ? l.icono : `${baseUrl}${l.icono}` }}
                                        style={{ width: 48, height: 48 }}
                                        resizeMode="cover"
                                    />
                                </View>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={{ fontWeight: '700' }}>{l.nombre}</Text>
                                    <Text style={{ color: '#6B7280', marginTop: 2 }}>{l.recompensa}</Text>
                                </View>
                                <FontAwesome5 name="angle-right" size={18} color="#9CA3AF" />
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </FadeWrapper>
    );
}
