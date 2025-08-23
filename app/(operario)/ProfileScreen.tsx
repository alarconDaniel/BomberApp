// app/(operario)/ProfileScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Image, Pressable, Text, View, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import FadeWrapper from '../../components/operario/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { PerfilResumen } from '../../models/PerfilResumen';
import { useRouter, useFocusEffect } from 'expo-router';
import LevelUpOverlay from '../../components/operario/LevelUpOverlay';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const AVATAR_SIZE = 110;

function initials(nombre?: string, apellido?: string) {
    const n = (nombre || '').trim();
    const a = (apellido || '').trim();
    const i1 = n ? n[0] : '';
    const i2 = a ? a[0] : '';
    return (i1 + i2).toUpperCase() || '👤';
}

export default function ProfileScreen() {
    const { colors, isDark } = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);
    const router = useRouter();

    const lastLevelRef = useRef<number | null>(null);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState<number>(0);

    const shake = useRef(new Animated.Value(0)).current;
    const spark = useRef(new Animated.Value(0)).current;
    const lastNickRef = useRef<string | null>(null);

    const fmtRecompensa = (r?: string) => (r ? (r.trim().startsWith('+') ? r.trim() : `+ ${r.trim()}`) : '');

    const triggerNickCelebrate = useCallback(() => {
        shake.setValue(0);
        Animated.sequence([
            Animated.timing(shake, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();

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
        const currentNick = data?.usuario.nickname ?? null;
        const prevNick = lastNickRef.current;
        if (currentNick && prevNick && currentNick !== prevNick) {
            triggerNickCelebrate();
        }
        lastNickRef.current = currentNick;

        const lvl = data?.stats?.nivel;
        const prevLvl = lastLevelRef.current;
        if (typeof lvl === 'number') {
            if (prevLvl !== null && lvl > prevLvl) {
                setNewLevel(lvl);
                setShowLevelUp(true);
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

    // 🎨 Paleta: respetamos exactamente tu mapeo original
    const P = isDark ? {
        bg: colors.bg,
        headerBg: colors.bg,
        iconPen: colors.text,

        avatarBg: colors.brandBlueSoft,
        avatarBorder: colors.brandBlueBorder,
        avatarInitials: colors.primary,

        nick: colors.text,
        fullname: colors.secondaryText,

        levelCardBg: colors.mutedBg,
        levelText: colors.text,
        levelCircleBorder: colors.brandBlueBorder,
        levelCircleBg: colors.brandBlueSoft,
        levelNumber: colors.primary,
        xpText: colors.text,

        progressTrack: colors.outline,
        progressFill: colors.primary,

        progressHint: colors.mutedText,

        sectionTitle: colors.text,

        streakIcon: colors.streak,
        streakBg: colors.streakBg,
        coinIcon: colors.coin,
        coinBg: colors.coinBg,

        chipBg: colors.mutedBg,
        chipText: colors.text,

        logroItemBg: colors.cardTint,
        logroItemBorder: colors.divider,
        logroImgBg: colors.imageBg,
        logroTitle: colors.text,
        logroSubtitle: colors.mutedText,
        logroReward: colors.text,

        star: colors.warning,
    } : {
        bg: '#fff',
        headerBg: '#fff',
        iconPen: '#333',

        avatarBg: '#EEF2FF',
        avatarBorder: '#C7D2FE',
        avatarInitials: '#4F46E5',

        nick: '#111',
        fullname: '#555',

        levelCardBg: '#F3F4F6',
        levelText: '#111',
        levelCircleBorder: '#A5B4FC',
        levelCircleBg: '#EEF2FF',
        levelNumber: '#4338CA',
        xpText: '#111',

        progressTrack: '#E5E7EB',
        progressFill: '#6366F1',

        progressHint: '#6B7280',

        sectionTitle: '#000',

        streakIcon: '#fc4103',
        streakBg: '#ffcfbf',
        coinIcon: '#cca700',
        coinBg: '#fff3bd',

        chipBg: '#E5E7EB',
        chipText: '#000',

        logroItemBg: '#F9FAFB',
        logroItemBorder: '#E5E7EB',
        logroImgBg: '#E5E7EB',
        logroTitle: '#111',
        logroSubtitle: '#6B7280',
        logroReward: '#111',

        star: '#F59E0B',
    };

    if (loading) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.bg }}>
                    <ActivityIndicator size="large" color={isDark ? colors.primary : undefined} />
                    <Text style={[g.text.caption, { marginTop: 16, color: P.nick }]}>Cargando perfil…</Text>
                </View>
            </FadeWrapper>
        );
    }
    if (err || !data) {
        return (
            <FadeWrapper>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, backgroundColor: P.bg }}>
                    <Text style={[g.text.body, { textAlign: 'center', marginBottom: 12, color: P.nick }]}>
                        {err || 'Uy, algo pasó cargando el perfil.'}
                    </Text>
                    <Pressable
                        onPress={cargar}
                        style={{ backgroundColor: P.chipBg, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }}
                    >
                        <Text style={[g.text.body, { color: P.chipText }]}>Reintentar</Text>
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
                style={{ flex: 1, backgroundColor: P.bg }}
                contentContainerStyle={{ paddingBottom: 40 }}
                stickyHeaderIndices={[0]}
                showsVerticalScrollIndicator={false}
            >
                {/* === Sticky Header: Avatar + Nick + Nombre === */}
                <View style={{ backgroundColor: P.headerBg, paddingTop: 56, paddingBottom: 16 }}>
                    {/* Lápiz editar arriba a la derecha */}
                    <View style={{ alignItems: 'flex-end', paddingHorizontal: 20 }}>
                        <Pressable onPress={() => router.push('/(modals)/editar-perfil')}>
                            <FontAwesome5 name="pen" size={16} color={P.iconPen} />
                        </Pressable>
                    </View>

                    {/* Avatar */}
                    <View style={{ alignItems: 'center' }}>
                        <View
                            style={{
                                width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                                backgroundColor: P.avatarBg, alignItems: 'center', justifyContent: 'center',
                                borderWidth: 3, borderColor: P.avatarBorder
                            }}
                        >
                            <Text style={{ fontSize: 40, fontWeight: '800', color: P.avatarInitials }}>
                                {initials(data.usuario.nombre, data.usuario.apellido)}
                            </Text>
                        </View>

                        {/* Nickname animado */}
                        <View style={{ marginTop: 12, alignItems: 'center', position: 'relative' }}>
                            <Animated.Text style={[g.text.h3, { color: P.nick }, shakeStyle]}>
                                {nickname}
                            </Animated.Text>
                            <Animated.View style={starStyle}>
                                <FontAwesome5 name="star" size={14} color={P.star} />
                            </Animated.View>
                        </View>

                        {/* Nombre completo */}
                        <Text style={[g.text.small, { marginTop: 2, color: P.fullname }]}>{fullname}</Text>
                    </View>
                </View>

                {/* === Contenido scrolleable === */}

                {/* Nivel + XP */}
                <View
                    style={{
                        marginTop: 8, marginHorizontal: 18, padding: 16,
                        backgroundColor: P.levelCardBg, borderRadius: 14,
                        shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 2
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[g.text.body, { color: P.levelText }]}>Nivel</Text>
                            <View style={{
                                width: 36, height: 36, borderRadius: 18,
                                borderWidth: 2, borderColor: P.levelCircleBorder, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: P.levelCircleBg
                            }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: P.levelCircleBorder }}>{stats.nivel}</Text>
                            </View>
                        </View>
                        <Text style={[g.text.small, { color: P.xpText }]}>EXP {stats.xp}</Text>
                    </View>

                    {/* Barra de progreso */}
                    <View style={{ height: 10, backgroundColor: P.progressTrack, borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
                        <Animated.View
                            style={{
                                width: `${Math.round(pct * 100)}%`,
                                height: '100%',
                                backgroundColor: P.progressFill,
                            }}
                        />
                    </View>

                    <Text style={[g.text.caption, { marginTop: 8, color: P.progressHint }]}>
                        a {stats.faltante} EXP para llegar al nivel {stats.nivel + 1}
                    </Text>
                </View>

                {/* Resumen */}
                <View style={{ marginTop: 18, paddingHorizontal: 18 }}>
                    <Text style={[g.text.h3, { color: P.sectionTitle }]}>Resumen</Text>

                    {/* Racha */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                        <View style={{ backgroundColor: P.streakBg, padding: 10, borderRadius: 12 }}>
                            <FontAwesome5 name="fire" size={24} color={P.streakIcon} />
                        </View>
                        <Text style={[g.text.body, { marginLeft: 12, color: P.sectionTitle }]}>
                            <Text style={{ fontWeight: '700', color: P.sectionTitle }}>{stats.racha}</Text> días de racha
                        </Text>
                    </View>

                    {/* Monedas */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                        <View style={{ backgroundColor: P.coinBg, padding: 10, borderRadius: 12 }}>
                            <FontAwesome5 name="coins" size={24} color={P.coinIcon} />
                        </View>
                        <Text style={[g.text.body, { marginLeft: 12, color: P.sectionTitle }]}>
                            <Text style={{ fontWeight: '700', color: P.sectionTitle }}>{stats.monedas}</Text> denigues
                        </Text>
                    </View>
                </View>

                {/* Logros — estilo como tu mock */}
                <View style={{ marginTop: 22, paddingHorizontal: 18, marginBottom: 36 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[g.text.h3, { color: P.sectionTitle }]}>Logros</Text>
                        <Pressable
                            onPress={() => router.push('/(modals)/logros')}
                            style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: P.chipBg, borderRadius: 999 }}
                        >
                            <Text style={[g.text.captionStrong, { color: P.chipText }]}>Ver todos</Text>
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
                                        backgroundColor: P.logroItemBg,
                                        borderRadius: 14,
                                        padding: 12,
                                        shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1,
                                        borderWidth: 1,
                                        borderColor: P.logroItemBorder
                                    }}
                                >
                                    {/* Icono grande a la izquierda */}
                                    <View style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: P.logroImgBg }}>
                                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                    </View>

                                    {/* Centro: nombre + subtítulo */}
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[g.text.bodyStrong, { color: P.logroTitle }]} numberOfLines={1}>
                                            {l.nombre}
                                        </Text>
                                        <Text style={[g.text.caption, { color: P.logroSubtitle, marginTop: 2 }]} numberOfLines={1}>
                                            {l.nombre}
                                        </Text>
                                    </View>

                                    {/* Derecha: recompensa */}
                                    <Text style={[g.text.bodyStrong, { color: P.logroReward }]}>
                                        {fmtRecompensa(l.recompensa)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            {/* Overlay de level up (si lo usas) */}
            {showLevelUp && (
                <LevelUpOverlay visible={showLevelUp} level={newLevel} onClose={() => setShowLevelUp(false)} />
            )}
        </FadeWrapper>
    );
}
