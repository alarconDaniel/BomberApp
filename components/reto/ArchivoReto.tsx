// components/reto/ArchivoReto.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import * as DocumentPicker from 'expo-document-picker';
import { asJson } from './utils';

export default function ArchivoReto({
                                        codReto,
                                        codUsuarioReto,
                                        fetchJson,
                                        onSent
                                    }:{
    codReto:number;
    codUsuarioReto:number;
    fetchJson:<T=any>(url:string, init?:any)=>Promise<T>;
    onSent:()=>void;
}) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const [file, setFile] = useState<{ name:string; uri:string; mimeType?:string; size?:number } | null>(null);

    const pick = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                multiple: false,
                copyToCacheDirectory: true,
                type: '*/*', // si quieres filtrar: ['image/*','application/pdf'] …
            });
            if (res.canceled) return;
            const f = res.assets?.[0];
            if (f) setFile({ name: f.name || 'archivo', uri: f.uri, mimeType: f.mimeType, size: f.size });
        } catch (e:any) {
            Alert.alert('No se pudo abrir el selector', e?.message || 'Intenta de nuevo.');
        }
    };

    const enviar = async () => {
        if (!file) {
            Alert.alert('Archivo requerido', 'Por favor selecciona un archivo.');
            return;
        }
        try {
            // Mantenemos la misma ruta y patrón de snapshot que tienes para formularios
            const snapshot = { kind: 'fileUpload', fileName: file.name, uri: file.uri, mimeType: file.mimeType, size: file.size };
            const r = await fetchJson(`/mis-retos/${codUsuarioReto}/form/enviar`, asJson({ codUsuarioReto, codReto, data: snapshot }));
            Alert.alert('¡Listo!', `Archivo enviado ✅\n+${r.xpGanada} XP, +${r.coins} monedas`);
            onSent();
        } catch (e:any) {
            Alert.alert('Ups', e?.message || 'No pudimos enviar el archivo');
        }
    };

    return (
        <ScrollView>
            <Text style={[g.text.body, { marginTop: 8 }]}>
                Adjunta tu evidencia/archivo para completar el reto.
            </Text>

            <View style={{ marginTop: 16, borderWidth:1, borderColor: colors.divider, borderRadius:12, padding:12, backgroundColor: colors.card }}>
                <Text style={g.text.bodyStrong}>Archivo seleccionado</Text>
                <Text style={[g.text.caption, { marginTop: 6, color: file ? colors.text : colors.mutedText }]}>
                    {file ? `${file.name} (${file.mimeType || 'desconocido'})` : 'Ninguno'}
                </Text>

                <Pressable
                    onPress={pick}
                    style={{marginTop:12, alignSelf:'flex-start', paddingVertical:10, paddingHorizontal:16, borderRadius:999, backgroundColor: colors.card, borderWidth:1, borderColor: colors.divider}}
                >
                    <Text style={g.text.bodyStrong}>Seleccionar archivo</Text>
                </Pressable>
            </View>

            <Pressable
                onPress={enviar}
                style={{marginTop:18, marginBottom:40, paddingVertical:14, paddingHorizontal:28, backgroundColor: colors.primary, borderRadius:999, alignSelf:'center'}}
            >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar archivo</Text>
            </Pressable>
        </ScrollView>
    );
}
