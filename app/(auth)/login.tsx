// app/(auth)/login.tsx
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

type FormVals = { email: string; password: string };

export default function Login() {
    const { colors, isDark } = useTheme();
    const { text } = useMemo(() => makeGlobalStyles(colors), [colors]);

    const { control, handleSubmit, formState: { errors } } = useForm<FormVals>();
    const { login, loading } = useAuth(); // loading = cargando tokens iniciales

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);

    // Importante: aquí NADA es array. Solo objetos planos.
    const s = useMemo(() => StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

        card: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.divider,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 3,
        },

        // “pads” que se combinan con tipografías en el JSX
        titlePad: { textAlign: 'center', marginBottom: 6 },
        subtitlePad: { textAlign: 'center', marginBottom: 16 },
        labelPad: { marginTop: 10, marginBottom: 6 },

        inputWrap: { position: 'relative' },
        input: {
            borderWidth: 1,
            borderColor: colors.inputBorder,
            backgroundColor: colors.card,
            color: colors.text,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 10,
            fontSize: 16,
        },
        eyeBtn: {
            position: 'absolute',
            right: 10,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            paddingHorizontal: 6,
        },

        // bases que luego combinamos con variantes tipográficas
        errorTextBase: { marginTop: 6, color: colors.danger },
        hintBase: { textAlign: 'center', marginTop: 12 },

        errorBox: {
            backgroundColor: colors.dangerSoft ?? 'rgba(239,68,68,0.12)',
            borderColor: colors.danger,
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 10,
        },
        errorBoxTxt: { color: colors.danger, fontWeight: '800' },

        primaryBtn: {
            marginTop: 14,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
        },
        primaryBtnDisabled: { opacity: 0.85 },
        primaryTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },

        footer: { alignItems: 'center', marginTop: 18 },

        brand: { marginTop: 24, alignItems: 'center' },
        brandBadge: {
            backgroundColor: isDark ? colors.brandBlueSoft : colors.brandBlueSoft,
            borderWidth: 2,
            borderColor: colors.brandBlueBorder,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
    }), [colors, isDark]);

    const onSubmit = async (data: FormVals) => {
        try {
            setSubmitting(true);
            setError(null);
            await login(data.email, data.password);
            // AuthGate en app/_layout.tsx hará el replace según rol.
        } catch (e: any) {
            console.log('[Login] fallo', e?.status, e?.message, e?.body);
            if (e?.status === 401) setError('Correo o contraseña inválidos');
            else if (e?.status === 400) setError('Datos inválidos. Revisa el formulario.');
            else if (e?.status === 429) setError('Demasiados intentos. Intenta en un momento.');
            else setError('No pudimos iniciar sesión. Intenta más tarde.');
        } finally {
            setSubmitting(false);
        }
    };

    const disabled = submitting || loading;

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: 'padding', android: undefined })}
            >
                <View style={s.container}>
                    <View style={s.card}>
                        {/* 👇 Composición de estilos en el JSX, NO en create() */}
                        <Text style={[text.h1, s.titlePad]}>Iniciar sesión</Text>
                        <Text style={[text.caption, text.secondary, s.subtitlePad]}>Bienvenido de vuelta 👋</Text>

                        {/* Email */}
                        <Text style={[text.bodyStrong, s.labelPad]}>Correo</Text>
                        <Controller
                            control={control}
                            name="email"
                            rules={{ required: true }}
                            render={({ field: { onChange, value = '' } }) => (
                                <TextInput
                                    placeholder="tu@correo.com"
                                    placeholderTextColor={colors.mutedText}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    style={s.input}
                                    onChangeText={onChange}
                                    value={value}
                                    returnKeyType="next"
                                />
                            )}
                        />
                        {errors.email && (
                            <Text style={[text.captionStrong, s.errorTextBase]}>El correo es requerido</Text>
                        )}

                        {/* Password */}
                        <Text style={[text.bodyStrong, s.labelPad]}>Contraseña</Text>
                        <View style={s.inputWrap}>
                            <Controller
                                control={control}
                                name="password"
                                rules={{ required: true, minLength: 8 }}
                                render={({ field: { onChange, value = '' } }) => (
                                    <TextInput
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.mutedText}
                                        style={s.input}
                                        secureTextEntry={!showPw}
                                        onChangeText={onChange}
                                        value={value}
                                        returnKeyType="done"
                                        onSubmitEditing={handleSubmit(onSubmit)}
                                    />
                                )}
                            />
                            <Pressable onPress={() => setShowPw(p => !p)} hitSlop={10} style={s.eyeBtn}>
                                <FontAwesome5 name={showPw ? 'eye-slash' : 'eye'} size={16} color={colors.mutedText} />
                            </Pressable>
                        </View>
                        {errors.password && (
                            <Text style={[text.captionStrong, s.errorTextBase]}>
                                La contraseña es requerida (mín. 8)
                            </Text>
                        )}

                        {/* Error de login */}
                        {error && (
                            <View style={s.errorBox}>
                                <Text style={s.errorBoxTxt}>{error}</Text>
                            </View>
                        )}

                        {/* Botón primario */}
                        <Pressable
                            style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={disabled}
                        >
                            {disabled
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={s.primaryTxt}>Entrar</Text>}
                        </Pressable>

                        <View style={s.footer}>
                            <Text style={[text.caption, s.hintBase]}>
                                ¿Olvidaste tu contraseña? Contacta a un admin.
                            </Text>
                        </View>
                    </View>

                    {/* Marca */}
                    <View style={s.brand}>
                        <View style={s.brandBadge}>
                            <FontAwesome5 name="flag" size={14} color={colors.primary} />
                            <Text style={text.smallStrong}>Gruas y Equipos</Text>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
