// components/reto/ArchivoReto.tsx
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, Pressable, ScrollView, Alert, TextInput, StyleSheet, ActivityIndicator} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';

import {useTheme} from '../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../theme/GlobalStyles';
import {useAuth} from '../../auth/AuthContext';
import {asJson} from './utils';

// 🔌 mismas utilidades que usa ReportesScreen
import {API, uploadToSignedUrl, BASE_URL} from '../../config/api';

type Area = 'mantenimiento' | 'supervision' | null;

type MetaLike = {
    // posibles alias donde podría venir el tipo/área desde metadata
    areaArchivo?: string;
    area?: string;
    tipoArchivo?: string;
    archivoTipo?: string;
    uploadTipo?: string;
};

export default function ArchivoReto({
                                        codReto,
                                        codUsuarioReto,
                                        fetchJson,
                                        onSent,
                                    }: {
    codReto: number;
    codUsuarioReto: number;
    fetchJson: <T = any>(url: string, init?: any) => Promise<T>;
    onSent: () => void;
}) {
    const {colors} = useTheme();
    const g = makeGlobalStyles(colors);

    const {user} = useAuth();
    const codUsuario =
        (user as any)?.codUsuario ??
        (user as any)?.id ??
        (user as any)?.usuario?.id ??
        1; // fallback defensivo (igual que en ReportesScreen)

    // UI
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [busy, setBusy] = useState(false);
    const [file, setFile] = useState<{ name: string; uri: string; mimeType?: string; size?: number } | null>(null);
    const [nombre, setNombre] = useState<string>('');

    // Selector de “área/tipo” igual que la screen de reportes
    const [selectedTipo, setSelectedTipo] = useState<Area>(null);

    // ───────────────────────────────────────────────────────────────
    // 1) Cargar metadata del reto para inferir “área/tipo” si viene
    // ───────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoadingMeta(true);
                const api = await fetchJson<any>(`/reto/ver/full/${codReto}`);
                // buscar hints en api.metadataReto
                const meta: MetaLike = (api?.metadataReto ?? {}) as any;

                const raw =
                    meta?.areaArchivo ??
                    meta?.area ??
                    meta?.tipoArchivo ??
                    meta?.archivoTipo ??
                    meta?.uploadTipo ??
                    null;

                const norm = (raw ?? '').toString().trim().toLowerCase();
                const inferred: Area =
                    norm === 'mantenimiento' ? 'mantenimiento' :
                        norm === 'supervision' ? 'supervision' :
                            null;

                if (!cancelled) {
                    setSelectedTipo(inferred);
                    // nombre sugerido (si viene de BD)
                    const n = (api?.reto?.nombreReto || '').toString().trim();
                    if (n) setNombre(n);
                }
            } catch {
                // sin drama: seguimos sin tipo preseleccionado
            } finally {
                if (!cancelled) setLoadingMeta(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [codReto, fetchJson]);

    // ───────────────────────────────────────────────────────────────
    // 2) Document picker (igual al de Reportes)
    // ───────────────────────────────────────────────────────────────
    const pick = useCallback(async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                multiple: false,
                copyToCacheDirectory: true,
                type: '*/*',
            });
            if (res.canceled) return;
            const f = res.assets?.[0];
            if (f) setFile({name: f.name || 'archivo', uri: f.uri, mimeType: f.mimeType, size: f.size});
        } catch (e: any) {
            Alert.alert('No se pudo abrir el selector', e?.message || 'Intenta de nuevo.');
        }
    }, []);

    // ───────────────────────────────────────────────────────────────
    // 3) Subida: presign → PUT → complete → registrar como reto
    // ───────────────────────────────────────────────────────────────
    const subirYRegistrar = useCallback(async () => {
        if (!file) {
            Alert.alert('Archivo requerido', 'Por favor selecciona un archivo.');
            return;
        }

        const filename = file.name ?? 'archivo';
        const contentType = file.mimeType ?? 'application/octet-stream';

        try {
            setBusy(true);

            // 3.1 Presign (JWT via fetchJson). Pasamos selectedTipo si el usuario/BD lo define
            const presign = await fetchJson<{ signedUrl: string; objectKey?: string; key?: string }>(
                API.uploads.presign(filename, contentType, codUsuario, selectedTipo ?? undefined)
            );
            const objectKey = presign.key ?? presign.objectKey;
            if (!presign.signedUrl || !objectKey) throw new Error('Presign inválido');

            // 3.2 Validación de entorno (igual que en ReportesScreen)
            if (/^http:\/\/localhost:9000/i.test(presign.signedUrl)) {
                Alert.alert(
                    'Configuración',
                    `El signedUrl apunta a localhost.\nCambia S3_ENDPOINT a la IP LAN de tu PC (igual que ${BASE_URL}).`
                );
                setBusy(false);
                return;
            }

            // 3.3 PUT directo al bucket (sin bearer)
            const fileRes = await fetch(file.uri);
            const blob = await fileRes.blob();

            await uploadToSignedUrl(presign.signedUrl, blob, contentType);

            // 3.4 Registrar metadatos de la subida en BD
            // Importante: si el usuario escribió un "Nombre (opcional)", lo usamos como nombre_original en BD.
            const filenameForDB = (nombre || '').trim() ? nombre.trim() : filename;
            await fetchJson(API.uploads.complete, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    key: objectKey,
                    filename: filenameForDB,
                    contentType,
                    size: (blob as any).size ?? file.size ?? 0,
                    codUsuario,
                    tipo: selectedTipo ?? undefined, // “área”
                    // Puedes agregar etiquetas extra si el back las soporta:
                    // tags: { origen: 'reto', codReto, codUsuarioReto }
                }),
            });

            // 3.5 Registrar snapshot como resolución del reto (mis-retos/form/enviar)
            //     Esto asegura XP/coins y que quede “pegado” al reto.
            const snapshot = {
                kind: 'fileUpload',
                key: objectKey,
                fileName: filename,
                mimeType: contentType,
                size: file.size ?? (blob as any).size ?? 0,
                codUsuario,
                codReto,
                codUsuarioReto,
                tipo: selectedTipo ?? undefined,
                nombre: nombre || undefined,
            };

            const r = await fetchJson(
                `/mis-retos/${codUsuarioReto}/form/enviar`,
                asJson({codUsuarioReto, codReto, data: snapshot})
            );

            const extra = r?.nuevaRacha ? `\n🔥 Racha: ${r.nuevaRacha} día${r.nuevaRacha === 1 ? '' : 's'}` : '';
            Alert.alert('¡Listo!', `Archivo enviado ✅\n+${r?.xpGanada ?? 0} XP, +${r?.coins ?? 0} monedas${extra}`);

            // cerrar el modal (orquestador hace mark + back en onSent)
            onSent();
        } catch (e: any) {
            Alert.alert('Subida', e?.message ?? 'No se pudo subir/registrar el archivo.');
        } finally {
            setBusy(false);
        }
    }, [file, codUsuario, selectedTipo, fetchJson, codReto, codUsuarioReto, nombre, onSent]);

    // ───────────────────────────────────────────────────────────────
    // 4) Helpers UI (pill tipo y estética similar a Reportes)
    // ───────────────────────────────────────────────────────────────
    const c = useMemo(() => ({
        bg: colors.bg,
        card: colors.card,
        text: colors.text,
        soft: colors.mutedText,
        border: colors.tabBorder,
        pill: colors.mutedBg,
        primary: colors.primary,
        danger: colors.danger ?? '#EF4444',
        searchBorder: colors.inputBorder,
    }), [colors]);

    const TipoPill = ({value, label}: { value: Area; label: string }) => {
        const active = selectedTipo === value;
        return (
            <Pressable
                onPress={() => setSelectedTipo(prev => (prev === value ? null : value))}
                style={[
                    styles.tipoPill,
                    {borderColor: c.border, backgroundColor: active ? c.primary : c.pill}
                ]}
            >
                <Text style={{color: active ? '#fff' : c.text, fontWeight: '700'}}>
                    {label}
                </Text>
            </Pressable>
        );
    };

    // ───────────────────────────────────────────────────────────────
    // 5) Render
    // ───────────────────────────────────────────────────────────────
    if (loadingMeta) {
        return (
            <View style={{paddingVertical: 24, alignItems: 'center'}}>
                <ActivityIndicator color={colors.primary}/>
                <Text style={[g.text.caption, {marginTop: 8}]}>Cargando configuración…</Text>
            </View>
        );
    }

    return (
        <ScrollView>
            <Text style={[g.text.body, {marginTop: 8}]}>
                Adjunta tu evidencia/archivo para completar el reto. Si el área (tipo) viene definida desde la BD, ya la
                verás preseleccionada.
            </Text>

            {/* Nombre / etiqueta opcional (se llena con el nombre del reto si existe) */}
            <View style={{marginTop: 12}}>
                <Text style={g.text.bodyStrong}>Nombre (opcional)</Text>
                <TextInput
                    placeholder="Nombre de referencia"
                    placeholderTextColor={c.soft}
                    value={nombre}
                    onChangeText={setNombre}
                    style={{
                        marginTop: 6,
                        borderWidth: 1, borderColor: c.searchBorder, borderRadius: 12,
                        paddingHorizontal: 12, paddingVertical: 10, color: c.text
                    }}
                />
            </View>

            {/* Selector de área/tipo como en Reportes */}
            <View style={{flexDirection: 'row', gap: 8, marginTop: 12}}>
                <TipoPill value="mantenimiento" label="Mantenimiento"/>
                <TipoPill value="supervision" label="Supervisión"/>
            </View>

            <View
                style={{
                    marginTop: 16,
                    borderWidth: 1, borderColor: colors.divider, borderRadius: 12,
                    padding: 12, backgroundColor: colors.card
                }}
            >
                <Text style={g.text.bodyStrong}>Archivo seleccionado</Text>
                <Text style={[g.text.caption, {marginTop: 6, color: file ? colors.text : colors.mutedText}]}>
                    {file ? `${file.name} (${file.mimeType || 'desconocido'})` : 'Ninguno'}
                </Text>

                <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
                    <Pressable
                        onPress={pick}
                        style={[
                            styles.actionBtn,
                            {backgroundColor: c.pill, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth}
                        ]}
                    >
                        <Ionicons name="folder-open-outline" size={18} color={c.text}/>
                        <Text style={{color: c.text, fontWeight: '700', marginLeft: 8}}>Seleccionar archivo</Text>
                    </Pressable>

                    {!!file && (
                        <Pressable
                            onPress={() => setFile(null)}
                            style={[styles.actionBtn, {backgroundColor: c.danger}]}
                        >
                            <Ionicons name="trash" size={18} color="#fff"/>
                            <Text style={{color: '#fff', fontWeight: '700', marginLeft: 8}}>Quitar</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <Pressable
                disabled={!file || busy}
                onPress={subirYRegistrar}
                style={{
                    marginTop: 18, marginBottom: 40,
                    paddingVertical: 14, paddingHorizontal: 28,
                    backgroundColor: (!file || busy) ? colors.divider : colors.primary,
                    borderRadius: 999, alignSelf: 'center', opacity: (!file || busy) ? 0.7 : 1
                }}
            >
                <Text style={{color: '#fff', fontWeight: '700'}}>
                    {busy ? 'Subiendo…' : `Subir archivo${selectedTipo ? ` (${selectedTipo})` : ''}`}
                </Text>
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    tipoPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
});
