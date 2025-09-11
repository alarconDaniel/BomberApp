// app/(modals)/admin/operario-form.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
    SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';

import { useAuth } from '../../../auth/AuthContext';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useMarkModalOnClose } from '../../../navigation/useMarkModalOnClose';
import { markModalClosed } from '../../../navigation/ModalTracker';

type Mode = 'create' | 'edit';

type UsuarioDTO = {
    codUsuario: number;
    codRol: number;
    codCargoUsuario: number | null;
    nombreUsuario: string;
    apellidoUsuario: string;
    nicknameUsuario: string | null;
    correoUsuario: string;
    cedulaUsuario: string;
    tokenVersion: number;
};

const ROLES = [
    { label: 'Administrador', value: 1 },
    { label: 'Operario', value: 2 },
] as const;

function useKeyboardHeight() {
    const [h, setH] = useState(0);
    useEffect(() => {
        const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const s1 = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates?.height ?? 0));
        const s2 = Keyboard.addListener(hideEvt, () => setH(0));
        return () => { s1.remove(); s2.remove(); };
    }, []);
    return h;
}

function hasAdminRole(u: any): boolean {
    if (!u) return false;
    const flat = [u?.rol, u?.role, u?.rolId, u?.roleId, u?.codRol, u?.idRol, u?.nombreRol]
        .filter(v => v !== undefined && v !== null);
    for (const v of flat) {
        const s = String(v).toLowerCase().trim();
        if (s === '1' || s === 'admin' || s === 'administrador') return true;
        if (!Number.isNaN(Number(s)) && Number(s) === 1) return true;
    }
    const rname = u?.rol?.name ?? u?.rol?.nombre ?? u?.role?.name ?? u?.role?.nombre;
    if (rname && ['admin', 'administrador'].includes(String(rname).toLowerCase())) return true;
    const rid = u?.rol?.id ?? u?.role?.id;
    return rid === 1 || String(rid) === '1';
}

