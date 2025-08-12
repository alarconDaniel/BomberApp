
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import {useNavigation} from "@react-navigation/native";

export default function LoginScreen() {
    const { control, handleSubmit, formState: { errors } } = useForm();

    const navigation : any = useNavigation();

    const onSubmit = (data: any) => {
        console.log('Login exitoso:', data);
        navigation.navigate('OperarioTabs');
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
                rules={{ required: true }}
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
            {errors.password && <Text style={styles.error}>La contraseña es requerida</Text>}

            <Button title="Entrar" onPress={handleSubmit(onSubmit)}/>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, marginBottom: 20 },
    input: { borderWidth: 1, padding: 10, marginBottom: 12, borderRadius: 6 },
    error: { color: 'red', marginBottom: 10 },
});
