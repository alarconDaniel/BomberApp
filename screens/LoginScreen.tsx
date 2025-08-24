import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../styles/globalStyles1';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Correo inválido', 'Escribe un correo válido.');
      return;
    }
    if (pass.length < 4) {
      Alert.alert('Contraseña', 'Mínimo 4 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), pass);
      // si llega aquí, el StackNavigator te manda a OperarioTabs (porque user ya existe)
    } catch (e: any) {
      Alert.alert('Inicio de sesión', String(e?.message || 'Fallo al conectar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <TextInput style={styles.input} placeholder="Correo" autoCapitalize="none"
                 keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" value={pass}
                 onChangeText={setPass} secureTextEntry />
      <Button title={loading ? 'Conectando…' : 'Ingresar'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.navy },
  input: { borderWidth: 1, borderColor: colors.gray300, borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 10 }
});
