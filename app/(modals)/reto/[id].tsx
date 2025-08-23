// app/(modals)/reto/[id].tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../auth/AuthContext';
import { markModalClosed } from '../../../navigation/ModalTracker';
import { useMarkModalOnClose } from "../../../navigation/useMarkModalOnClose";
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';

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
    const g = makeGlobalStyles(colors);

    const styles = useMemo(
        () =>
            StyleSheet.create({
                safe: { flex: 1, backgroundColor: isDark ? colors.bg : '#fff' },
                headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
                backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
                content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
                desc: { textAlign: 'center', marginTop: 24 },
                meta: { marginTop: 20, textAlign: 'center' },
                primaryBtn: {
                    marginTop: 'auto',
                    marginBottom: 24,
                    paddingVertical: 14,
                    paddingHorizontal: 28,
                    backgroundColor: isDark ? colors.primary : '#001780',
                    borderRadius: 999,
                },
                secondaryBtn: {
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    backgroundColor: isDark ? colors.mutedBg : '#eee',
                    borderRadius: 10,
                },
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
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[g.text.caption, { marginTop: 10 }]}>Cargando reto…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[g.text.body, g.text.danger, { textAlign: 'center', marginBottom: 12 }]}>{error}</Text>
                    <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
                        <Text style={g.text.body}>OK</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={g.text.h1}>{reto?.nombreReto}</Text>
                    <Text style={[g.text.body, g.text.secondary, styles.desc, { fontSize: 20 }]}>
                        {reto?.descripcionReto}
                    </Text>
                    <Text style={[g.text.body, styles.meta]}>
                        <Text style={g.text.bodyStrong}>Tiempo estimado: </Text>
                        {formatTiempo(reto?.tiempoEstimadoSegReto ?? 0)}
                    </Text>

                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => {
                            console.log('Empezar reto', id);
                        }}
                    >
                        <Text style={[g.text.smallStrong, g.text.onPrimary]}>Resolver</Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}