export default function OperarioFormModal() {
    useMarkModalOnClose();
    const router = useRouter();
    const { mode: modeParam, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
    const mode: Mode = modeParam === 'edit' ? 'edit' : 'create';
    const editingId = id ? Number(id) : undefined;

    const insets = useSafeAreaInsets();
    const kbHeight = useKeyboardHeight();
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const { user, loading: authLoading, fetchJson } = useAuth();
    const isAdmin = useMemo(() => hasAdminRole(user), [user]);

    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [nickname, setNickname] = useState<string>('');
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [cedula, setCedula] = useState('');
    const [codRol, setCodRol] = useState<number>(ROLES[1].value);
    const [loading, setLoading] = useState(false);

    const title = useMemo(() => (mode === 'create' ? 'Crear usuario' : 'Editar usuario'), [mode]);

    useEffect(() => {
        if (mode === 'create') {
            setNombre(''); setApellido(''); setNickname('');
            setCorreo(''); setContrasena(''); setCedula('');
            setCodRol(ROLES[1].value);
        }
    }, [mode]);

    useEffect(() => {
        if (mode !== 'edit' || !editingId) return;
        (async () => {
            try {
                setLoading(true);
                const u = await fetchJson<UsuarioDTO>(`/usuario/${editingId}`);
                setNombre(u?.nombreUsuario ?? '');
                setApellido(u?.apellidoUsuario ?? '');
                setNickname(u?.nicknameUsuario ?? '');
                setCorreo(u?.correoUsuario ?? '');
                setCedula(u?.cedulaUsuario ?? '');
                setCodRol(u?.codRol ?? ROLES[1].value);
                setContrasena('');
            } catch (e: any) {
                Alert.alert('Error','No se pudo cargar el usuario');
            } finally {
                setLoading(false);
            }
        })();
    }, [mode, editingId, fetchJson]);

    const validar = () => {
        if (mode === 'create' && !codRol) {
            Alert.alert('Falta rol', 'Selecciona un rol');
            return false;
        }
        if (!nombre.trim() || !apellido.trim() || !correo.trim() || !cedula.trim()) {
            Alert.alert('Datos incompletos', 'Completa nombre, apellido, correo y cédula.');
            return false;
        }
        if (mode === 'create' && !contrasena.trim()) {
            Alert.alert('Contraseña requerida', 'Ingresa una contraseña para crear el usuario.');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(correo)) {
            Alert.alert('Correo inválido', 'Verifica el formato del correo.');
            return false;
        }
        if (cedula.length > 45) {
            Alert.alert('Cédula muy larga', 'Máximo 45 caracteres.');
            return false;
        }
        return true;
    };

    const onSubmit = async () => {
        if (!validar()) return;

        const isCreate = mode === 'create';
        const body = isCreate
            ? {
                codRol,
                nombreUsuario: nombre.trim(),
                apellidoUsuario: apellido.trim(),
                nicknameUsuario: nickname.trim() ? nickname.trim() : null,
                correoUsuario: correo.trim().toLowerCase(),
                contrasenaUsuario: contrasena.trim(),
                cedulaUsuario: cedula.trim(),
            }
            : {
                codUsuario: Number(editingId),
                nombreUsuario: nombre.trim(),
                apellidoUsuario: apellido.trim(),
                nicknameUsuario: nickname.trim() ? nickname.trim() : null,
                correoUsuario: correo.trim().toLowerCase(),
                cedulaUsuario: cedula.trim(),
                ...(contrasena.trim() ? { contrasenaUsuario: contrasena.trim() } : {}),
            };

        try {
            setLoading(true);
            const url = isCreate ? '/usuario/crear' : '/usuario/modificar';
            const method = isCreate ? 'POST' : 'PUT';

            await fetchJson(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            Alert.alert('Éxito', isCreate ? 'Usuario creado' : 'Usuario actualizado', [
                { text: 'OK', onPress: () => { markModalClosed(); router.back(); } },
            ]);
        } catch (e: any) {
            const msg = '';
            if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
                Alert.alert('Sesión expirada', 'Vuelve a iniciar sesión.');
            } else if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
                Alert.alert('Sin permisos', 'No tienes permisos para esta operación.');
            } else if (msg.includes('Correo ya registrado') || msg.includes('duplicate') || msg.includes('1062')) {
                Alert.alert('Duplicado', 'El correo ya está registrado.');
            } else if (msg.includes('Rol/Cargo inválido') || msg.includes('1452')) {
                Alert.alert('Dato inválido', 'El rol o cargo no existe (violación de FK).');
            } else if (msg.toLowerCase().includes('codrol') || msg.toLowerCase().includes('rol')) {
                Alert.alert('Rol requerido', 'Selecciona un rol válido.');
            } else {
                Alert.alert('Error', msg || 'No se pudo guardar');
            }
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[g.text.caption, { marginTop: 10, color: colors.text }]}>Verificando sesión…</Text>
            </SafeAreaView>
        );
    }

    if (!isAdmin) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <Text style={[g.text.h3, { marginBottom: 8 }]}>403 · Sin permisos</Text>
                <Text style={[g.text.body, { textAlign: 'center', color: colors.mutedText }]}>
                    Esta acción requiere rol administrador.
                </Text>
                <Pressable
                    onPress={() => { markModalClosed(); router.back(); }}
                    style={[{ marginTop: 18, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999, backgroundColor: colors.primary }]}
                >
                    <Text style={[g.text.smallStrong, { color: '#fff' }]}>Volver</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const s = useMemo(
        () =>
            StyleSheet.create({
                safe: { flex: 1, backgroundColor: colors.bg },
                headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' },
                backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderRadius: 10 },
                content: { flexGrow: 1, paddingHorizontal: 24 },
                title: { textAlign: 'center', marginTop: 8, color: colors.text },
                label: { marginTop: 14, color: colors.text },
                input: {
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: colors.card,
                    color: colors.text,
                },
                card: {
                    marginTop: 16,
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.divider,
                    width: '100%' as any,
                },
                chipsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
                chip: {
                    paddingHorizontal: 12, height: 34, borderRadius: 999, borderWidth: 1,
                    backgroundColor: colors.mutedBg, justifyContent: 'center', borderColor: colors.inputBorder
                },
                chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
                chipTxt: { color: colors.text, fontWeight: '700' },
                chipTxtActive: { color: '#fff' },
                primaryBtn: {
                    marginTop: 18, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: colors.primary,
                },
                primaryTxt: { color: '#fff', fontWeight: '800' },
                ro: { opacity: 0.9, color: colors.text }
            }),
        [colors]
    );

    return (
        <SafeAreaView style={s.safe}>
            {/* Header del modal */}
            <View style={s.headerRow}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={[g.text.body]}>Volver</Text>
                </Pressable>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[g.text.caption, { marginTop: 10 }]}>Cargando…</Text>
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.select({ ios: 'padding', android: undefined })}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={[
                            s.content,
                            { paddingBottom: insets.bottom + (kbHeight > 0 ? kbHeight + 24 : 32) },
                        ]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        bounces={false}
                        overScrollMode="never"
                    >
                        <Text style={[g.text.h2, s.title]}>{title}</Text>

                        <View style={s.card}>
                            {/* Rol */}
                            <Text style={[g.text.bodyStrong, s.label]}>Rol</Text>
                            <View style={s.chipsRow}>
                                {ROLES.map(r => {
                                    const active = codRol === r.value;
                                    return (
                                        <Pressable
                                            key={r.value}
                                            onPress={() => mode === 'create' && setCodRol(r.value)}
                                            style={[s.chip, active && s.chipActive, mode !== 'create' && { opacity: 0.6 }]}
                                            disabled={mode !== 'create'}
                                        >
                                            <Text style={[s.chipTxt, active && s.chipTxtActive]}>{r.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Nombres / Apellidos */}
                            <Text style={[g.text.bodyStrong, s.label]}>Nombres</Text>
                            <TextInput
                                style={s.input}
                                value={nombre}
                                onChangeText={setNombre}
                                placeholder="Juan Carlos"
                                placeholderTextColor={colors.mutedText}
                                autoCapitalize="words"
                            />

                            <Text style={[g.text.bodyStrong, s.label]}>Apellidos</Text>
                            <TextInput
                                style={s.input}
                                value={apellido}
                                onChangeText={setApellido}
                                placeholder="Pérez García"
                                placeholderTextColor={colors.mutedText}
                                autoCapitalize="words"
                            />

                            {/* Nickname */}
                            <Text style={[g.text.bodyStrong, s.label]}>Nickname (opcional)</Text>
                            <TextInput
                                style={s.input}
                                value={nickname}
                                onChangeText={setNickname}
                                placeholder="jperez"
                                placeholderTextColor={colors.mutedText}
                                autoCapitalize="none"
                            />

                            {/* Correo */}
                            <Text style={[g.text.bodyStrong, s.label]}>Correo</Text>
                            <TextInput
                                style={s.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={correo}
                                onChangeText={setCorreo}
                                placeholder="nombre@empresa.com"
                                placeholderTextColor={colors.mutedText}
                                autoComplete="email"
                            />

                            {/* Contraseña */}
                            <Text style={[g.text.bodyStrong, s.label]}>
                                Contraseña {mode === 'edit' ? '(deja vacío si no cambias)' : ''}
                            </Text>
                            <TextInput
                                style={s.input}
                                secureTextEntry
                                value={contrasena}
                                onChangeText={setContrasena}
                                placeholder={mode === 'edit' ? '••••••••' : 'Mínimo 8 caracteres'}
                                placeholderTextColor={colors.mutedText}
                                autoComplete="password-new"
                            />

                            {/* Cédula */}
                            <Text style={[g.text.bodyStrong, s.label]}>Cédula</Text>
                            <TextInput
                                style={s.input}
                                value={cedula}
                                onChangeText={setCedula}
                                placeholder="12345678"
                                placeholderTextColor={colors.mutedText}
                                keyboardType="numeric"
                            />

                            {/* Botón */}
                            <Pressable
                                disabled={loading}
                                onPress={onSubmit}
                                style={[s.primaryBtn, loading && { opacity: 0.7 }]}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={s.primaryTxt}>{mode === 'create' ? 'Crear' : 'Guardar'}</Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
