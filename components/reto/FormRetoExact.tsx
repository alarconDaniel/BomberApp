// components/reto/FormRetoExact.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import {
    AnyField, PrimitiveField, ArrayField,
    initGenericValues, validateGeneric, humanTitle, asJson
} from './utils';

export default function FormRetoExact({
                                          codReto,
                                          codUsuarioReto,
                                          schema,
                                          fetchJson,
                                          onSent
                                      }:{
    codReto: number;
    codUsuarioReto: number;
    schema: Record<string, AnyField>;
    fetchJson: <T=any>(url:string, init?:any)=>Promise<T>;
    onSent: ()=>void;
}) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const [values, setValues] = useState<any>({});
    const [showErrors, setShowErrors] = useState(false);
    const [ok, setOk] = useState<boolean>(true);

    const styles = useMemo(()=>StyleSheet.create({
        obsInput:{borderWidth:1, borderColor: colors.divider, borderRadius:8, paddingVertical:6, paddingHorizontal:8, color: colors.text}
    }), [colors]);

    useEffect(()=>{ setValues(initGenericValues(schema)); }, [schema]);

    useEffect(()=>{
        const falt = validateGeneric(schema, values);
        setOk(falt.length===0);
    }, [schema, values]);

    const send = async () => {
        const falt = validateGeneric(schema, values);
        if (falt.length>0) {
            setShowErrors(true);
            Alert.alert('Faltan campos', `Por favor completa:\n\n• ${falt.join('\n• ')}`);
            return;
        }
        try {
            const r = await fetchJson(`/mis-retos/${codUsuarioReto}/form/enviar`, asJson({
                codUsuarioReto, codReto, data: { kind:'genericForm', data: values }
            }));
            Alert.alert('¡Listo!', `Formulario enviado ✅\n+${r.xpGanada} XP, +${r.coins} monedas`);
            onSent();
        } catch (e:any) {
            Alert.alert('Ups', e?.message || 'No pudimos enviar el formulario');
        }
    };

    const renderField = (k:string, def:AnyField, value:any, onChange:(patch:any)=>void) => {
        if (!def || typeof def !== 'object') return null;
        const isMissing = (d:any, v:any) => {
            if (!showErrors) return false;
            const t = d?.type; const req = !!d?.required; if (!req) return false;
            if (t==='array') return !Array.isArray(v) || v.length===0;
            const s = (v ?? '').toString().trim(); return !s;
        };

        if ('type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            const label = (def as any).label || humanTitle(k);
            const required = !!(def as any).required;
            const err = isMissing(def, value);

            if (t==='array') {
                const arrVal:any[] = Array.isArray(value) ? value : [];
                const itemDef = (def as ArrayField).item || {};
                const addRow = ()=>{ const emptyRow = initGenericValues(itemDef as any); onChange([...(arrVal||[]), emptyRow]); };
                const removeRow = (idx:number)=>{ const next = [...arrVal]; next.splice(idx,1); onChange(next); };
                return (
                    <View key={k} style={{marginTop:18}}>
                        <Text style={[g.text.h3]}>{label}{required?' *':''}</Text>
                        {(arrVal||[]).map((row, idx)=>(
                            <View key={idx} style={{marginTop:10, padding:10, borderWidth:1, borderColor: colors.divider, borderRadius:10}}>
                                <Text style={[g.text.caption, {marginBottom:6}]}>#{idx+1}</Text>
                                {Object.entries(itemDef).map(([sk, sdef])=>(
                                    <View key={sk} style={{marginTop:8}}>
                                        {renderField(sk, sdef as any, row?.[sk], (valPatch)=>{
                                            const next = [...arrVal]; next[idx] = {...next[idx], [sk]: valPatch}; onChange(next);
                                        })}
                                    </View>
                                ))}
                                <Pressable onPress={()=>removeRow(idx)} style={{marginTop:10, alignSelf:'flex-start', paddingVertical:6, paddingHorizontal:12, borderRadius:999, backgroundColor:'#fdecea', borderWidth:1, borderColor:'#f5c6cb'}}>
                                    <Text style={{color:'#842029', fontWeight:'700'}}>Eliminar</Text>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={addRow} style={{marginTop:10, alignSelf:'flex-start', paddingVertical:8, paddingHorizontal:14, borderRadius:999, backgroundColor: colors.card, borderWidth:1, borderColor: colors.divider}}>
                            <Text style={g.text.bodyStrong}>Agregar</Text>
                        </Pressable>
                    </View>
                );
            }

            return (
                <View key={k} style={{marginTop:10}}>
                    <Text style={g.text.bodyStrong}>{label}{required?' *':''}</Text>
                    {t==='textarea' ? (
                        <TextInput multiline placeholder={label} placeholderTextColor={colors.mutedText} value={value ?? ''} onChangeText={(t)=>onChange(t)}
                                   style={{borderWidth:1, borderColor: err? '#dc3545': colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8, minHeight:100, textAlignVertical:'top'}}/>
                    ) : t==='number' ? (
                        <TextInput keyboardType="numeric" placeholder={label} placeholderTextColor={colors.mutedText} value={value!=null ? String(value): ''} onChangeText={(t)=>onChange(t.replace(',', '.').replace(/[^\d.]/g,''))}
                                   style={{borderWidth:1, borderColor: err? '#dc3545': colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                    ) : t==='select' ? (
                        <TextInput placeholder={(def as PrimitiveField).options?.join(' | ') || label} placeholderTextColor={colors.mutedText} value={value ?? ''} onChangeText={(t)=>onChange(t)}
                                   style={{borderWidth:1, borderColor: err? '#dc3545': colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                    ) : t==='file' ? (
                        <TextInput placeholder={(def as PrimitiveField).accept ? `Archivo (${(def as PrimitiveField).accept?.join(', ')})` : label} placeholderTextColor={colors.mutedText} value={value ?? ''} onChangeText={(t)=>onChange(t)}
                                   style={{borderWidth:1, borderColor: err? '#dc3545': colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                    ) : (
                        <TextInput placeholder={label} placeholderTextColor={colors.mutedText} value={value ?? ''} onChangeText={(t)=>onChange(t)}
                                   style={{borderWidth:1, borderColor: err? '#dc3545': colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                    )}
                    {err && <Text style={[g.text.caption, {color: '#dc3545', marginTop:4}]}>Campo obligatorio.</Text>}
                </View>
            );
        }

        if (Array.isArray(def)) return null;

        const groupObj = def as Record<string, AnyField>;
        return (
            <View key={k} style={{marginTop:18}}>
                <Text style={[g.text.h2]}>{humanTitle(k)}</Text>
                {Object.entries(groupObj).map(([sk, sdef])=>(
                    <View key={sk}>
                        {renderField(sk, sdef as any, value?.[sk], (newVal)=>{
                            setValues((prev:any)=>({...prev, [k]: {...(prev?.[k]||{}), [sk]: newVal}}));
                        })}
                    </View>
                ))}
            </View>
        );
    };

    return (
        <ScrollView>
            {Object.keys(schema || {}).length===0 ? (
                <Text style={[g.text.caption, {marginTop:12}]}>Este reto usa un esquema genérico sin campos.</Text>
            ) : (
                Object.entries(schema).map(([k, def])=>(
                    <View key={k}>
                        {renderField(k, def as AnyField, values?.[k], (newVal:any)=>{ setValues((prev:any)=>({...prev, [k]: newVal})); })}
                    </View>
                ))
            )}

            <Pressable
                onPress={()=>{ if (!ok) setShowErrors(true); send(); }}
                style={{marginTop:18, marginBottom:40, paddingVertical:14, paddingHorizontal:28, backgroundColor: ok? '#0d6efd': '#cfd3da', borderRadius:999, alignSelf:'center', opacity: ok? 1: 0.75}}
            >
                <Text style={{color:'#fff', fontWeight:'700'}}>{ok ? 'Enviar formulario' : 'Completa los campos obligatorios'}</Text>
            </Pressable>
        </ScrollView>
    );
}
