// app/_layout.tsx
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { ToastProvider } from '../components/ToastProvider'; // déjalo, no debe romper nada

function AuthGate() {
    const router = useRouter();
    const segments = useSegments();            // p.ej. ['(auth)','login'] | ['(operario)','HomeScreen']
    const navState = useRootNavigationState(); // listo cuando tiene key
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading || !navState?.key) return;   // espera a tener auth y nav listos
        const group = segments?.[0];

        // Sin sesión => manda siempre a login si no estás en (auth)
        if (!user) {
            if (group !== '(auth)') router.replace('/(auth)/login');
            return;
        }

        // Con sesión => asegúrate de caer en el grupo correcto
        if (user.rol === 'operario' && group !== '(operario)') {
            router.replace('/(operario)/HomeScreen');
            return;
        }
        if (user.rol === 'admin' && group !== '(admin)') {
            router.replace('/(admin)');
            return;
        }
        // si ya estás en el grupo correcto, no hacemos nada
    }, [user, loading, navState?.key, segments]);

    return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <ToastProvider>
                <AuthGate />
            </ToastProvider>
        </AuthProvider>
    );
}
