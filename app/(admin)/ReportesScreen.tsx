import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, SectionList,
    Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';

import FadeWrapper from '../../components/admin/FadeWrapper';
import HeaderOperario from '../../components/admin/HeaderOperario';

import {useTheme} from '../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../theme/GlobalStyles';
import {useAuth} from '../../auth/AuthContext';
import {API, uploadToSignedUrl, BASE_URL} from '../../config/api';

type Area = 'mantenimiento' | 'supervision' | null;

type FileItem = {
    key: string;
    name: string;
    size?: number;
    lastModified?: string;
    area?: Area;
};

const FOOTER_HEIGHT = 56;

export default function ReportesScreen() {
    const {colors} = useTheme();
    const g = useMemo(() => makeGlobalStyles(colors), [colors]);
    const c = {
        bg: colors.bg,
        card: colors.card,
        section: colors.cardTint,
        text: colors.text,
        soft: colors.mutedText,
        border: colors.tabBorder,
        pill: colors.mutedBg,
        searchBg: colors.card,
        searchBorder: colors.inputBorder,
        sectionAccent: colors.primarySoft,
        danger: colors.danger ?? '#EF4444',
        primary: colors.primary,
    };

    const {fetchJson, user} = useAuth();
    const codUsuario =
        (user as any)?.codUsuario ??
        (user as any)?.id ??
        (user as any)?.usuario?.id ??
        1; // fallback

    // Estado UI
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Selector de tipo para subir
    const [selectedTipo, setSelectedTipo] = useState<Area>(null);

    // Archivos (desde BD)
    const [files, setFiles] = useState<FileItem[]>([]);

    // -- Helpers de mapeo (rows BD -> FileItem)
    function mapRowToItem(row: any): FileItem {
        const key = row.keyPath ?? row.rutaArchivo ?? '';
        const name = (row.nombreOriginal ?? '').toString() || (key.split('/').pop() ?? key);
        const sizeNum =
            typeof row.tamanoBytes === 'string' ? Number(row.tamanoBytes) :
                typeof row.tamanoBytes === 'number' ? row.tamanoBytes : undefined;
        const when = row.fechaActualizacion ?? row.fechaCreacion ?? null;

        const rawArea: string | null | undefined = row.area ?? null;
        const inferred: Area =
            key.includes('/mantenimiento/') ? 'mantenimiento' :
                key.includes('/supervision/') ? 'supervision' :
                    null;

        const area: Area =
            rawArea === 'mantenimiento' || rawArea === 'supervision'
                ? (rawArea as Area)
                : inferred;

        return {key, name, size: sizeNum, lastModified: when || undefined, area};
    }

    // ---- Cargar lista desde /uploads/list (BD)
    const loadFiles = useCallback(async () => {
        const take = 100, skip = 0;
        const r = await fetchJson<{total: number; rows: any[]}>(`/uploads/list`);
        const items = (r?.rows ?? []).map(mapRowToItem).filter(x => !!x.key);
        return items;
    }, [fetchJson, codUsuario]);

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const items = await loadFiles();
            setFiles(items);
        } catch (e: any) {
            Alert.alert('Archivos', e?.message ?? 'No se pudieron cargar los archivos.');
        } finally {
            setLoading(false);
        }
    }, [loadFiles]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await cargar();
        } finally {
            setRefreshing(false);
        }
    }, [cargar]);

    // ---- Subir archivo (presign + PUT a MinIO + complete)
    const pickAndUpload = useCallback(async () => {
        const res = await DocumentPicker.getDocumentAsync({copyToCacheDirectory: true});
        if (res.canceled || !res.assets?.length) return;

        const doc = res.assets[0];
        const filename = doc.name ?? 'archivo';
        const contentType = doc.mimeType ?? 'application/octet-stream';

        try {
            // 1) presign (JWT via fetchJson) — pasamos "selectedTipo" si está elegido
            const presign = await fetchJson<{ signedUrl: string; objectKey?: string; key?: string }>(
                API.uploads.presign(filename, contentType, codUsuario, selectedTipo ?? undefined)
            );
            const objectKey = presign.key ?? presign.objectKey;
            if (!presign.signedUrl || !objectKey) throw new Error('Presign inválido');

            // Evita localhost en móvil
            if (/^http:\/\/localhost:9000/i.test(presign.signedUrl)) {
                Alert.alert('Configuración',
                    `El signedUrl apunta a localhost.\nCambia S3_ENDPOINT a la IP LAN de tu PC (igual que ${BASE_URL}).`);
                return;
            }

            // 2) leer file y subir por PUT directo a MinIO (sin bearer)
            const fileRes = await fetch(doc.uri);
            const blob = await fileRes.blob();

            await uploadToSignedUrl(presign.signedUrl, blob, contentType);

            // 3) registrar metadatos en BD (enviamos "tipo" si el usuario lo eligió)
            await fetchJson(API.uploads.complete, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    key: objectKey,
                    filename,
                    contentType,
                    size: (blob as any).size ?? 0,
                    codUsuario,
                    tipo: selectedTipo ?? undefined,
                }),
            });

            Alert.alert('Subido', objectKey);
            onRefresh();
        } catch (e: any) {
            Alert.alert('Subida', e?.message ?? 'No se pudo subir el archivo.');
        }
    }, [fetchJson, codUsuario, onRefresh, selectedTipo]);

    // ---- Descargar (URL ABSOLUTA a tu API /uploads/download-presign)
    const onDownload = useCallback(async (key: string, filenameHint?: string) => {
        try {
            // 1) pide URL firmada
            const { url } = await fetchJson<{ url: string; expiresIn: number }>(
                `/uploads/download-presign?key=${encodeURIComponent(key)}`
            );

            // 2) ABRE URL ABSOLUTA (usa BASE_URL donde ya apuntas a tu backend accesible por el teléfono)
            const abs = url.startsWith('http') ? url : `${BASE_URL.replace(/\/+$/,'')}/${url.replace(/^\/+/,'')}`;
            await Linking.openURL(abs);
        } catch (e: any) {
            Alert.alert('Descarga', e?.message ?? 'No se pudo descargar.');
        }
    }, []);


    // ---- Borrar
    const onDelete = useCallback((key: string) => {
        Alert.alert('Eliminar', `¿Borrar este archivo?\n${key}`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await fetchJson(`/uploads?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
                        setFiles(prev => prev.filter(x => x.key !== key));
                    } catch (e: any) {
                        Alert.alert('Eliminar', e?.message ?? 'No se pudo eliminar.');
                    }
                }
            }
        ]);
    }, [fetchJson]);

    // Agrupar por área y aplicar búsqueda
    const secciones = useMemo(() => {
        const q = query.trim().toLowerCase();
        const base = q
            ? files.filter(f =>
                (f.name || '').toLowerCase().includes(q) ||
                (f.key || '').toLowerCase().includes(q)
            )
            : files;

        const mantenimiento = base.filter(f => f.area === 'mantenimiento');
        const supervision = base.filter(f => f.area === 'supervision');
        const otros = base.filter(f => !f.area);

        const sections: Array<{ title: string; data: FileItem[] }> = [
            {title: `Mantenimiento (${mantenimiento.length})`, data: mantenimiento},
            {title: `Supervisión (${supervision.length})`, data: supervision},
        ];
        if (otros.length) sections.push({title: `Sin área (${otros.length})`, data: otros});

        return sections;
    }, [files, query]);

    // UI helpers
    function pickIconFromKey(key: string) {
        const ext = (key.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') return {label: 'PDF', bg: '#e74c3c'};
        if (['xls', 'xlsx', 'csv'].includes(ext)) return {label: 'XLS', bg: '#27ae60'};
        if (['doc', 'docx'].includes(ext)) return {label: 'DOC', bg: '#2980b9'};
        if (['ppt', 'pptx'].includes(ext)) return {label: 'PPT', bg: '#e67e22'};
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic'].includes(ext)) return {label: 'IMG', bg: '#8e44ad'};
        return {label: 'FILE', bg: '#7f8c8d'};
    }

    const Row = ({f}: { f: FileItem }) => {
        const {label, bg} = pickIconFromKey(f.key);
        const when = f.lastModified ? new Date(f.lastModified) : null;
        return (
            <View style={[styles.row, {backgroundColor: c.card, borderColor: c.border}]}>
                <View style={[styles.icon, {backgroundColor: bg}]}>
                    <Text style={styles.iconTxt}>{label}</Text>
                </View>

                <View style={{flex: 1}}>
                    <Text style={[styles.rowTitle, {color: c.text}]} numberOfLines={1}>
                        {f.name || f.key.split('/').slice(-1)[0]}
                    </Text>
                    <Text style={[styles.rowSub, {color: c.soft}]} numberOfLines={1}>
                        {when ? when.toLocaleString() : '—'} · {(f.size ?? 0) > 0 ? `${((f.size ?? 0) / 1024).toFixed(1)} KB` : ''}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.pill, {backgroundColor: c.pill}]}
                    onPress={() => onDownload(f.key)}
                    activeOpacity={0.9}
                >
                    <Ionicons name="download-outline" size={16} color={c.text}/>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.pill, {backgroundColor: c.danger}]}
                    onPress={() => onDelete(f.key)}
                    activeOpacity={0.9}
                >
                    <Ionicons name="trash" size={16} color="#fff"/>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <FadeWrapper>
                <SafeAreaView
                    style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg}}>
                    <ActivityIndicator/>
                    <Text style={{marginTop: 8, color: colors.text}}>Cargando archivos…</Text>
                </SafeAreaView>
            </FadeWrapper>
        );
    }

    const TipoPill = ({value, label}: { value: Area; label: string }) => {
        const active = selectedTipo === value;
        return (
            <TouchableOpacity
                onPress={() => setSelectedTipo(prev => (prev === value ? null : value))}
                style={[
                    styles.tipoPill,
                    {borderColor: c.border, backgroundColor: active ? c.primary : c.pill}
                ]}
                activeOpacity={0.9}
            >
                <Text style={{color: active ? '#fff' : c.text, fontWeight: '700'}}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <FadeWrapper>
            <View style={[styles.container, {backgroundColor: c.bg}]}>
                <Text style={[g.text.h1, {color: c.text, marginTop: 50, marginBottom:10, textAlign: "center"}]}>Reportes</Text>

                {/* Buscador */}
                <View style={[styles.searchWrap, {backgroundColor: c.searchBg, borderColor: c.searchBorder}]}>
                    <Ionicons name="search" size={16} color={c.soft} style={{marginHorizontal: 6}}/>
                    <TextInput
                        style={[styles.searchInput, {color: c.text}]}
                        placeholder="Buscar por nombre"
                        placeholderTextColor={c.soft}
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                </View>

                <View style={{height: 10}}/>

                <SectionList
                    sections={secciones}
                    keyExtractor={(item) => item.key}
                    renderSectionHeader={({section}) => (
                        <Text style={{color: c.text, fontWeight: '800', marginTop: 12, marginBottom: 6}}>
                            {section.title}
                        </Text>
                    )}
                    renderItem={({item}) => (
                        <View style={styles.rowWrap}>
                            <Row f={item}/>
                        </View>
                    )}
                    contentContainerStyle={{paddingBottom: FOOTER_HEIGHT}}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={{color: c.soft, textAlign: 'center', marginTop: 10}}>
                            No hay archivos aún. Sube tu primer reporte.
                        </Text>
                    }
                />
            </View>
        </FadeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, paddingHorizontal: 14, paddingTop: 8},
    pageTitle: {fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1, marginBottom: 8},

    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },

    tipoPill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },

    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
    },
    searchInput: {flex: 1, paddingVertical: 4},

    rowWrap: {marginBottom: 8},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
    icon: {width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    iconTxt: {color: '#fff', fontWeight: '800', fontSize: 12},

    rowTitle: {fontWeight: '700'},
    rowSub: {fontSize: 12},

    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginHorizontal: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    },
});
