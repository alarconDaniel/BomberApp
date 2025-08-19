// app/(modals)/reto/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../../auth/AuthContext';
import { markModalClosed } from '../../../navigation/ModalTracker';
import {useMarkModalOnClose} from "../../../navigation/useMarkModalOnClose"; // ajusta el path si difiere


type RetoDetalle = {
    codReto: number;
    nombreReto: string;
    descripcionReto: string;
    tiempoEstimadoSegReto: number; // ms o seg según tu API: ajusta
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
                // Ajusta a tu endpoint real para 1 reto:
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
    }, [id]);

    return (
        <SafeAreaView style={styles.safe}>
            {/* Botón volver */}
            <View style={styles.headerRow}>
                <Pressable onPress={() => {markModalClosed(); router.back()}} style={styles.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} />
                    <Text style={styles.backTxt}>Volver</Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" />
                    <Text style={{ marginTop: 10 }}>Cargando reto…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={{ textAlign: 'center', marginBottom: 12 }}>{error}</Text>
                    <Pressable onPress={() => router.back()} style={styles.secondaryBtn}>
                        <Text>OK</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.content}>
                    {/* Título centrado */}
                    <Text style={styles.title}>{reto?.nombreReto}</Text>

                    {/* Descripción centrada */}
                    <Text style={styles.desc}>{reto?.descripcionReto}</Text>

                    {/* Tiempo estimado */}
                    <Text style={styles.meta}>
                        <Text style={{ fontWeight: '600' , fontSize: 20}}>Tiempo estimado: </Text>
                        {formatTiempo(reto?.tiempoEstimadoSegReto ?? 0)}
                    </Text>

                    {/* Botón para empezar el reto */}
                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => {
                            // navega a tu flujo de preguntas/juego
                            // router.push(`/(modals)/reto/${id}/resolver`)  // si lo haces modal también
                            // o a una screen normal sin modal:
                            // router.push(`/reto/${id}/resolver`);
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

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backTxt: { fontSize: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
    title: { textAlign: 'center', fontSize: 32, fontWeight: 'bold', marginTop: 24 },
    desc: { textAlign: 'center', marginTop: 24, lineHeight: 24, fontSize:20, opacity: 0.85 },
    meta: { marginTop: 20, textAlign: 'center', fontSize: 20 },
    primaryBtn: {
        marginTop: 'auto',
        marginBottom: 24,
        paddingVertical: 14,
        paddingHorizontal: 28,
        backgroundColor: '#001780',
        borderRadius: 999,
    },
    primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
    secondaryBtn: { paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#eee', borderRadius: 10 },
});
