import { View, TextInput, Button, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

type FormVals = { email: string; password: string };

export default function LoginScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm<FormVals>();
    const navigation: any = useNavigation();
    const { login, loading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (data: FormVals) => {
        try {
            setSubmitting(true);
            setError(null);
            await login(data.email, data.password);
            navigation.reset({
                index: 0,
                routes: [{ name: 'OperarioTabs' }], // deja tu stack/tabs como lo tengas
            });
        } catch (e: any) {
            // Log para ti (dev)
            console.log('[Login] fallo', e?.status, e?.message, e?.body);

            // Mensaje para el usuario
            if (e?.status === 401) setError('Correo o contraseña inválidos');
            else if (e?.status === 400) setError('Datos inválidos. Revisa el formulario.');
            else if (e?.status === 429) setError('Demasiados intentos. Intenta en un momento.');
            else setError('No pudimos iniciar sesión. Intenta más tarde.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Iniciar Sesión</Text>

            <Controller
                control={control}
                name="email"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        placeholder="Correo electrónico"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {errors.email && <Text style={styles.error}>El correo es requerido</Text>}

            <Controller
                control={control}
                name="password"
                rules={{ required: true, minLength: 8 }}
                render={({ field: { onChange, value } }) => (
                    <TextInput
                        placeholder="Contraseña"
                        style={styles.input}
                        secureTextEntry
                        onChangeText={onChange}
                        value={value}
                    />
                )}
            />
            {errors.password && <Text style={styles.error}>La contraseña es requerida (mín. 8)</Text>}

            {error && <Text style={[styles.error, {marginTop: 8}]}>{error}</Text>}

            <Button title={submitting ? 'Entrando...' : 'Entrar'} onPress={handleSubmit(onSubmit)} disabled={submitting || loading} />

            {(submitting || loading) && (
                <View style={{marginTop: 16}}>
                    <ActivityIndicator />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, marginBottom: 20 },
    input: { borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 6 },
    error: { color: 'red' },
});
