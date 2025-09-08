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

type MetaArchivo = {
    kind?: string; // 'archivo'
    instrucciones?: string;
    tiposPermitidos?: Array<'pdf'|'jpg'|'png'|'docx'>;
};

const DEFAULT_ALLOWED = ['pdf'] as const;
type AllowedExt = typeof DEFAULT_ALLOWED[number] | 'jpg' | 'png' | 'docx';

function extFromNameOrMime(name?: string, mime?: string): string | null {
    const byName = (name || '').split('.').pop()?.toLowerCase();
    if (byName) return byName;
    if (!mime) return null;
    // Simplón: mapear mimes comunes
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'image/jpeg') return 'jpg';
    if (mime === 'image/png') return 'png';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (mime === 'application/msword') return 'doc';
    return null;
}

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
        1; // fallback defensivo

    // UI
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [busy, setBusy] = useState(false);
    const [file, setFile] = useState<{ name: string; uri: string; mimeType?: string; size?: number } | null>(null);
    const [nombre, setNombre] = useState<string>('');

    // Selector de “área/tipo” — SOLO decide carpeta en el storage
    const [selectedTipo, setSelectedTipo] = useState<Area>(null);

    // Metadata del reto (instrucciones + tiposPermitidos)
    const [instrucciones, setInstrucciones] = useState<string>('');
    const [allowedExts, setAllowedExts] = useState<AllowedExt[]>(['pdf']);

    // ───────────────────────────────────────────────────────────────
    // 1) Cargar metadata del reto para leer instrucciones y tiposPermitidos
    // ───────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoadingMeta(true);
                const api = await fetchJson<any>(`/reto/ver/full/${codReto}`);
                const meta: MetaArchivo | null = (() => {
                    const raw = api?.metadataReto ?? null;
                    if (!raw) return null;
                    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
                })();

                const instr = (meta?.instrucciones || '').toString().trim();
                const allowed = Array.isArray(meta?.tiposPermitidos) && meta?.tiposPermitidos.length
                    ? meta!.tiposPermitidos.map(x => String(x).toLowerCase()) as AllowedExt[]
                    : (DEFAULT_ALLOWED as unknown as AllowedExt[]);

                if (!cancelled) {
                    setInstrucciones(instr);
                    setAllowedExts(allowed);
                    const title = (api?.reto?.nombreReto || '').toString().trim();
                    if (title) setNombre(title);
                }
            } catch {
                if (!cancelled) {
                    setInstrucciones('');
                    setAllowedExts(DEFAULT_ALLOWED as unknown as AllowedExt[]);
                }
            } finally {
                if (!cancelled) setLoadingMeta(false);
            }
        })();
        return () => { cancelled = true; };
    }, [codReto, fetchJson]);

    // ───────────────────────────────────────────────────────────────
    // 2) Document picker
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
    // 3) Validación por extensión contra allowedExts
    // ───────────────────────────────────────────────────────────────
    function validateExtensionOrWarn(): boolean {
        if (!file) return false;
        const ext = extFromNameOrMime(file.name, file.mimeType);
        if (!ext) {
            Alert.alert('Validación', `No pudimos determinar la extensión. Tipos permitidos: ${allowedExts.join(', ').toUpperCase()}`);
            return false;
        }
        const ok = allowedExts.includes(ext as AllowedExt);
        if (!ok) {
            Alert.alert('Tipo no permitido', `Este reto acepta: ${allowedExts.join(', ').toUpperCase()}\nTu archivo: “.${ext}”`);
        }
        return ok;
    }

    // ───────────────────────────────────────────────────────────────
    // 4) Subida: presign → PUT → complete → registrar como reto
    // ───────────────────────────────────────────────────────────────
    const subirYRegistrar = useCallback(async () => {
        if (!file) {
            Alert.alert('Archivo requerido', 'Por favor selecciona un archivo.');
            return;
        }
        if (!validateExtensionOrWarn()) return;

        const filename = file.name ?? 'archivo';
        const contentType = file.mimeType ?? 'application/octet-stream';

        try {
            setBusy(true);

            // 4.1 Presign (JWT via fetchJson). Pasamos selectedTipo solo para carpeta.
            const presign = await fetchJson<{ signedUrl: string; objectKey?: string; key?: string }>(
                API.uploads.presign(filename, contentType, codUsuario, selectedTipo ?? undefined)
            );
            const objectKey = presign.key ?? presign.objectKey;
            if (!presign.signedUrl || !objectKey) throw new Error('Presign inválido');

            // 4.2 Validación de entorno
            if (/^http:\/\/localhost:9000/i.test(presign.signedUrl)) {
                Alert.alert(
                    'Configuración',
                    `El signedUrl apunta a localhost.\nCambia S3_ENDPOINT a la IP LAN de tu PC (igual que ${BASE_URL}).`
                );
                setBusy(false);
                return;
            }

            // 4.3 PUT directo al bucket (sin bearer)
            const fileRes = await fetch(file.uri);
            const blob = await fileRes.blob();

            await uploadToSignedUrl(presign.signedUrl, blob, contentType);

            // 4.4 Registrar metadatos de la subida en BD
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
                    // 'tipo' (área) NO se persiste como atributo lógico en BD; solo afecta carpeta
                    tipo: selectedTipo ?? undefined,
                }),
            });

            // 4.5 Registrar snapshot como resolución del reto (XP/coins)
            const snapshot = {
                kind: 'fileUpload',
                key: objectKey,
                fileName: filename,
                mimeType: contentType,
                size: file.size ?? (blob as any).size ?? 0,
                codUsuario,
                codReto,
                codUsuarioReto,
                tipo: selectedTipo ?? undefined, // solo informativo
                nombre: nombre || undefined,
                allowedAtSubmit: allowedExts,    // traza útil
            };

            const r = await fetchJson(
                `/mis-retos/${codUsuarioReto}/form/enviar`,
                asJson({codUsuarioReto, codReto, data: snapshot})
            );

            const extra = r?.nuevaRacha ? `\n🔥 Racha: ${r.nuevaRacha} día${r.nuevaRacha === 1 ? '' : 's'}` : '';
            Alert.alert('¡Listo!', `Archivo enviado ✅\n+${r?.xpGanada ?? 0} XP, +${r?.coins ?? 0} monedas${extra}`);

            onSent();
        } catch (e: any) {
            Alert.alert('Subida', e?.message ?? 'No se pudo subir/registrar el archivo.');
        } finally {
            setBusy(false);
        }
    }, [file, codUsuario, selectedTipo, fetchJson, codReto, codUsuarioReto, nombre, allowedExts, onSent]);

    // ───────────────────────────────────────────────────────────────
    // 5) UI helpers
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
    // 6) Render
    // ───────────────────────────────────────────────────────────────
    if (loadingMeta) {
        return (
            <View style={{paddingVertical: 24, alignItems: 'center'}}>
                <ActivityIndicator color={colors.primary}/>
                <Text style={[g.text.caption, {marginTop: 8}]}>Cargando configuración…</Text>
            </View>
        );
    }

    const allowedText = allowedExts.length ? allowedExts.map(x=>x.toUpperCase()).join(', ') : 'PDF';

    return (
        <ScrollView>
            {!!instrucciones ? (
                <View style={{padding:12, borderRadius:12, backgroundColor: colors.card, borderColor: colors.inputBorder, borderWidth: StyleSheet.hairlineWidth}}>
                    <Text style={g.text.bodyStrong}>Instrucciones</Text>
                    <Text style={[g.text.body, {marginTop:6}]}>{instrucciones}</Text>
                    <Text style={[g.text.caption, {marginTop:6}]}>Tipos permitidos: {allowedText}</Text>
                </View>
            ) : (
                <Text style={[g.text.body, {marginTop: 8}]}>
                    Adjunta tu evidencia/archivo para completar el reto. Tipos permitidos: {allowedText}.
                </Text>
            )}

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

            {/* Selector de área/tipo: SOLO para carpeta (mantenimiento / supervisión) */}
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
