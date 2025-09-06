// components/reto/QuizReto.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { Pregunta, asJson } from './utils';

export default function QuizReto({
                                     codUsuarioReto,
                                     preguntas,
                                     fetchJson,
                                     onFinish,
                                 }:{
    codUsuarioReto:number;
    preguntas: Pregunta[];
    fetchJson:<T=any>(url:string, init?:any)=>Promise<T>;
    onFinish: ()=>void;
}) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const [idx, setIdx] = useState(0);
    const [respuestas, setRespuestas] = useState<Record<number, any>>({});
    const preguntaActual = preguntas[idx];
    const total = preguntas.length;

    const setResp = (codPregunta: number, v:any) => setRespuestas((s)=>({...s, [codPregunta]: v}));

    const responderYAvanzar = async () => {
        if (!preguntaActual) return;
        const valor = respuestas[preguntaActual.codPregunta] ?? null;
        try {
            await fetchJson(`/mis-retos/${codUsuarioReto}/quiz/responder`, asJson({codUsuarioReto, codPregunta: preguntaActual.codPregunta, valor, tiempoSeg: null}));
            if (idx + 1 < total) setIdx(idx+1);
            else Alert.alert('Listo', 'Has respondido todas las preguntas. Pulsa Finalizar para cerrar.');
        } catch (e:any) {
            Alert.alert('Ups', e?.message || 'No pudimos guardar tu respuesta');
        }
    };

    return (
        <ScrollView>
            {!preguntaActual ? (
                <Text style={[g.text.body, { marginTop: 12 }]}>No hay preguntas.</Text>
            ) : (
                <>
                    <Text style={[g.text.h3, {marginTop:10}]}>Pregunta {preguntaActual.numero} / {total}</Text>
                    <Text style={[g.text.body, {marginTop:6}]}>{preguntaActual.enunciado}</Text>

                    {preguntaActual.tipo === 'abcd' && (
                        <View style={{marginTop:12}}>
                            {(preguntaActual.opciones || []).map((op) => {
                                const active = respuestas[preguntaActual.codPregunta] === op.codOpcion;
                                return (
                                    <Pressable key={op.codOpcion}
                                               onPress={()=>setResp(preguntaActual.codPregunta, op.codOpcion)}
                                               style={{marginTop:6, padding:12, borderRadius:10, borderWidth:1, borderColor: active? colors.primary: colors.divider, backgroundColor: active? colors.primary: 'transparent'}}>
                                        <Text style={{color: active? '#fff': colors.text}}>{op.texto}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {preguntaActual.tipo === 'rellenar' && (
                        <View style={{marginTop:12}}>
                            <TextInput
                                placeholder="Escribe tu respuesta…" placeholderTextColor={colors.mutedText}
                                value={respuestas[preguntaActual.codPregunta] ?? ''} onChangeText={(t)=>setResp(preguntaActual.codPregunta, t)}
                                style={{borderWidth:1, borderColor: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}
                            />
                        </View>
                    )}

                    <Pressable onPress={responderYAvanzar}
                               style={{marginTop:18, paddingVertical:14, paddingHorizontal:28, backgroundColor: colors.primary, borderRadius:999, alignSelf:'center'}}>
                        <Text style={{color:'#fff', fontWeight:'700'}}>
                            {idx + 1 < total ? 'Guardar y siguiente' : 'Guardar última'}
                        </Text>
                    </Pressable>

                    <Pressable onPress={onFinish}
                               style={{marginTop:14, paddingVertical:14, paddingHorizontal:28, backgroundColor:'#198754', borderRadius:999, alignSelf:'center', marginBottom:24}}>
                        <Text style={{color:'#fff', fontWeight:'700'}}>Finalizar</Text>
                    </Pressable>
                </>
            )}
        </ScrollView>
    );
}
