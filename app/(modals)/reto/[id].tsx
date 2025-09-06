// app/(modals)/reto/[id].tsx
import React, {useEffect, useMemo, useState} from 'react';
import {
    View, Text, Pressable, ActivityIndicator, SafeAreaView,
    StyleSheet, ScrollView, Alert
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {FontAwesome5} from '@expo/vector-icons';
import dayjs from 'dayjs';

import {useAuth} from '../../../auth/AuthContext';
import {markModalClosed} from '../../../navigation/ModalTracker';
import {useMarkModalOnClose} from '../../../navigation/useMarkModalOnClose';
import {useTheme} from '../../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../../theme/GlobalStyles';
import {Reto} from '../../../models/Reto';

import {
    asJson, s10, RetoFull, InstanciaUR,
    isGroupedChecklist
} from '../../../components/reto/utils';

// Componentes modulares
import ChecklistReto from '../../../components/reto/ChecklistReto';
import FormRetoExact from '../../../components/reto/FormRetoExact';
import QuizReto from '../../../components/reto/QuizReto';
import ArchivoReto from '../../../components/reto/ArchivoReto';

export default function DetalleRetoScreen() {
    useMarkModalOnClose();
    const {colors, isDark} = useTheme();
    const g = makeGlobalStyles(colors);
    const styles = useMemo(()=>StyleSheet.create({
        safe:{flex:1, backgroundColor: isDark? colors.bg: '#fff'},
        headerRow:{paddingHorizontal:16, paddingTop:16, paddingBottom:8},
        backBtn:{flexDirection:'row', alignItems:'center', gap:8},
        center:{flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32},
        pill:{marginTop:10, alignSelf:'flex-start', paddingVertical:6, paddingHorizontal:12, borderRadius:999},
    }), [colors, isDark]);

    const {id, ur: urParam, fecha: fechaParam} = useLocalSearchParams<{ id: string; ur?: string; fecha?: string }>();
    const router = useRouter();
    const {fetchJson} = useAuth();

    const [data, setData] = useState<RetoFull|null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string|null>(null);

    const [resolviendo, setResolviendo] = useState(false);
    const [codUsuarioReto, setCodUsuarioReto] = useState<number|null>(null);
    const [ur, setUr] = useState<InstanciaUR|null>(null);

    const cargarReto = async () => {
        try {
            setCargando(true);
            setError(null);
            const api = await fetchJson<any>(`/reto/ver/full/${id}`);
            const reto = Reto.fromApi(api);
            const tipoReto: RetoFull['tipoReto'] = (api.tipoReto ?? 'quiz') as any;
            setData({
                reto, tipoReto,
                quiz: api.quiz,
                form: api.form ?? api?.metadataReto?.schema,
                metadataReto: api.metadataReto
            });
        } catch (e:any) {
            setError(e?.message || 'No pudimos cargar el reto');
        } finally {
            setCargando(false);
        }
    };

    const cargarUR = async () => {
        try {
            const dia = s10(fechaParam || dayjs().format('YYYY-MM-DD'));
            const rows = await fetchJson<any[]>(`/mis-retos/dia?fecha=${dia}`);
            let row = urParam ? rows.find(r=>Number(r.codUsuarioReto)===Number(urParam)) : rows.find(r=>Number(r.codReto)===Number(id));
            if (row) setUr({ codUsuarioReto: row.codUsuarioReto, estado: row.estado, fechaObjetivo: row.fechaObjetivo, ventanaInicio: row.ventanaInicio, ventanaFin: row.ventanaFin });
            else setUr(null);
        } catch { setUr(null); }
    };

    useEffect(()=>{ cargarReto(); }, [id]);
    useEffect(()=>{ cargarUR(); }, [id, urParam, fechaParam]);

    const hoy = dayjs().format('YYYY-MM-DD');
    const diaModal = s10(fechaParam || hoy);
    const esHoy = diaModal === hoy;

    const estadoVisible = useMemo<'Disponible'|'Aún no disponible'|'Vencido'|'No asignado'>(() => {
        if (!ur) return 'No asignado';
        const ini = s10(ur.ventanaInicio), fin = s10(ur.ventanaFin), obj = s10(ur.fechaObjetivo);
        const ref = hoy;
        if (obj) { if (ref < obj) return 'Aún no disponible'; if (ref > obj) return 'Vencido'; return 'Disponible'; }
        if (ini && fin) { if (ref < ini) return 'Aún no disponible'; if (ref > fin) return 'Vencido'; return 'Disponible'; }
        return 'No asignado';
    }, [ur, hoy]);

    const puedeResolver = useMemo(() => {
        if (!ur) return false;
        if (!esHoy) return false;
        const isDisponible = estadoVisible === 'Disponible';
        const estadoOk = ur.estado === 'asignado' || ur.estado === 'en_progreso';
        return isDisponible && estadoOk;
    }, [ur, esHoy, estadoVisible]);

    const empezar = async () => {
        if (!data) return;
        if (!puedeResolver) {
            Alert.alert('No disponible', 'Este reto no es resoluble ahora (no corresponde a hoy o está fuera de su ventana).');
            return;
        }
        try {
            const r = await fetchJson<any>(`/mis-retos/abrir`, asJson({codReto: Number(id)}));
            setCodUsuarioReto(r.codUsuarioReto);
            setResolviendo(true);
        } catch (e:any) {
            Alert.alert('Ups', e?.message || 'No fue posible abrir el reto');
        }
    };

    const finalizar = async () => {
        if (!codUsuarioReto) return;
        try {
            const r = await fetchJson<any>(`/mis-retos/${codUsuarioReto}/finalizar`, asJson({codUsuarioReto}));
            const extra = r.nuevaRacha ? `\n🔥 Racha: ${r.nuevaRacha} día${r.nuevaRacha===1?'':'s'}` : '';
            Alert.alert('Reto completado', `+${r.xpGanada} XP, +${r.coins} monedas${extra}`);
            markModalClosed(); router.back();
        } catch (e:any) { Alert.alert('Ups', e?.message || 'No pudimos finalizar'); }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.headerRow}>
                <Pressable onPress={()=>{ markModalClosed(); router.back(); }} style={styles.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text}/>
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary}/>
                    <Text style={[g.text.caption, {marginTop:10}]}>Cargando reto…</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[g.text.body, g.text.danger, {textAlign:'center', marginBottom:12}]}>{error}</Text>
                    <Pressable onPress={()=>router.back()} style={{padding:10, backgroundColor: colors.mutedBg, borderRadius:10}}>
                        <Text style={g.text.body}>OK</Text>
                    </Pressable>
                </View>
            ) : !data ? (
                <View style={styles.center}><Text style={g.text.body}>No encontramos el reto.</Text></View>
            ) : !resolviendo ? (
                <ScrollView style={{paddingHorizontal:16}}>
                    <Text style={[g.text.h1, {marginTop:20}]}>{data.reto.nombreReto}</Text>
                    <Text style={[g.text.body, g.text.secondary, {marginTop:8, fontSize:16}]}>{data.reto.descripcionReto}</Text>

                    <View style={{marginTop:12}}>
                        <Text style={g.text.body}>
                            <Text style={g.text.bodyStrong}>Tipo: </Text>{(data.tipoReto ?? 'form').toUpperCase()} ·{' '}
                            <Text style={g.text.bodyStrong}>Tiempo estimado:</Text> {Math.round((data.reto.tiempoEstimadoSegReto ?? 0)/60)} min
                        </Text>
                    </View>

                    <View style={[styles.pill, {backgroundColor: colors.card, borderWidth:1, borderColor: colors.divider}]}>
                        <Text style={g.text.caption}>
                            Ventana: {ur?.fechaObjetivo ? s10(ur.fechaObjetivo) : `${s10(ur?.ventanaInicio)}  →  ${s10(ur?.ventanaFin)}`}
                        </Text>
                    </View>

                    <View style={[
                        styles.pill,
                        {
                            backgroundColor: estadoVisible==='Disponible' ? '#e8f5e9' : estadoVisible==='Aún no disponible' ? '#fff4e5' : estadoVisible==='Vencido' ? '#fdecea' : colors.card,
                            borderWidth:1,
                            borderColor: estadoVisible==='Disponible' ? '#a5d6a7' : estadoVisible==='Aún no disponible' ? '#ffd8a8' : estadoVisible==='Vencido' ? '#f5c6cb' : colors.divider
                        }
                    ]}>
                        <Text style={{color: estadoVisible==='Disponible' ? '#1b5e20' : estadoVisible==='Aún no disponible' ? '#8a4b08' : estadoVisible==='Vencido' ? '#842029' : colors.text}}>
                            Estado del reto (hoy): {estadoVisible}
                        </Text>
                    </View>

                    {ur && diaModal !== hoy && (
                        <Text style={[g.text.caption, {marginTop:10}]}>
                            Este reto corresponde a {diaModal}. No se puede resolver fuera de su día.
                        </Text>
                    )}

                    {puedeResolver && (
                        <Pressable
                            style={{marginTop:18, paddingVertical:14, paddingHorizontal:28, backgroundColor: isDark? colors.primary: '#001780', borderRadius:999, alignSelf:'center'}}
                            onPress={empezar}
                        >
                            <Text style={[g.text.smallStrong, g.text.onPrimary]}>Resolver</Text>
                        </Pressable>
                    )}
                </ScrollView>
            ) : (
                <View style={{flex:1, paddingHorizontal:16, paddingBottom:24}}>
                    <View style={{marginHorizontal:-16, backgroundColor: colors.cardTint, alignItems:'center'}}>
                        <Text style={[g.text.h2, {paddingVertical:20, paddingHorizontal:16, textAlign:'center'}]}>
                            Resolución de {data?.reto?.nombreReto}
                        </Text>
                    </View>

                    {/* Decisión EXACTA de UX: si metadata es checklist agrupado, renderizamos ChecklistReto;
              si no, y el tipo es 'form'/'checklist', usamos FormRetoExact; 'quiz' → QuizReto; 'archivo' → ArchivoReto */}
                    {isGroupedChecklist(data?.metadataReto) ? (
                        <ChecklistReto
                            codReto={data.reto.codReto}
                            codUsuarioReto={codUsuarioReto!}
                            metadataReto={data.metadataReto}
                            fetchJson={fetchJson}
                            onSent={()=>{ markModalClosed(); router.back(); }}
                        />
                    ) : (data.tipoReto === 'form' || data.tipoReto === 'checklist') ? (
                        <FormRetoExact
                            codReto={data.reto.codReto}
                            codUsuarioReto={codUsuarioReto!}
                            schema={data.form || data.metadataReto?.schema || {}}
                            fetchJson={fetchJson}
                            onSent={()=>{ markModalClosed(); router.back(); }}
                        />
                    ) : data.tipoReto === 'quiz' ? (
                        <QuizReto
                            codUsuarioReto={codUsuarioReto!}
                            preguntas={data.quiz?.preguntas || []}
                            fetchJson={fetchJson}
                            onFinish={finalizar}
                        />
                    ) : data.tipoReto === 'archivo' ? (
                        <ArchivoReto
                            codReto={data.reto.codReto}
                            codUsuarioReto={codUsuarioReto!}
                            fetchJson={fetchJson}
                            onSent={()=>{ markModalClosed(); router.back(); }}
                        />
                    ) : null}
                </View>
            )}
        </SafeAreaView>
    );
}
