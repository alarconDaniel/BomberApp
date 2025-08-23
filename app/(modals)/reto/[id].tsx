// app/(modals)/reto/[id].tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../auth/AuthContext';
import { markModalClosed } from '../../../navigation/ModalTracker';
import { useMarkModalOnClose } from "../../../navigation/useMarkModalOnClose";
import { useTheme } from '../../../theme/ThemeProvider';

type RetoDetalle = {
    codReto: number;
    nombreReto: string;
    descripcionReto: string;
    tiempoEstimadoSegReto: number;
};

function formatTiempo(ms: number) {
    if (!ms || isNaN(ms)) return '0 min';
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m} minutos`;
}

export default function DetalleRetoScreen() {
    useMarkModalOnClose();
    const { colors, isDark } = useTheme();

    const styles = useMemo(
        () =>
            StyleSheet.create({
                safe: { flex: 1, backgroundColor: isDark ? colors.bg : '#fff' },
                headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
                backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                backTxt: { fontSize: 16, color: isDark ? colors.text : undefined as any },
                center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
                content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
                title: { textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginTop: 24, color: colors.text },
                desc: { textAlign: 'center', marginTop: 24, lineHeight: 24, fontSize: 20, opacity: 0.85, color: isDark ? colors.secondaryText : undefined as any },
                meta: { marginTop: 20, textAlign: 'center', fontSize: 20, color: colors.text },
                primaryBtn: {
                    marginTop: 'auto',
                    marginBottom: 24,
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    backgroundColor: isDark ? colors.primary : '#001780',
                    borderRadius: 999,
                },
                primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
                secondaryBtn: {
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    backgroundColor: isDark ? colors.mutedBg : '#eee',
                    borderRadius: 10,
                },
                secondaryBtnTxt: { color: colors.text },
                inlineStrong: { fontWeight: '600', fontSize: 20, color: colors.text },
                hint: { marginTop: 10, color: colors.text },
                errorTxt: { textAlign: 'center', marginBottom: 12, color: colors.text },
            }),
        [colors, isDark]
    );

    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { fetchJson } = useAuth();

    const [reto, setReto] = useState<RetoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargar = async () => {
            try {
                setCargando(true);
                setError(null);
                const data = await fetchJson<any>(`/reto/ver/${id}`);
                const detalle: RetoDetalle = {
                    codReto: data?.codReto ?? data?.cod ?? Number(id),
                    nombreReto: data?.nombreReto ?? data?.nombre ?? 'Reto',
                    descripcionReto: data?.descripcionReto ?? data?.descripcion ?? '',
                    tiempoEstimadoSegReto: data?.tiempoEstimadoSegReto ?? data?.tiempo ?? 0,
                };
                setReto(detalle);
            } catch (e: any) {
                setError(e?.message || 'No pudimos cargar el reto');
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [id, fetchJson]);

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.headerRow}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={styles.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={styles.backTxt}>Volver</Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.hint}>Cargando reto…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorTxt}>{error}</Text>
                    <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
                        <Text style={styles.secondaryBtnTxt}>OK</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.title}>{reto?.nombreReto}</Text>
                    <Text style={styles.desc}>{reto?.descripcionReto}</Text>
                    <Text style={styles.meta}>
                        <Text style={styles.inlineStrong}>Tiempo estimado: </Text>
                        {formatTiempo(reto?.tiempoEstimadoSegReto ?? 0)}
                    </Text>

                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => {
                            console.log('Empezar reto', id);
                        }}
                    >
                        <Text style={styles.primaryBtnTxt}>Resolver</Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}
