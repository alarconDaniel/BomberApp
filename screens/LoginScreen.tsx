import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/StackNavigator';
import { colors } from '../styles/globalStyles1';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const onSubmit = () => {
    // validar credenciales aquí…
    navigation.replace('OperarioTabs');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Login</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" value={pass} onChangeText={setPass} secureTextEntry />
      <Button title="Iniciar" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: colors.white },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12, color: colors.navy },
  input: { borderWidth: 1, borderColor: colors.gray300, borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 10 },
});
